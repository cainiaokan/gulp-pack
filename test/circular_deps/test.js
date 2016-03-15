var should  = require('should');
var pack    = require('../../');
var gulp    = require('gulp');
var through = require('through2');

describe('gulp-pack', function() {
  describe('circular deps', function() {
    gulp.task('circular-deps', function() {
      it('should has right async deps', function (done) {
        var errorHandler = function(err){
          err.message.should.startWith('Circular dependency occurs');
          done();
        };
        return gulp.src('test/circular_deps/*.js')
          .pipe(pack({
            baseUrl: '/',
            genResDeps : true,
            entries    : 'index.js'
          }))
          .on('error', errorHandler);
      });
    });
    gulp.start('circular-deps');
  });
});
