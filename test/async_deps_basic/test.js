/* eslint-env node, mocha */
'use strict'

var pack = require('../../')
var gulp = require('gulp')
var through = require('through2')

describe('gulp-pack', function () {
  describe('async deps basic', function () {
    gulp.task('async-deps-basic', function () {
      it('should has right async deps', function (done) {
        var stream = through.obj(function (file, encoding, cb) {
          var resMap = null
          var res = null

          if (file.relative === 'resource_deps.json') {
            resMap = JSON.parse(file.contents.toString())
            resMap.should.not.be.undefined()

            res = resMap['index.js']
            res.should.not.be.undefined()
            res.asyncDeps.should.match(['a.js', 'b.js'])

            resMap['a.js'].should.not.be.undefined()

            resMap['b.js'].should.not.be.undefined()

            done()
          }
          cb()
        })
        return gulp.src('test/async_deps_basic/*.js')
          .pipe(pack({
            baseUrl: '/',
            genResDeps: true,
            entries: 'index.js'
          }))
          .pipe(stream)
      })
    })
    gulp.start('async-deps-basic')
  })
})
