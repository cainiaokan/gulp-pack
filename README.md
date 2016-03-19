# gulp-dep-pack 
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/cainiaokan/gulp-pack)
[![Build Status](https://travis-ci.org/cainiaokan/gulp-pack.svg?branch=master)](https://travis-ci.org/cainiaokan/gulp-pack) 
[![npm version](https://img.shields.io/npm/v/gulp-dep-pack.svg)](https://www.npmjs.com/package/gulp-dep-pack) 
[![Dependency Status](https://david-dm.org/cainiaokan/gulp-pack.svg)](https://david-dm.org/cainiaokan/gulp-pack) 
[![Coverage Status](https://coveralls.io/repos/github/cainiaokan/gulp-pack/badge.svg?branch=master)](https://coveralls.io/github/cainiaokan/gulp-pack?branch=master)

> Pack assets with [Gulp-Dep-Pack](https://github.com/cainiaokan/gulp-pack)

*Issues with the output should be reported on the GulpDepPack [issue tracker](https://github.com/cainiaokan/gulp-pack/issues).*

## Install
```
$ npm install --save-dev gulp-dep-pack
```

## Usage

```js
const gulp = require('gulp');
const pack = require('gulp-pack');

gulp.task('default', () =>
  gulp.src('src/**/*.*')
    .pipe(pack({
      baseUrl: 'http://mycdn.com/',
      genResDeps: true,
      entries: 'app/**/index.js'
    }))
    .pipe(gulp.dest('dist'))
);
```

### options
Type: `object`

Set options described below from its properties. 
  
#### options.baseUrl
Type: `string`
Default: `/`

Set base url for loading anther entry module asynchronously.

#### options.shim
Type: `object`
Default: `{}`

for non-export modules

```js
gulp.task('default', =>
  gulp.src('src/**/*.*')
    .pipe(pack({
      baseUrl: 'http://mycdn.com/',
      shim: {
        'third/underscore.js': {
          exports: '_'
        }
      },
      genResDeps: true,
      entries: 'app/**/index.js'
    }))
    .pipe(gulp.dest('dist'))
);
```

#### options.genResDeps
Type: `boolean`
Default: `true`

generate a json file of assets dependencies(resource_deps.json by default)

#### options.silent
Type: `boolean`
Default: `false`

disable warnings

#### options.entries
Type: `string`
Default: `**/index.js`

a glob pattern matches those entrypoints

## Example
```js
  const coffee = require('gulp-coffee')
  const coffeelint = require('gulp-coffeelint')
  const less = require('gulp-less')
  const minifyCss = require('gulp-minify-css')
  const autoprefixer = require('gulp-autoprefixer')
  const merge = require('merge2')

  const preProcessors = [
    gulp.src(paths.coffee, { base: src })
      .pipe(coffeelint())
      .pipe(coffeelint.reporter())
      .pipe(coffee({ bare: true })),

    gulp.src(paths.less, { base: src })
      .pipe(less())
      .pipe(autoprefixer({browsers: ['Android > 4', 'iOS > 6'], cascade: false}))
      .pipe(minifyCss({ processImport: false }))
  ]

  //merge prepreocessor streams into one single stream
  return merge(preProcessors)
    //run optimization
    //parse dependencies and pack each entrypoint and its deps into a single file
    .pipe(pack({
      baseUrl: 'http://yourcdn.com/',
      genResDeps: true,
      entries: 'app/**/index.js'
    }))
    .pipe(gulp.dest('dist')
```
## License

MIT © [Louie Lang](https://github.com/cainiaokan)


