/* eslint-env node, mocha */

var pack = require('../../')
var path = require('path')
var gulp = require('gulp')
var through = require('through2')

describe('gulp-pack', function () {
  describe('sync deps conflict', function () {
    // case1
    describe('#case1', function () {
      gulp.task('sync-deps-conflict1', function () {
        it('should has conflict', function (done) {
          var stream = through.obj(function (file, encoding, cb) {
            var resMap = null

            if (file.relative === 'resource_deps.json') {
              resMap = JSON.parse(file.contents.toString())
              resMap.should.not.be.undefined()

              resMap['index.js'].deps.should.match(['a.js', 'b.js'])

              resMap['a.js'].deps.should.match(['c.js'])

              resMap['b.js'].deps.should.be.empty()

              resMap['c.js'].deps.should.be.empty()

              done()
            }
            cb()
          })
          return gulp.src(path.join(__dirname, 'case1/*.js'))
            .pipe(pack({
              baseUrl: '/',
              genResDeps: true,
              entries: 'index.js'
            }))
            .pipe(stream)
        })
      })
      gulp.start('sync-deps-conflict1')
    })
    // case2
    describe('#case2', function () {
      gulp.task('sync-deps-conflict2', function () {
        it('should has conflict', function (done) {
          var stream = through.obj(function (file, encoding, cb) {
            var resMap = null
            var res = null

            if (file.relative === 'resource_deps.json') {
              resMap = JSON.parse(file.contents.toString())
              resMap.should.not.be.undefined()

              res = resMap['index.js']
              res.deps.should.match(['a.js', 'b.js'])

              resMap['a.js'].deps.should.match(['d.js'])

              resMap['b.js'].deps.should.be.match(['c.js'])

              resMap['c.js'].deps.should.be.empty()

              resMap['d.js'].deps.should.be.empty()

              done()
            }
            cb()
          })
          return gulp.src(path.join(__dirname, 'case2/*.js'))
            .pipe(pack({
              baseUrl: '/',
              genResDeps: true,
              entries: 'index.js'
            }))
            .pipe(stream)
        })
      })
      gulp.start('sync-deps-conflict2')
    })
  })
})
