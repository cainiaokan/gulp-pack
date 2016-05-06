var _ = require('underscore')
var fs = require('fs')
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

function getModuleId (file, pathname) {
  var moduleId = pathname
  var extname = path.extname(moduleId)

  if (pathname.charAt(0) === '/') {
    moduleId = pathname.substring(1)
  } else if (pathname.charAt(0) === '.') {
    moduleId = path.join(path.dirname(file.relative), pathname)
  } else {
    // not support core module and node_modules
    // therefore it's identical to a path starts with a '/' here
  }

  if (!extname) {
    try {
      // check if it is a directory. not support package.json
      if (fs.statSync(path.resolve(file.base, moduleId)).isDirectory()) {
        moduleId += '/index'
      }
    } catch (ex) {}
    moduleId = path.normalize(moduleId)
    if (process.platform === 'win32') {
      moduleId = moduleId.replace(/\\+/g, '/')
    }
    if (vinylFiles[moduleId + '.js']) {
      moduleId += '.js'
    } else if (vinylFiles[moduleId + '.json']) {
      moduleId += '.json'
    } else if (vinylFiles[moduleId + '.css']) {
      moduleId += '.css'
    } else if (vinylFiles[moduleId + '.tpl']) {
      moduleId += '.tpl'
    } else if (vinylFiles[moduleId + '.tmpl']) {
      moduleId += '.tmpl'
    } else {
      throw new PluginError(PLUGIN_NAME, 'Can\'t find any module match the path \'' + pathname + '\'')
    }
  }

  moduleId = path.normalize(moduleId)

  if (process.platform === 'win32') {
    moduleId = moduleId.replace(/\\+/g, '/')
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
    .replace(reReq, function (__, isAsync, delimiter, path) {
      var moduleId = getModuleId(vinylFile, path)
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
  var parent = resourceMap[parentModuleId]
  var circular = [moduleId]

  while (parent && parentModuleId) {
    circular.push(parentModuleId)
    if (parentModuleId === moduleId) {
      return circular.reverse()
    } else {
      parent = resourceMap[parentModuleId]
      parentModuleId = parent.parentModuleId
    }
  }

  return null
}

function findBelongingEntryId (moduleId) {
  var module = resourceMap[moduleId]
  while (module && !module.isEntry) {
    moduleId = module.parentModuleId
    module = resourceMap[moduleId]
  }
  return moduleId
}

function findCommonAncestorId (moduleId1, moduleId2) {
  var array1 = []
  var array2 = []
  var module1 = resourceMap[moduleId1]
  var module2 = resourceMap[moduleId2]
  var commonAncestorId = null

  while (true) {
    if (!module1) break
    array1.push(moduleId1)
    moduleId1 = module1.parentModuleId
    module1 = resourceMap[moduleId1]
  }

  while (true) {
    if (!module2) break
    array2.push(moduleId2)
    moduleId2 = module2.parentModuleId
    module2 = resourceMap[moduleId2]
  }

  commonAncestorId = _.intersection(array1, array2)[0]

  return commonAncestorId || null
}

function findCommonAncestorEntryId (moduleId1, moduleId2) {
  return findBelongingEntryId(findCommonAncestorId(moduleId1, moduleId2))
}

function conflict (moduleId, parentModuleId, isEntry) {
  var module = resourceMap[moduleId]
  if (module.isEntry && module.parentModuleId === null) {
    throw new PluginError(PLUGIN_NAME, 'Can\'t depend on main entry.')
  }

  var circular = getCircularDep(moduleId, parentModuleId)
  if (circular !== null) {
    throw new PluginError(PLUGIN_NAME, 'Circular dependency occurs：[' + circular.join('->') + '], please check your code.')
  }

  var oldParentId = module.parentModuleId
  var newParentId = parentModuleId
  var oldParent = resourceMap[oldParentId]
  var newParent = resourceMap[newParentId]
  var oldBelongingEntryId = findBelongingEntryId(oldParentId)
  var newBelongingEntryId = findBelongingEntryId(newParentId)
  var commonAncestorEntryId = null
  var commonAncestorEntry = null
  // if the module is required in a same entrypoint twice
  if (oldBelongingEntryId === newBelongingEntryId) {
    if (isEntry) {
      if (!module.isEntry) {
        if (!config.silent) {
          gutil.log('Dependency conflict occurs："' + moduleId + '" has been declared as a synchronized dependency of "' + oldParentId + '", therefore it can\'t be declared as an asynchronized dependency of "' + newParentId + '".')
        }
      } else {
        // ignore the duplicate require
      }
      return
    } else {
      if (!module.isEntry) {
        // ignore the duplicate require
      } else {
        // remove the asynchronized dep
        oldParent.asyncDeps = _.without(oldParent.asyncDeps, moduleId)
        // add synchronized dep to current parent module.
        newParent.deps.push(moduleId)
        if (!config.silent) {
          gutil.log('Dependency conflict occurs："' + moduleId + '" has been declared as a synchronized dependency of "' + newParentId + '", therefore it can\'t be declared as an asynchronized dependency of "' + oldParentId + '".')
        }
      }
      return
    }
  }

  commonAncestorEntryId = findCommonAncestorEntryId(oldParentId, newParentId)
  commonAncestorEntry = resourceMap[commonAncestorEntryId]

  // ignore the conflict if there're no common parent dependency between them.
  if (!commonAncestorEntryId) {
    if (isEntry) {
      newParent.asyncDeps.push(moduleId)
    } else {
      newParent.deps.push(moduleId)
    }
    module.parentModuleId = newParentId
    return
  }

  if (!module.isEntry && commonAncestorEntryId === oldParentId) {
    return
  }

  // get rid of this module from its current parent module.
  if (module.isEntry) {
    oldParent.asyncDeps = _.without(oldParent.asyncDeps, moduleId)
  } else {
    oldParent.deps = _.without(oldParent.deps, moduleId)
  }

  // transform the module into a synchronized dep.
  module.isEntry = false
  module.parentModuleId = commonAncestorEntryId

  // reset the module as a synchronized module of the common parent.
  commonAncestorEntry.deps.push(moduleId)
  if (!config.silent) {
    gutil.log('Dependency conflict occurs："' + moduleId + '" is required to be promoted as "' + commonAncestorEntryId + '"\'s synchronized dependency.')
  }
}

function parse (moduleId) {
  parseDepTree(moduleId, null, true)
}

function parseDepTree (moduleId, parentModuleId, isEntry) {
  var vinylFile = vinylFiles[moduleId]
  var extname = path.extname(moduleId)
  var shim = config.shim[moduleId]
  var module = {
    isEntry: isEntry,
    deps: [],
    asyncDeps: [],
    parentModuleId: parentModuleId
  }
  var deps = module.deps
  var asyncDeps = module.asyncDeps
  var filepaths

  if (!vinylFile) {
    throw new PluginError(PLUGIN_NAME, 'Can\'t find the module \'' + moduleId + '\'.')
  }

  if (shim) {
    module.shim = true
    module.exports = typeof shim === 'string' ? shim : shim.exports
  }

  resourceMap[moduleId] = module

  if (extname === '.js') {
    filepaths = extractPath(vinylFile)
    if (!isEntry) module.combined = true
  } else {
    module.combined = true
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
