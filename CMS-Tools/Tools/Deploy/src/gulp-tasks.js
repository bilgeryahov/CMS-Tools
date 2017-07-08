/**
 * @file gulp-tasks.js
 *
 * Contains all the gulp tasks, which will be used
 * when deploying a project, created with the CMS, built
 * by Bilger Yahov.
 *
 * This file will be located in node_modules folder of the
 * project. In order to use it, one needs to call
 *
 * `require(@bilgeryahov/deploy/src/gulp-tasks)(config, pages);`
 *
 * This call needs to be executed from the gulpfile of the
 * particular CMS project in which those tasks will be used.
 *
 * @author Bilger Yahov <bayahov1@gmail.com>
 * @version 1.0.0
 * @copyright © 2017 Bilger Yahov, all rights reserved.
 */

'use strict';

/**
 * Exports the gulp tasks.
 *
 * One can see that the tasks use relative paths. This is
 * because those gulp tasks are created to serve indeed
 * a special kind of projects, which implement the same
 * architecture and infrastructure (Projects,
 * which are built using the CMS, created by the author
 * of this file).
 *
 * Needs a config object, which
 * contains configuration information of the CMS project,
 * which will be using the gulp tasks. The config
 * object needs to hold important Firebase configurations.
 *
 * Needs a pages object, which will hold
 * all the pages and their modules. Those
 * are used for constructing the pages on
 * deploy.
 *
 * Note that the current deploy procedure simply
 * copies all the content of App directory into
 * Deploy directory and then does the processing
 * on the files, located inside Deploy folder.
 *
 * @param config
 * @param pages
 *
 * @return void
 */

module.exports = function (config, pages) {

    // All the development dependencies needed.
    const gulp  = require('gulp');
    const sass  = require('gulp-sass');
    const babel = require('gulp-babel');
    const runSequence = require('run-sequence');
    const clean  = require('gulp-clean');
    const replace = require('gulp-replace');
    const exec = require('child_process').exec;
    const stringifyObject = require('stringify-object');
    const inject = require('gulp-inject');

    // Clean the folder for a fresh deploy.
    gulp.task('clean_content', function(){

        return gulp.src('./Deploy/', {read : false})
            .pipe(clean());
    });

    // Copy static files to the folder which will be publicly available.
    gulp.task('copy_content', function(){

        return gulp.src(['./App/**'])
            .pipe(gulp.dest('./Deploy/'));
    });

    // Clean up all files, different from JS, HTML, CSS. (After deploy)
    gulp.task('clean_up', function () {

       return gulp.src(['./Deploy/**/!(*.html|*.css,|*.js)'], {read : false, nodir : true})
           .pipe(clean());
    });

    // Compile JS ES6 to JS ES5.
    gulp.task('compile_javascript',  function(){

        // Make sure to take everything from the modules.
        // Make sure to take only the EcmaScript 6 files, without Vendor folder.
        const paths = [
            './Deploy/CMS-Modules/CMS-Modules/Modules/**/*.js',
            './Deploy/CMS-Framework/CMS-Framework/JavaScript/*.js'
        ];

        return gulp.src(paths, {base: './'})
            .pipe(babel())
            .pipe(gulp.dest('./'));
    });

    // Compile SCSS to CSS.
    gulp.task('compile_css', function(){

        // Make sure to take everything from the modules.
        // Make sure to take only the scss stylesheets, without Vendor folder.
        const paths = [
            './Deploy/CMS-Modules/CMS-Modules/**/*.scss',
            './Deploy/StyleSheets/*.scss'
        ];

        return gulp.src(paths, {base: './'})
            .pipe(sass().on('error', sass.logError))
            .pipe(gulp.dest('./'));
    });

    // Set the correct keys for development environment.
    gulp.task('set_development_environment', function () {

        return gulp.src('./Deploy/CMS-Framework/CMS-Framework/JavaScript/EnvironmentHelper.js', { base : './' })
            .pipe(replace(config.firebase.placeholder,
                stringifyObject(
                    config.firebase.development,
                    {singleQuotes: true})
                )
            )
            .pipe(gulp.dest('./'));
    });

    // Set the correct keys for production environment.
    gulp.task('set_production_environment', function () {

        return gulp.src('./Deploy/CMS-Framework/CMS-Framework/JavaScript/EnvironmentHelper.js', { base : './' })
            .pipe(replace(config.firebase.placeholder,
                stringifyObject(
                    config.firebase.production,
                    {singleQuotes: true})
                )
            )
            .pipe(gulp.dest('./'));
    });

    // Deploy development.
    gulp.task('d_dev', function(){

        return runSequence('check_rights_development');
    });

    // Deploy production.
    gulp.task('d_prd', function(){

        return runSequence('check_rights_production');
    });

    gulp.task('check_rights_production', function () {

        return exec('firebase list --interactive', function (err, stdout, stderr) {

            if(err){

                console.error(err);
                return;
            }

            console.log(stdout);
            console.log(stderr);

            // Small check to make sure that the output
            // contains actual projects.
            if(!stdout.includes('Project ID / Instance')){

                console.log('Unexpected output');
                return;
            }

            // Make sure that the profile is for production projects.
            if(stdout.includes('Production-Project')){

                console.log('You are allowed to deploy on production.');
                return runSequence('clean_content', 'copy_content', 'construct_pages', 'compile_css', 'compile_javascript',
                    'set_production_environment', 'clean_up');
            }

            // There is no production project(s), not the correct profile.
            console.log('You are not allowed to deploy on production.');
        });
    });

    gulp.task('check_rights_development', function () {

        return exec('firebase list --interactive', function (err, stdout, stderr) {

            if(err){

                console.error(err);
                return;
            }

            console.log(stdout);
            console.log(stderr);

            if(!stdout.includes('Project ID / Instance')){

                console.log('Unexpected output');
                return;
            }

            if(stdout.includes('Production-Project')){

                console.log('You are not allowed to deploy on development.');
                return;
            }

            console.log('You are allowed to deploy on development.');
            return runSequence('clean_content', 'copy_content', 'construct_pages', 'compile_css', 'compile_javascript',
                'set_development_environment', 'clean_up');
        });
    });

    // Constructs the pages with all their modules.
    gulp.task('construct_pages', function () {

        for(let page in pages){

            if(!pages.hasOwnProperty(page)){

                continue;
            }

            let fullPagePath = './Deploy/' + page;
            let stream = gulp.src(fullPagePath);

            for(let moduleCount = 0 ; moduleCount < pages[page].length ; moduleCount++){

                let module = './Deploy/' + pages[page][moduleCount].toString();
                let moduleName = module.replace('.html','');
                let lastIndexOfSlash = moduleName.lastIndexOf('/');
                moduleName = moduleName.substring(lastIndexOfSlash+1, moduleName.length);

                stream = stream
                    .pipe(inject(gulp.src(module), {
                        starttag: `<!-- inject:${moduleName}:{{ext}} -->`,
                        transform: function (filePath, file) {
                            // return file contents as string
                            return file.contents.toString('utf8')
                        }
                    }));
            }

            stream
                .pipe(gulp.dest('./Deploy/'));
        }
    });
};