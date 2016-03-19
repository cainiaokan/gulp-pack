/* eslint-env node, mocha */

var pack = require('../../')
var path = require('path')
var gulp = require('gulp')
var through = require('through2')

describe('gulp-pack', function () {
  describe('sync deps', function () {
    gulp.task('sync-deps', function () {
      it('should has right deps', function (done) {
        var stream = through.obj(function (file, encoding, cb) {
          var resMap = null

          if (file.relative === 'resource_deps.json') {
            resMap = JSON.parse(file.contents.toString())

            resMap['index.js'].deps.should.match(['a.js', 'b.js'])

            resMap['a.js'].deps.should.be.empty()

            resMap['b.js'].deps.should.be.empty()

            done()
          }
          cb()
        })
        return gulp.src(path.join(__dirname, '*.js'))
          .pipe(pack({
            genResDeps: true
          }))
          .pipe(stream)
      })
    })
    gulp.start('sync-deps')
  })
})
