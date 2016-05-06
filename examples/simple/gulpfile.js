'use strict'
var gulp = require('gulp')
var plumber = require('gulp-plumber')
var minifyCss = require('gulp-minify-css')
var autoprefixer = require('gulp-autoprefixer')
var flatten = require('gulp-flatten')
var cache = require('gulp-cached')
var remember = require('gulp-remember')
var merge = require('merge2')
var pack = require('../..')
var clone = require('gulp-clone')

var paths = {
  js: './src/**/*.js',
  css: './src/**/*.css',
  html: './src/**/*.html',
  tpl: './src/**/*.tpl',
  bower: './bower_components/**/*[-.]min.js'
}

var dist = 'dist/'

gulp.task('build', function () {
  // preprocess all the static assets
  var preProcessors = [
    gulp.src(paths.js),

    gulp.src(paths.css)
      .pipe(plumber())
      .pipe(cache('all'))
      .pipe(autoprefixer({browsers: ['Android > 4', 'iOS > 6'], cascade: false}))
      .pipe(minifyCss({ processImport: false }))
      .pipe(remember('all'))
      .pipe(plumber.stop()),

    gulp.src(paths.html),

    gulp.src(paths.tpl),

    gulp.src(paths.bower)
      .pipe(plumber())
      .pipe(cache('all'))
      .pipe(flatten({newPath: 'bower_components'}))
      .pipe(remember('all'))
      .pipe(plumber.stop())
  ]

  // merge prepreocessor streams into one single stream
  return merge(preProcessors)
    .pipe(clone())
    .pipe(plumber())
    // run optimization
    // parse dependencies and pack each entrypoint and its deps into a single file
    .pipe(pack({
      baseUrl: './',
      genResDeps: true,
      entries: 'app/**/index.js'
    }))
    .pipe(gulp.dest(dist))
})

gulp.task('watch', ['build'], function () {
  var watcher = gulp.watch('src/**/*', ['build'])
  watcher.on('change', function (event) {
    console.log('File ' + event.path + ' was ' + event.type + ', running tasks...')
    if (event.type === 'deleted') {
      delete cache.caches['all'][event.path]
      remember.forget('tpl', event.path)
    }
  })
})

gulp.task('default', ['build'])
