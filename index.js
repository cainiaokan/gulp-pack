'use strict'

var depsParser = require('./dependencyParser')
var gutil = require('gulp-util')
var PLUGIN_NAME = 'gulp-dep-pack'
var minimatch = require('minimatch')
var path = require('path')
var fs = require('fs')
var os = require('os')
var _ = require('lodash')
var through = require('through2')

var vinylFiles
var resourceMap
var config = {}
var MODULAR_FILE = path.join(__dirname, 'modular/modular.js')
var MODULAR_ASYNC_FILE = path.join(__dirname, '/modular/modular_async.js')
var modularjs = fs.readFileSync(MODULAR_FILE, {encoding: 'utf-8'})
var modularjs_async = fs.readFileSync(MODULAR_ASYNC_FILE, {encoding: 'utf-8'})

var defaultCfg = {
  baseUrl: '/',
  shim: {},
  genResDeps: false,
  silent: false,
  entries: '**/index.js'
}

function processConf (conf) {
  var baseUrl = conf.baseUrl
  if (baseUrl && baseUrl.charAt(baseUrl.length - 1) !== '/') {
    conf.baseUrl = baseUrl + '/'
  }
  config = _.defaults(conf, defaultCfg)
}

function writeBundle (moduleId) {
  var vinylFile = vinylFiles[moduleId]
  vinylFile.contents = new Buffer(writeDeps(moduleId))
}

function writeDeps (moduleId) {
  var module = resourceMap[moduleId]
  var vinylFile = vinylFiles[moduleId]
  var contents = ''

  // use avaiable transformed contents first
  if (module.isTransformed) {
    return vinylFile.contents.toString()
  }

  module.deps.forEach(function (moduleId) {
    contents += writeDeps(moduleId)
  })

  contents += wrapModuleDef(moduleId)

  // if main entrypoint, add module manage snippet in front of it.
  if (module.isEntry && module.parentModuleId === null) {
    contents = (module.asyncDeps.length ? modularjs_async : modularjs) +
      os.EOL + writeJsConfig() + contents
    // insert require.
    contents += os.EOL + 'require(\'' + moduleId + '\')' + os.EOL
  }

  // save transformed contents for subsequent possible uses
  module.isTransformed = true
  vinylFile.contents = new Buffer(contents)

  // write asynchronized entry.
  module.asyncDeps.forEach(function (moduleId) {
    writeBundle(moduleId)
  })

  return contents
}

function writeJsConfig () {
  return 'require.config(' +
    JSON.stringify({
      baseUrl: config.baseUrl
    }, null, 2) +
    ')'
}

function wrapModuleDef (moduleId) {
  var vinylFile = vinylFiles[moduleId]
  var module = resourceMap[moduleId]
  var extname = path.extname(moduleId)
  var fileContents = vinylFile.contents.toString()
  var contents = ''
  var EOL = os.EOL

  contents += EOL +
    'define(\'' + moduleId + '\', function (require, exports, module){'

  if (extname === '.js') {
    contents += EOL + fileContents
  } else if (extname === '.css') {
    fileContents = fileContents.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')
    contents += EOL + '  var style = document.createElement("style")' +
                EOL + '  var contents = \'' + fileContents + '\'' +
                EOL + '  style.type = "text/css"' +
                EOL + '  if (style.styleSheet) {' +
                EOL + '    style.styleSheet.cssText = contents' +
                EOL + '  } else {' +
                EOL + '    style.innerHTML = contents' +
                EOL + '  }' +
                EOL + '  document.getElementsByTagName("head")[0].appendChild(style)'
  } else if (extname === '.json') {
    contents += EOL + '  return ' + fileContents + ''
  } else if (extname === '.tpl' || extname === '.tmpl') {
    contents += EOL + '  return _.template(\'' + fileContents.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/>\s+?</g, '><').replace(/\r?\n/g, '\\n') + '\')'
  } else {
    throw new gutil.PluginError(PLUGIN_NAME, 'Unknow file type: ' + vinylFiles.path)
  }

  if (module.shim && module.exports) {
    contents += EOL + '  module.exports = ' + module.exports + ''
  }

  contents += EOL + '})' + EOL

  return contents
}

module.exports = function pack (conf) {
  resourceMap = {}
  vinylFiles = {}

  processConf(conf)

  depsParser.setVinylFiles(vinylFiles)
  depsParser.setConfig(config)
  depsParser.setResourceMap(resourceMap)

  var stream = through.obj(function (file, encoding, cb) {
    var moduleId = file.relative
    if (file.isStream()) {
      return cb(new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'))
    }

    if (file.isBuffer()) {
      if (process.platform === 'win32') {
        moduleId = moduleId.replace(/\\+/g, '/')
      }
      // collect files for the following process
      vinylFiles[moduleId] = file.clone()
      cb()
    }
  }, function (cb) {
    var isErrorExist = false
    // parse each entry file. combine it and its deps into a single file.
    Object.keys(vinylFiles).every(function (moduleId) {
      if (minimatch(moduleId, config.entries)) {
        try {
          // parse deps
          depsParser.parse(moduleId)
          // write as a bundle
          writeBundle(moduleId)
          return true
        } catch (ex) {
          isErrorExist = true
          cb(ex)
          return false
        }
      } else {
        return true
      }
    })

    if (!isErrorExist) {
      Object.keys(vinylFiles).forEach(function (moduleId) {
        var module = resourceMap[moduleId]
        if (!module) {
          stream.push(vinylFiles[moduleId])
        // ignore those not-entry and combined files
        } else if (module.isEntry || !module.combined) {
          stream.push(vinylFiles[moduleId])
        }
      })

      // generate dependent relations json file.
      if (config.genResDeps) {
        var resourcesJson = new gutil.File({
          path: 'resource_deps.json'
        })
        // gutil.log(JSON.stringify(resourceMap, null, 2))
        resourcesJson.contents = new Buffer(JSON.stringify(resourceMap, null, 2))
        stream.push(resourcesJson)
      }
      cb()
    }
  })

  return stream
}
