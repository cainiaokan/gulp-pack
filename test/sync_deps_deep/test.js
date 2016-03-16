/* eslint-env node, mocha */
var pack = require('../../')

var gulp = require('gulp')
var through = require('through2')

describe('gulp-pack', function () {
  describe('sync deps deep', function () {
    gulp.task('sync-deps-deep', function () {
      it('should has right deps', function (done) {
        var stream = through.obj(function (file, encoding, cb) {
          var resMap = null
          var res = null
          var resA = null
          var resB = null
          var resC = null
          if (file.relative === 'resource_deps.json') {
            resMap = JSON.parse(file.contents.toString())
            resMap.should.not.be.undefined()

            res = resMap['index.js']
            res.should.not.be.undefined()
            res.deps.should.match(['a.js'])

            resA = resMap['a.js']
            resA.should.not.be.undefined()
            resA.deps.should.match(['b.js'])

            resB = resMap['b.js']
            resB.should.not.be.undefined()
            resB.deps.should.match(['c.js'])

            resC = resMap['c.js']
            resC.should.not.be.undefined()
            resC.deps.should.match(['d.js'])

            resMap['d.js'].should.not.be.undefined()

            done()
          }
          cb()
        })
        return gulp.src('test/sync_deps_deep/*.js')
          .pipe(pack({
            baseUrl: '/',
            genResDeps: true,
            entries: 'index.js'
          }))
          .pipe(stream)
      })
    })
    gulp.start('sync-deps-deep')
  })
})
