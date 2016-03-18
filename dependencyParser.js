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

function findBelongingEntry (resource) {
  while (resource && !resource.isEntry) {
    resource = resourceMap[resource.parentModuleId]
  }
  return resource
}

function findCommonAncestor (res1, res2) {
  var array1 = []
  var array2 = []
  var commonAncestorId = null

  while (true) {
    if (!res1) break
    array1.push(res1.moduleId)
    res1 = resourceMap[res1.parentModuleId]
  }

  while (true) {
    if (!res2) break
    array2.push(res2.moduleId)
    res2 = resourceMap[res2.parentModuleId]
  }

  commonAncestorId = _.intersection(array1, array2)[0]

  return resourceMap[commonAncestorId] || null
}

function findCommonAncestorEntry (res1, res2) {
  return findBelongingEntry(findCommonAncestor(res1, res2))
}

function conflict (moduleId, parentModuleId, isEntry) {
  var resource = resourceMap[moduleId]
  if (resource.isEntry && resource.parentModuleId === null) {
    throw new PluginError(PLUGIN_NAME, 'Can\'t depend on main entry.')
  }

  var circular = getCircularDep(moduleId, parentModuleId)
  if (circular !== null) {
    throw new PluginError(PLUGIN_NAME, 'Circular dependency occurs：[' + circular.join('->') + '], please check your code.')
  }

  var oldParent = resourceMap[resource.parentModuleId]
  var newParent = resourceMap[parentModuleId]
  var oldBelongingEntry = findBelongingEntry(oldParent)
  var newBelongingEntry = findBelongingEntry(newParent)
  var commonAncestorEntry = null
  // if the module is required in a same entrypoint twice
  if (oldBelongingEntry === newBelongingEntry) {
    if (isEntry) {
      if (!resource.isEntry) {
        if (!config.silent) {
          gutil.log('Dependency conflict occurs："' + moduleId + '" has been declared as a synchronized dependency of "' + oldParent.moduleId + '", therefore it can\'t be declared as an asynchronized dependency of "' + parentModuleId + '".')
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
        _.remove(oldParent.asyncDeps, function (id) {
          return moduleId === id
        })
        // add synchronized dep to current parent module.
        newParent.deps.push(moduleId)
        if (!config.silent) {
          gutil.log('Dependency conflict occurs："' + moduleId + '" has been declared as a synchronized dependency of "' + parentModuleId + '", therefore it can\'t be declared as an asynchronized dependency of "' + oldParent.moduleId + '".')
        }
      }
      return
    }
  }

  commonAncestorEntry = findCommonAncestorEntry(oldParent, newParent)
  // ignore the conflict if there're no common parent dependency between them.
  if (!commonAncestorEntry) {
    if (isEntry) {
      resourceMap[parentModuleId].asyncDeps.push(moduleId)
    } else {
      resourceMap[parentModuleId].deps.push(moduleId)
    }
    resource.parentModuleId = parentModuleId
    return
  }

  if (!resource.isEntry && commonAncestorEntry === oldParent) {
    return
  }

  // get rid of this module from its current parent module.
  _.remove(resource.isEntry ? oldParent.asyncDeps : oldParent.deps, function (fp) {
    return moduleId === fp
  })

  // transform the module into a synchronized dep.
  resource.isEntry = false
  resource.parentModuleId = commonAncestorEntry.moduleId

  // reset the module as a synchronized module of the common parent.
  commonAncestorEntry.deps.push(moduleId)
  if (!config.silent) {
    gutil.log('Dependency conflict occurs："' + moduleId + '" is required to be promoted as "' + commonAncestorEntry.moduleId + '"\'s synchronized dependency.')
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
    throw new PluginError(PLUGIN_NAME, 'Can\'t find the module \'' + moduleId + '\'.')
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
