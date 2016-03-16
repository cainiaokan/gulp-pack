/* eslint-env node, mocha */

var pack = require('../../')
var gulp = require('gulp')

describe('gulp-pack', function () {
  describe('circular deps', function () {
    gulp.task('circular-deps', function () {
      it('should throw error when having circular deps', function (done) {
        var errorHandler = function (err) {
          err.message.should.startWith('Circular dependency occurs')
          done()
        }
        return gulp.src('test/circular_deps/*.js')
          .pipe(pack({
            baseUrl: '/',
            genResDeps: true,
            entries: 'index.js'
          }))
          .on('error', errorHandler)
      })
    })
    gulp.start('circular-deps')
  })
})
