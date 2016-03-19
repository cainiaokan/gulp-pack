/* eslint-env node, mocha */
'use strict'

var pack = require('../../')
var path = require('path')
var gulp = require('gulp')
var through = require('through2')

describe('gulp-pack', function () {
  describe('async deps', function () {
    describe('#case1', function () {
      gulp.task('async-deps1', function () {
        it('should has right async deps', function (done) {
          var stream = through.obj(function (file, encoding, cb) {
            var resMap = null

            if (file.relative === 'resource_deps.json') {
              resMap = JSON.parse(file.contents.toString())

              resMap['index.js'].asyncDeps.should.match(['a.js', 'b.js'])

              resMap['a.js'].deps.should.be.empty()

              resMap['b.js'].deps.should.be.empty()

              done()
            }
            cb()
          })
          return gulp.src(path.join(__dirname, 'case1/*.js'))
            .pipe(pack({
              baseUrl: 'http://localhost',
              genResDeps: true
            }))
            .pipe(stream)
        })
      })
      gulp.start('async-deps1')
    })
    // case2
    describe('#case2', function () {
      gulp.task('async-deps2', function () {
        it('should has right async deps', function (done) {
          var stream = through.obj(function (file, encoding, cb) {
            var resMap = null

            if (file.relative === 'resource_deps.json') {
              resMap = JSON.parse(file.contents.toString())

              resMap['index.js'].asyncDeps.should.match(['a.js'])
              resMap['index.js'].deps.should.match(['style/index.css', 'tpl/index.tpl', 'json/index.json'])

              resMap['a.js'].deps.should.match(['style/index2.css'])

              done()
            }
            cb()
          })
          return gulp.src(path.join(__dirname, 'case2/**/*.*'))
            .pipe(pack({
              genResDeps: true
            }))
            .pipe(stream)
        })
      })
      gulp.start('async-deps2')
    })
  })
})
