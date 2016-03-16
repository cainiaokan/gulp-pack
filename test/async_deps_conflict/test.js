/* eslint-env node, mocha */

var pack = require('../../')
var gulp = require('gulp')
var through = require('through2')

describe('gulp-pack', function () {
  describe('async deps conflict', function () {
    gulp.task('async-deps-conflict', function () {
      it('should has conflict', function (done) {
        var stream = through.obj(function (file, encoding, cb) {
          var resMap = null
          var res = null

          if (file.relative === 'resource_deps.json') {
            resMap = JSON.parse(file.contents.toString())
            resMap.should.not.be.undefined()

            res = resMap['index.js']
            res.should.not.be.undefined()
            res.asyncDeps.should.match(['a.js', 'b.js'])
            res.deps.should.match(['c.js'])

            resMap['a.js'].should.not.be.undefined()

            resMap['b.js'].should.not.be.undefined()

            done()
          }
          cb()
        })
        return gulp.src('test/async_deps_conflict/*.js')
          .pipe(pack({
            baseUrl: '/',
            genResDeps: true,
            silent: true,
            entries: 'index.js'
          }))
          .pipe(stream)
      })
    })
    gulp.start('async-deps-conflict')
  })
})
