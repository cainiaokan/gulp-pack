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
*An output example*
```js
'use strict'

/* eslint-disable */
var require
var define
/* eslint-enable */

(function (undef) {
  var req
  var defined = {}
  var waiting = {}
  var config = {}
  var hasOwn = Object.prototype.hasOwnProperty

  function hasProp (obj, prop) {
    return hasOwn.call(obj, prop)
  }

  function isAbsolute (url) {
    return url.indexOf('://') > 0 || url.indexOf('//') === 0
  }

  function main (id, factory) {
    var module, exports, ret
    module = {
      id: id,
      uri: req.toUri(id),
      exports: {},
      config: {}
    }
    exports = module.exports
    if (typeof factory === 'function') {
      ret = factory.apply(undef, [req, exports, module])
      if (ret) {
        module.exports = ret
      }
    } else {
      module.exports = factory
    }
    defined[id] = module.exports
  }

  function callDep (id) {
    if (hasProp(waiting, id)) {
      var args = waiting[id]
      delete waiting[id]
      main.apply(undef, args)
    }
    if (!hasProp(defined, id)) {
      throw new Error('No ' + id)
    }
    return defined[id]
  }

  require = req = function (id) {
    return callDep(id)
  }
  req.defined = defined
  req.waiting = waiting

  req.toUri = function (id) {
    if (isAbsolute(id)) {
      return id
    } else {
      return config.baseUrl + id
    }
  }

  req.config = function (cfg) {
    if (typeof cfg === 'string') {
      return config[cfg]
    } else if (typeof cfg === 'object') {
      for (var p in cfg) {
        if (cfg.hasOwnProperty(p)) {
          config[p] = cfg[p]
        }
      }
    }
  }

  define = function (id, factory) {
    if (!hasProp(defined, id) && !hasProp(waiting, id)) {
      waiting[id] = [id, factory]
    } else {
      throw Error('Duplicate ' + id)
    }
  }
})()

require.config({
  "baseUrl": "./"
})
define('common/style/common.css', function (require, exports, module){
  var style = document.createElement("style")
  var contents = 'body,html{font:16px/1 arial,tahoma,microsoft yahei,sans-serif,sans-serif;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;-webkit-font-smoothing:antialiased}'
  style.type = "text/css"
  if (style.styleSheet) {
    style.styleSheet.cssText = contents
  } else {
    style.innerHTML = contents
  }
  document.getElementsByTagName("head")[0].appendChild(style)
})

define('common/script/util.js', function (require, exports, module){
'use strict'

// get time string
exports.getTime = function () {
  var now = new Date()
  var year = now.getFullYear()
  var month = now.getMonth() + 1
  var day = now.getDate()
  return year.toString() +
    (month >= 10 ? month : '0' + month) +
    (day >= 10 ? day : '0' + day)
}


})

define('app/page/show_time/message.js', function (require, exports, module){
'use strict'

exports.getMessage = function () {
  return 'now you know.'
}


})

define('app/page/show_time/time.tpl', function (require, exports, module){
return function(data){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
__p+='<h1>Time is '+
((__t=(data.time))==null?'':__t)+
'</h1>';
return __p;
}
})

define('app/page/show_time/index.js', function (require, exports, module){
/* global $, alert*/
'use stirct'

require('common/style/common.css')

var util = require('common/script/util.js')
var message = require('app/page/show_time/message.js')
var timeTpl = require('app/page/show_time/time.tpl')

$('body').append(timeTpl({time: util.getTime()}))

alert(message.getMessage())


})

require('app/page/show_time/index.js')
```
## License

MIT © [Louie Lang](https://github.com/cainiaokan)


