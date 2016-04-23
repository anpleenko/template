'use strict';

const prod = (process.env.NODE_ENV == "prod")?(true):(false);

import gulp            from 'gulp';
import del             from 'del';
import mainBowerFiles  from 'main-bower-files';
import runSequence     from 'run-sequence';
import fs              from 'fs';
import perfectionist   from 'perfectionist';
import pxtorem         from 'postcss-pxtorem';
import selector        from 'postcss-custom-selectors';
import focusHover      from 'postcss-focus-hover';
import mqpacker        from "css-mqpacker";
import autoprefixer    from 'autoprefixer';
import browserSync     from 'browser-sync';
import gulpLoadPlugins from 'gulp-load-plugins';

let $ = gulpLoadPlugins({});

let PROCESSORS = [
    pxtorem({
        root_value: 14,
        selector_black_list: ['html']
    }),
    autoprefixer({ browsers: ['last 2 versions', '> 1%'] }),
    mqpacker,
    selector,
    focusHover
]

let BOWER_MAIN_FILES_CONFIG = {
    includeDev: true,
    paths:{
        bowerDirectory: './assets/bower',
        bowerJson: './bower.json'
    }
}

let reload = browserSync.reload;

gulp.task('imagemin_clear', () => {
    return del(['app/img/'])
})

gulp.task('imagemin_build', () => {
    return gulp.src('./assets/images/**')
        .pipe($.if(prod, $.imagemin({progressive: true})))
        .pipe(gulp.dest('app/img/'))
})

gulp.task('imagemin', () => {
    runSequence('imagemin_clear', 'imagemin_build')
})

gulp.task('browserSync', () => {
    browserSync({
        server: {baseDir: "./app/"},
        open: false
    })
})

gulp.task('jade', () => {
    var data = JSON.parse(fs.readFileSync('./assets/data/data.json', 'utf-8'));
    data.debug = !prod;

    return gulp.src('./assets/pages/!(_)*.jade')
        .pipe($.remember('jade'))
        .pipe($.jade({locals: data }))
        .on('error', $.notify.onError())
        .pipe($.posthtml([
            require('posthtml-bem')({
                elemPrefix: '__',
                modPrefix: '_',
                modDlmtr: '--'
            })
        ]))
        .pipe($.prettify({indent_size: 4}))
        .pipe($.replace(/&nbsp;/g, ' '))
        .pipe($.check('elem="')).on('error', $.notify.onError())
        .pipe(gulp.dest('./app/'))
        .on('end', browserSync.reload)
})

gulp.task('bootstrap', () => {
    return gulp.src(['./assets/bootstrap/**/*.scss'])

        .pipe($.sass({
            includePaths: ['assets/bower/bootstrap-sass/assets/stylesheets/']
        }).on('error', $.notify.onError()))

        .pipe($.postcss(PROCESSORS))
        .pipe($.csso())
        .pipe($.if(!prod, $.postcss([perfectionist({})])))
        .pipe(gulp.dest('./app/css'))
        .pipe(reload({stream: true}))
})

gulp.task('scss', () => {
    return gulp.src(['assets/scss/**/style.scss'])
        .pipe($.sassGlobImport())
        .pipe($.sass().on('error', $.notify.onError()))
        .pipe($.postcss(PROCESSORS))
        .pipe($.csso())
        .pipe($.if(!prod, $.postcss([perfectionist({})])))
        .pipe(gulp.dest('./app/css'))
        .pipe(reload({stream: true}))
})

gulp.task('babel', () => {
    return gulp.src(['./assets/script/**/*.js'])
        .pipe($.babel({
            comments: false,
            presets: ['es2015']
        })).on('error', $.notify.onError())
        .pipe($.concat('main.js'))
        .pipe($.if(prod, $.uglify({mangle: false})))
        .pipe(gulp.dest('./app/js/'))
        .on('end', browserSync.reload)
})

gulp.task('copyMiscFiles', () => {
    return gulp.src(['assets/misc/**'])
        .pipe(gulp.dest('app/'))
})

gulp.task('copyLibsFiles', () => {
    return gulp.src(['assets/lib/**'])
        .pipe($.uglify())
        .pipe(gulp.dest('app/js'))
})

gulp.task('copyFontFiles', () => {
    return gulp.src(['assets/fonts/**'])
        .pipe(gulp.dest('app/fonts'))
})

gulp.task('buildBowerCSS', () => {
    var cssFilter = $.filter('**/*.css')
    return gulp.src(mainBowerFiles(BOWER_MAIN_FILES_CONFIG))
        .pipe(cssFilter)
        .pipe($.csso())
        .pipe($.if(!prod, $.postcss([perfectionist({})])))
        .pipe(gulp.dest('app/css'))
})

gulp.task('buildBowerJS', () => {
    var jsFilter = $.filter('**/*.js')
    return gulp.src(mainBowerFiles(BOWER_MAIN_FILES_CONFIG))
        .pipe(jsFilter)
        .pipe($.uglify())
        .pipe(gulp.dest('app/js'))
})

gulp.task('build', () =>{
    runSequence('bootstrap', 'scss', 'imagemin_clear',
        'imagemin_build', 'babel', 'jade', 'copyMiscFiles',
        'copyFontFiles', 'buildBowerCSS', 'buildBowerJS',
        'copyLibsFiles')
})

gulp.task('default', ['browserSync'], () => {
    $.watch(['assets/components/**/*.scss', 'assets/scss/**/*.scss'], () => gulp.start('scss'));
    $.watch(['assets/bootstrap/**/*.scss'], () => gulp.start('bootstrap'));
    $.watch(['assets/images/**'], () => gulp.start('imagemin'));
    $.watch(['assets/data/**/*.json', 'assets/pages/**/*.jade', 'assets/components/**/*.jade'], () => gulp.start('jade'));
    $.watch(['assets/script/**/*.js'], () => gulp.start('babel'));
})
