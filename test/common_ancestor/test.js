/* eslint-env node, mocha */

var pack = require('../../')
var gulp = require('gulp')
var path = require('path')
var through = require('through2')

describe('gulp-pack', function () {
  describe('common ancestor', function () {
    gulp.task('common_ancestor', function () {
      it('should has right deps', function (done) {
        var stream = through.obj(function (file, encoding, cb) {
          var resMap = null

          if (file.relative === 'resource_deps.json') {
            resMap = JSON.parse(file.contents.toString())

            resMap['page1/index.js'].deps.should.match(['common.js'])
            resMap['page2/index.js'].deps.should.match(['common.js'])
            resMap['common.js'].parentModuleId.should.be.eql('page2/index.js')

            done()
          }
          cb()
        })
        return gulp.src(path.join(__dirname, '**/*.js'))
          .pipe(pack({
            baseUrl: '/',
            genResDeps: true
          }))
          .pipe(stream)
      })
    })
    gulp.start('common_ancestor')
  })
})
