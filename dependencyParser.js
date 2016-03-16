var _ = require('lodash')
var path = require('path')
var gutil = require('gulp-util')
var PluginError = gutil.PluginError
var PLUGIN_NAME = 'gulp-dep-pack'
var reReq = /require\s*(\.async)?\s*\(\s*(["'])(.+?)\2/g

var config, resourceMap, vinylFiles

function setConfig (conf) {
  config = conf
}

function setResourceMap (res) {
  resourceMap = res
}

function setVinylFiles (files) {
  vinylFiles = files
}

function getModuleId (vinylFile, moduleId) {
  // the path starts with a '/'
  if (path.isAbsolute(moduleId)) {
    moduleId = path.normalize(moduleId).substring(1)
  } else if (moduleId.charAt(0) === '.') {
    moduleId = path.normalize(path.dirname(vinylFile.relative) + '/' + moduleId)
  } else {
    moduleId = path.normalize(moduleId)
  }

  if (process.platform === 'win32') {
    moduleId = moduleId.replace(/\\+/g, '/')
  }

  if (!path.extname(moduleId)) {
    moduleId += '.js'
  }

  return moduleId
}

function extractPath (vinylFile) {
  var filepaths = {
    asyncRequire: [],
    syncRequire: []
  }
  var fileContents = vinylFile.contents.toString()

  // rewirte module's id names as full pathnames.
  // eg. "../a/b" to "myapp/modules/a/b.js"
  fileContents = fileContents
    .replace(reReq, function (__, isAsync, delimiter, moduleId) {
      moduleId = getModuleId(vinylFile, moduleId)
      // extract deps
      if (isAsync) {
        filepaths.asyncRequire = filepaths.asyncRequire.concat(moduleId)
        return 'require.async(' + delimiter + moduleId + delimiter
      } else {
        filepaths.syncRequire = filepaths.syncRequire.concat(moduleId)
        return 'require(' + delimiter + moduleId + delimiter
      }
    })

  vinylFile.contents = new Buffer(fileContents)

  return filepaths
}

function getCircularDep (moduleId, parentModuleId) {
  var parent
  var circular = [moduleId]
  do {
    circular.push(parentModuleId)
    if (parentModuleId === moduleId) return circular.reverse()
  } while (
    !!(parent = resourceMap[parentModuleId]) &&
    (parentModuleId = parent.parentModuleId)
  )

  return null
}

function findCommonParent (resource1, resource2) {
  var array1 = []
  var array2 = []
  var commonParent = null

  while (true) {
    if (!resource1) break
    array1.push(resource1.moduleId)
    resource1 = resourceMap[resource1.parentModuleId]
  }

  while (true) {
    if (!resource2) break
    array2.push(resource2.moduleId)
    resource2 = resourceMap[resource2.parentModuleId]
  }

  commonParent = _.intersection(array1, array2)[0]

  return commonParent
}

function findBelongingEntry (resource) {
  while (resource && !resource.isEntry) {
    resource = resourceMap[resource.parentModuleId]
  }
  return resource
}

function conflict (moduleId, parentModuleId, isEntry) {
  var circular = getCircularDep(moduleId, parentModuleId)
  if (circular !== null) {
    throw new PluginError(PLUGIN_NAME, 'Circular dependency occurs：[' + circular.join('->') + '], please check your code.')
  }

  var resource = resourceMap[moduleId]
  var parent = resourceMap[resource.parentModuleId]
  var curParent = resourceMap[parentModuleId]
  var entry = findBelongingEntry(parent)
  var curEntry = findBelongingEntry(curParent)
  var commonParent
  // if the module is required in a same entrypoint twice
  if (entry === curEntry) {
    if (isEntry) {
      if (!resource.isEntry) {
        if (!config.silent) {
          gutil.log('Dependency conflict occurs："' + moduleId + '" has been declared as a synchronized dependency of "' + parent.moduleId + '", therefore it can\'t be declared as an asynchronized dependency of "' + parentModuleId + '".')
        }
      } else {
        // ignore the duplicate require
      }
      return
    } else {
      if (!resource.isEntry) {
        // ignore the duplicate require
      } else {
        // remove the asynchronized dep
        _.remove(parent.asyncDeps, function (id) {
          return moduleId === id
        })
        // add synchronized dep to current parent module.
        curParent.deps.push(moduleId)
        if (!config.silent) {
          gutil.log('Dependency conflict occurs："' + moduleId + '" has been declared as a synchronized dependency of "' + parentModuleId + '", therefore it can\'t be declared as an asynchronized dependency of "' + parent.moduleId + '".')
        }
      }
      return
    }
  }

  commonParent = findCommonParent(parent, curParent)
  // ignore the conflict if there're no common parent dependency between them.
  if (!commonParent) {
    if (isEntry) {
      resourceMap[parentModuleId].asyncDeps.push(moduleId)
    } else {
      resourceMap[parentModuleId].deps.push(moduleId)
    }
    resource.parentModuleId = parentModuleId
    return
  } else {
    commonParent = resourceMap[commonParent]
  }

<<<<<<< HEAD
  // transform the module into a synchronized dep.
  resource.isEntry = false
  resource.parentModuleId = commonParent.moduleId
  // get rid of this module from its current parent module.
  _.remove(resource.isEntry ? parent.asyncDeps : parent.deps, function (fp) {
    return moduleId === fp
  })
  // reset the module as a synchronized module of the common parent.
  commonParent.deps.push(moduleId)
  if (!config.silent) {
    gutil.log('Dependency conflict occurs："' + moduleId + '" is required to be promoted as "' + commonParent.moduleId + '"\'s synchronized dependency.')
  }
}

function parse (moduleId) {
  parseDepTree(moduleId, null, true)
}

function parseDepTree (moduleId, parentModuleId, isEntry) {
  var vinylFile = vinylFiles[moduleId]
  var extname = path.extname(moduleId)
  var shim = config.shim[moduleId]
  var resource = {
    moduleId: moduleId,
    isEntry: isEntry,
    deps: [],
    asyncDeps: [],
    parentModuleId: parentModuleId
  }
  var deps = resource.deps
  var asyncDeps = resource.asyncDeps
  var filepaths

  if (!vinylFile) {
    throw new PluginError(PLUGIN_NAME, 'Could\'t find the module \'' + moduleId + '\'.')
  }

  if (shim) {
    resource.shim = true
    resource.exports = shim.exports
  }

  resourceMap[moduleId] = resource

  if (extname === '.js') {
    filepaths = extractPath(vinylFile)
    if (!isEntry)resource.combined = true
  } else {
    resource.combined = true
    return
  }

  // process all these synchonized dependencies firstly.
  filepaths.syncRequire.forEach(function (subModuleId) {
    if (resourceMap[subModuleId]) {
      // resolve conflict
      conflict(subModuleId, moduleId, false)
    } else {
      deps.push(subModuleId)
      parseDepTree(subModuleId, moduleId, false)
    }
  })

  filepaths.asyncRequire.forEach(function (subModuleId) {
    if (resourceMap[subModuleId]) {
      conflict(subModuleId, moduleId, true)
    } else {
      asyncDeps.push(subModuleId)
      parseDepTree(subModuleId, moduleId, true)
    }
  })
}

exports.parse = parse
exports.setConfig = setConfig
exports.setResourceMap = setResourceMap
exports.setVinylFiles = setVinylFiles
