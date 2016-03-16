'use strict'

var path = require('path')
var gulp = require('gulp')
var jshint = require('gulp-jshint')
var plumber = require('gulp-plumber')
var filter = require('gulp-filter')
var uglify = require('gulp-uglify')
var sourcemaps = require('gulp-sourcemaps')
var minifyCss = require('gulp-minify-css')
var autoprefixer = require('gulp-autoprefixer')
var flatten = require('gulp-flatten')
var cache = require('gulp-cached')
var remember = require('gulp-remember')
var merge = require('merge2')
var pack = require('gulp-dep-pack')

var paths = {
  js: './src/**/*.js',
  css: './src/**/*.css',
  html: './src/**/*.html',
  tpl: './src/**/*.tpl',
  bower: './bower_components/**/*[-.]min.js'
}

var dist = 'dist/'

gulp.task('build', function () {
  var scriptFilter = filter('**/*.js', {restore: true})

  // preprocess all the static assets
  var preProcessors = [
    gulp.src(paths.js)
      .pipe(plumber())
      .pipe(cache('js'))
      .pipe(jshint())
      .pipe(jshint.reporter())
      .pipe(remember('js'))
      .pipe(plumber.stop()),

    gulp.src(paths.css)
      .pipe(plumber())
      .pipe(cache('css'))
      .pipe(autoprefixer({browsers: ['Android > 4', 'iOS > 6'], cascade: false}))
      .pipe(minifyCss({ processImport: false }))
      .pipe(remember('css'))
      .pipe(plumber.stop()),

    gulp.src(paths.html),

    gulp.src(paths.tpl),

    gulp.src(paths.bower)
      .pipe(plumber())
      .pipe(cache('bower'))
      .pipe(flatten({newPath: 'bower_components'}))
      .pipe(remember('bower'))
      .pipe(plumber.stop())
  ]

  // merge prepreocessor streams into one single stream
  return merge(preProcessors)
    .pipe(plumber())
    // run optimization
    // parse dependencies and pack each entrypoint and its deps into a single file
    .pipe(pack({
      baseUrl: './',
      genResDeps: true,
      entries: 'app/**/index.js'
    }))
    // uglify those js files and then add on sourcemap.
    .pipe(scriptFilter)
    .pipe(cache('entries'))
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(sourcemaps.write('.'))
    .pipe(remember('entries'))
    .pipe(scriptFilter.restore)
    .pipe(gulp.dest(dist))
})

gulp.task('watch', ['build'], function () {
  var watcher = gulp.watch('src/**/*', ['build'])
  watcher.on('change', function (event) {
    console.log('File ' + event.path + ' was ' + event.type + ', running tasks...')
    if (event.type === 'deleted') {
      var extname = path.extname(event.path)

      switch (extname) {
        case '.js':
          delete cache.caches['js'][event.path]
          remember.forget('js', event.path)
          break
        case '.css':
          delete cache.caches['css'][event.path]
          remember.forget('css', event.path)
          break
        case '.html':
          delete cache.caches['html'][event.path]
          remember.forget('html', event.path)
          break
        case '.tpl':
          delete cache.caches['tpl'][event.path]
          remember.forget('tpl', event.path)
          break
      }
    }
  })
})

gulp.task('default', ['build'])
