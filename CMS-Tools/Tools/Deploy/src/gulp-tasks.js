/**
 * @file gulp-tasks.js
 *
 * @author Bilger Yahov <bayahov1@gmail.com>
 * @version 1.0.0
 * @copyright © 2017 Bilger Yahov, all rights reserved.
 */

'use strict';

module.exports = function (pathToMainFolder) {

    const gulp  = require('gulp');
    const sass  = require('gulp-sass');
    const babel = require('gulp-babel');
    const runSequence = require('run-sequence');
    const clean  = require('gulp-clean');
    const replace = require('gulp-replace');
    const exec = require('child_process').exec;
    const stringifyObject = require('stringify-object');
    const inject = require('gulp-inject');

    gulp.task('clean_content', function(){

        return gulp.src(pathToMainFolder + '/Deploy/', {read : false})
            .pipe(clean());
    });

    gulp.task('clean_scss', function(){

        return gulp.src(pathToMainFolder + '/Deploy/**/*.scss', {read : false})
            .pipe(clean());
    });

    gulp.task('copy_content', function(){

        // Skip the redundant files in the CMS-Framework and CMS-Modules directories.
        return gulp.src([pathToMainFolder + '/App/**', '!' + pathToMainFolder + '/App/{CMS-Framework,CMS-Framework/**.!(js)}',
            '!' + pathToMainFolder + '/App/{CMS-Modules,CMS-Modules/**.!(js|html|scss)}'])
            .pipe(gulp.dest(pathToMainFolder + '/Deploy/'));
    });

    gulp.task('compile_javascript',  function(){

        // Make sure to take everything from the modules.
        // Make sure to take only the EcmaScript 6 files, without Vendor folder.
        const paths = [
            pathToMainFolder + '/Deploy/CMS-Modules/CMS-Modules/Modules/**/*.js',
            pathToMainFolder + '/Deploy/CMS-Framework/CMS-Framework/JavaScript/*.js'
        ];

        return gulp.src(paths, {base: pathToMainFolder + '/'})
            .pipe(babel())
            .pipe(gulp.dest(pathToMainFolder + '/'));
    });

    gulp.task('compile_css', function(){

        // Make sure to take everything from the modules.
        // Make sure to take only the scss stylesheets, without Vendor folder.
        const paths = [
            pathToMainFolder + '/Deploy/CMS-Modules/CMS-Modules/**/*.scss',
            pathToMainFolder + '/Deploy/StyleSheets/*.scss'
        ];

        return gulp.src(paths, {base: pathToMainFolder + '/'})
            .pipe(sass().on('error', sass.logError))
            .pipe(gulp.dest(pathToMainFolder + '/'));
    });

    gulp.task('set_development_environment', function () {

        return gulp.src(pathToMainFolder + '/Deploy/CMS-Framework/CMS-Framework/JavaScript/EnvironmentHelper.js', { base : pathToMainFolder + '/' })
            .pipe(replace(configFileLimtek.firebase.placeholder,
                stringifyObject(
                    configFileLimtek.firebase.development,
                    {singleQuotes: true})
                )
            )
            .pipe(gulp.dest(pathToMainFolder + '/'));
    });

    gulp.task('set_live_environment', function () {

        return gulp.src(pathToMainFolder + '/Deploy/CMS-Framework/CMS-Framework/JavaScript/EnvironmentHelper.js', { base : pathToMainFolder + '/' })
            .pipe(replace(configFileLimtek.firebase.placeholder,
                stringifyObject(
                    configFileLimtek.firebase.live,
                    {singleQuotes: true})
                )
            )
            .pipe(gulp.dest(pathToMainFolder + '/'));
    });

    gulp.task('deploy_locally', function(){

        return runSequence('check_rights_development');
    });

    gulp.task('deploy_live', function(){

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
                return runSequence('clean_content', 'copy_content', 'compile_css', 'compile_javascript', 'clean_scss',
                    'set_live_environment');
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
            return runSequence('clean_content', 'copy_content', 'compile_css', 'compile_javascript', 'clean_scss',
                'set_development_environment');
        });
    });

    gulp.task('construct_pages', function () {


    });
};