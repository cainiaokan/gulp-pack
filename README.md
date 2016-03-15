# gulp-pack [![Build Status](https://travis-ci.org/babel/gulp-pack.svg?branch=master)](https://travis-ci.org/pack/gulp-pack)

> Pack assets with [Gulp-Pack](https://github.com/cainiaokan/gulp-pack)

*Issues with the output should be reported on the Babel [issue tracker](https://github.com/cainiaokan/gulp-pack/issues).*

## Install
```
$ npm install --save-dev gulp-pack
```

## Usage

```js
const gulp = require('gulp');
const pack = require('gulp-pack');

gulp.task('default', () =>
  gulp.src('src/**/*.*')
    .pipe(pack({
      baseUrl: 'http://mycdn.com/',
            genResDeps : true,
            entries    : 'app/**/index.js'
    }))
    .pipe(gulp.dest('dist'))
);
```

## Options

* __baseUrl:__ 
    Specify scripts' base url
* __shim:__ for non-export modules
* __genResDeps:__ generate a json file of assets dependencies(resource_deps.json by default)
* __silent:__ disable logs
* __entries:__ a glob pattern matches those entrypoints

## Example
```
  var preProcessors = [
    gulp.src(paths.coffee, { base: src })
      .pipe(plumber())
      .pipe(cache('coffee'))
      .pipe(coffeelint())
      .pipe(coffeelint.reporter())
      .pipe(coffee({ bare: true }))
      .pipe(uri(pathToCDN))
      .pipe(remember('coffee'))
      .pipe(plumber.stop()),

    gulp.src(paths.less, { base: src })
      .pipe(plumber())
      .pipe(cache('less'))
      .pipe(less())
      .pipe(cssCDN(pathToCDN))
      .pipe(autoprefixer({browsers: ['Android > 4', 'iOS > 6'], cascade: false}))
      .pipe(minifyCss({ processImport: false }))
      .pipe(remember('less'))
      .pipe(plumber.stop())
  ];

  //merge prepreocessor streams into one single stream
  return merge(preProcessors)
    .pipe(plumber())
    //run optimization
    //parse dependencies and pack each entrypoint and its deps into a single file
    .pipe(pack({
      baseUrl    : 'http://yourcdn.com/',
      genResDeps : true,
      entries    : 'app/**/index.js'
    }))
    .pipe(gulp.dest('dist');
```
## License

MIT © [Louie Lang](https://github.com/cainiaokan)


