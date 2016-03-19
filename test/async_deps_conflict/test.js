/* eslint-env node, mocha */

var pack = require('../../')
var gulp = require('gulp')
var path = require('path')
var through = require('through2')

describe('gulp-pack', function () {
  describe('async deps conflict', function () {
    // caes1
    describe('case1', function () {
      gulp.task('async-deps-conflict1', function () {
        it('should has conflict', function (done) {
          var stream = through.obj(function (file, encoding, cb) {
            var resMap = null

            if (file.relative === 'resource_deps.json') {
              resMap = JSON.parse(file.contents.toString())
              resMap.should.not.be.undefined()

              resMap['index.js'].asyncDeps.should.match(['a.js', 'b.js'])
              resMap['index.js'].deps.should.match(['c.js'])

              resMap['a.js'].should.not.be.undefined()
              resMap['a.js'].asyncDeps.should.be.empty()

              resMap['b.js'].should.not.be.undefined()
              resMap['b.js'].asyncDeps.should.be.empty()

              done()
            }
            cb()
          })
          return gulp.src(path.join(__dirname, 'case1/*.js'))
            .pipe(pack({
              baseUrl: '/',
              genResDeps: true,
              silent: true,
              entries: 'index.js'
            }))
            .pipe(stream)
        })
      })
      gulp.start('async-deps-conflict1')
    })
    // case2
    describe('case2', function () {
      gulp.task('async-deps-conflict2', function () {
        it('should has conflict', function (done) {
          var stream = through.obj(function (file, encoding, cb) {
            var resMap = null
            var res = null

            if (file.relative === 'resource_deps.json') {
              resMap = JSON.parse(file.contents.toString())
              resMap.should.not.be.undefined()

              res = resMap['index.js']
              res.should.not.be.undefined()
              res.deps.should.match(['c.js'])
              res.asyncDeps.should.match(['a.js', 'b.js'])

              resMap['a.js'].should.not.be.undefined()
              resMap['a.js'].deps.should.be.empty()

              resMap['b.js'].should.not.be.undefined()
              resMap['b.js'].deps.should.be.empty()

              done()
            }
            cb()
          })
          return gulp.src(path.join(__dirname, 'case2/*.js'))
            .pipe(pack({
              baseUrl: '/',
              genResDeps: true,
              silent: true,
              entries: 'index.js'
            }))
            .pipe(stream)
        })
      })
      gulp.start('async-deps-conflict2')
    })
  })
})
