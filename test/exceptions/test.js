/* eslint-env node, mocha */

var pack = require('../../')
var path = require('path')
var gulp = require('gulp')

describe('gulp-pack', function () {
  // circular
  describe('circular deps', function () {
    gulp.task('circular-deps', function () {
      it('should throw error', function (done) {
        var errorHandler = function (err) {
          err.message.should.startWith('Circular dependency occurs：[a.js->b.js->c.js->a.js]')
          done()
        }
        return gulp.src(path.join(__dirname, 'circular/*.js'))
          .pipe(pack({
            baseUrl: '/',
            genResDeps: true
          }))
          .on('error', errorHandler)
      })
    })
    gulp.start('circular-deps')
  })

  describe('depend on main entry', function () {
    gulp.task('dep_main_entry', function () {
      it('should throw error', function (done) {
        var errorHandler = function (err) {
          err.message.should.be.eql('Can\'t depend on main entry.')
          done()
        }
        return gulp.src(path.join(__dirname, 'depMainEntry/*.js'))
          .pipe(pack({
            baseUrl: '/',
            genResDeps: true
          }))
          .on('error', errorHandler)
      })
    })
    gulp.start('dep_main_entry')
  })
})
