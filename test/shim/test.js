/* eslint-env node, mocha */

var pack = require('../../')
var path = require('path')
var gulp = require('gulp')
var through = require('through2')

describe('gulp-pack', function () {
  describe('shim support', function () {
    gulp.task('shim', function () {
      it('should support shim deps', function (done) {
        var stream = through.obj(function (file, encoding, cb) {
          var resMap = null

          if (file.relative === 'index.js') {
            file.contents.toString().should.match(/.*module\.exports = \$.*/)
          }

          if (file.relative === 'resource_deps.json') {
            resMap = JSON.parse(file.contents.toString())
            resMap['index.js'].deps.should.match(['third.js'])
            done()
          }

          cb()
        })
        return gulp.src(path.join(__dirname, '*.js'))
          .pipe(pack({
            baseUrl: '/',
            genResDeps: true,
            shim: {
              'third.js': '$'
            },
            entries: 'index.js'
          }))
          .pipe(stream)
      })
    })
    gulp.start('shim')
  })
})
