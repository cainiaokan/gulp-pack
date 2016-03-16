/* eslint-env node, mocha */

var pack = require('../../')
var gulp = require('gulp')
var through = require('through2')

describe('gulp-pack', function () {
  describe('async deps deep', function () {
    gulp.task('async-deps-deep', function () {
      it('should has right deps', function (done) {
        var stream = through.obj(function (file, encoding, cb) {
          var resMap = null
          var res = null
          var resA = null
          var resC = null
          if (file.relative === 'resource_deps.json') {
            resMap = JSON.parse(file.contents.toString())
            resMap.should.not.be.undefined()

            res = resMap['index.js']
            res.should.not.be.undefined()
            res.asyncDeps.should.match(['a.js'])

            resA = resMap['a.js']
            resA.should.not.be.undefined()
            resA.asyncDeps.should.match(['b.js', 'c.js'])

            resMap['b.js'].should.not.be.undefined()

            resC = resMap['c.js']
            resC.should.not.be.undefined()
            resC.asyncDeps.should.match(['d.js'])

            resMap['d.js'].should.not.be.undefined()

            done()
          }
          cb()
        })
        return gulp.src('test/async_deps_deep/*.js')
          .pipe(pack({
            baseUrl: '/',
            genResDeps: true,
            entries: 'index.js'
          }))
          .pipe(stream)
      })
    })
    gulp.start('async-deps-deep')
  })
})
