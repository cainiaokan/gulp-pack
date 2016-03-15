var should  = require('should');
var pack    = require('../../');
var gulp    = require('gulp');
var through = require('through2');

describe('gulp-pack', function() {
  describe('sync deps conflict', function() {
    gulp.task('sync-deps-conflict', function() {
      it('should has conflict', function (done) {
        var stream = through.obj(function(file, encoding, cb){
          var resMap = null;
          var res    = null;
          var resA   = null;
          var resB   = null;

          if(file.relative === 'resource_deps.json') {
            resMap = JSON.parse(file.contents.toString());
            resMap.should.not.be.undefined();

            res = resMap['index.js'];
            res.should.not.be.undefined();
            res.deps.should.match(['a.js', 'b.js']);

            resA = resMap['a.js'];
            resA.should.not.be.undefined();
            resA.deps.should.match(['c.js']);

            resB = resMap['b.js'];
            resB.should.not.be.undefined();
            resB.deps.should.be.empty();

            resMap['c.js'].should.not.be.undefined();

            done();
          }
          cb();
        });
        return gulp.src('test/sync_deps_conflict/*.js')
          .pipe(pack({
            baseUrl: '/',
            genResDeps : true,
            entries    : 'index.js'
          }))
          .pipe(stream);
      });
    });
    gulp.start('sync-deps-conflict');
  });
});
