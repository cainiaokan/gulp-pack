var _                = require('lodash');
var fs               = require('fs');
var path             = require('path');
var util             = require('util');
var reReq            = /require\s*(\.async)?\s*\(\s*(["'])(.+?)\2/g;

var config, resourceMap, vinylFiles;

function setConfig(conf) {
  config = conf;
}

function setResourceMap(res) {
  resourceMap = res;
}

function setVinylFiles(files) {
  vinylFiles = files;
}

function extractPath(vinylFile){
  var filepaths    = {
    asyncRequire : [],
    syncRequire  : []
  };
  var fileContents = vinylFile.contents.toString();

  fileContents = fileContents
    .replace(reReq, function($0, $1, $2, $3){
      var moduleId = getModuleId(vinylFile, $3);
      if(!!$1) {
        filepaths.asyncRequire = filepaths.asyncRequire.concat(moduleId);
        return 'require.async(' + $2 + moduleId + $2;
      } else {
        filepaths.syncRequire = filepaths.syncRequire.concat(moduleId);
        return 'require(' + $2 + moduleId + $2;
      }
    });

  vinylFile.contents = new Buffer(fileContents);

  return filepaths;
}

function getModuleId(vinylFile, moduleId) {

  if(path.isAbsolute(moduleId)) {//the path starts with a '/'
    moduleId = path.normalize(moduleId).substring(1);
  } else if(moduleId.charAt(0) === '.') {
    moduleId = path.normalize(path.dirname(vinylFile.relative) + '/' + moduleId);
  } else {
    moduleId = path.normalize(moduleId);
  }

  if(process.platform === 'win32') {
    moduleId = moduleId.replace(/\\+/g, '/');
  }

  if(!path.extname(moduleId)) {
    moduleId += '.js';
  }

  return moduleId;
}

function getCircularDep(moduleId, parentModuleId){

  var parent;
  var circular = [moduleId];
  do {
    circular.push(parentModuleId);
    if(parentModuleId === moduleId)return circular.reverse();
  } while(
    !!(parent = resourceMap[parentModuleId]) && 
    (parentModuleId = parent.parentModuleId)
  );

  return null;
}

function findCommonParent(resource1, resource2){
  var array1       = [];
  var array2       = [];
  var commonParent = null;

  do {
    array1.push(resource1.moduleId);
    resource1 = resourceMap[resource1.parentModuleId];
  } while(resource1.parentModuleId !== null);

  array1.push(resource1.moduleId);

  do {
    array2.push(resource2.moduleId);
    resource2 = resourceMap[resource2.parentModuleId];
  } while(resource2.parentModuleId !== null);

  array2.push(resource2.moduleId);

  commonParent = _.intersection(array1, array2)[0];

  return commonParent;
}

function findBelongingEntry(resource) {
  while(resource && !resource.isEntry)
    resource = resourceMap[resource.parentModuleId];
  return resource;
}

function conflict(moduleId, parentModuleId, isEntry){

  if(!!(circular = getCircularDep(moduleId, parentModuleId))) {
    throw new Error('存在循环依赖：[' + circular.join('->') +' ]，请检查您的代码。');
  }

  var resource  = resourceMap[moduleId];
  var parent    = resourceMap[resource.parentModuleId];
  var curParent = resourceMap[parentModuleId];
  var entry     = findBelongingEntry(parent);
  var curEntry  = findBelongingEntry(curParent);
  var commonParent;
  var circular;

  //在同一个entry中寻找是否重复，同步依赖总是优先于异步依赖
  if(entry === curEntry) {
    if(isEntry) {//当前试图作为异步依赖项
      if(!resource.isEntry) {//如果之前已经作为了同步依赖项
        console.warn('Warning in plugin \'pack\'\n', 'Message:\n', '\t发生依赖冲突：模块' + moduleId + '已经在' + parent.moduleId + '中声明为同步依赖，因此不能再在' + parentModuleId + '中作为异步依赖项。');
      } else {
        //ignore the duplicate require
      }
      return;
    } else {//当前试图作为同步依赖项
      if(!resource.isEntry) {//忽略重复的同步模块
        //ignore the duplicate require
      } else {
        //移除异步依赖
        _.remove(parent.asyncDeps, function(fp){
          return moduleId === fp;
        });
        //向当前父模块中添加同步依赖
        curParent.deps.push(moduleId);
        console.warn('Warning in plugin \'pack\'\n', 'Message:\n', '\t发生依赖冲突：模块' + moduleId + '已经在' + parentModuleId + '中声明为同步依赖，因此不能再在' + parent.moduleId + '中作为异步依赖项。');
      }
      return;
    }
  }

  commonParent = findCommonParent(parent, curParent);

  //如果没有公共父依赖则忽略冲突
  if(!commonParent) {
    if(isEntry) {
      resourceMap[parentModuleId].asyncDeps.push(moduleId);
    } else {
      resourceMap[parentModuleId].deps.push(moduleId);
    }
    resource.parentModuleId = parentModuleId;
    return;
  } else {
    commonParent = resourceMap[commonParent];
  }

  //移除依赖
  _.remove(resource.isEntry ? parent.asyncDeps : parent.deps, function(fp){
    return moduleId === fp;
  });

  //对依赖关系进行降级（转变为同步依赖）
  resource.isEntry = false;
  resource.parentModuleId = commonParent.moduleId;
  commonParent.deps.push(moduleId);
  console.warn('Warning in plugin \'pack\'\n', 'Message:\n', '\t发生依赖冲突：模块' + moduleId + '需要提升为模块' + commonParent.moduleId + '的同步依赖项。');

}

function parse(moduleId){
  parseDepTree(moduleId, null, true);
}

function parseDepTree(moduleId, parentModuleId, isEntry){
  var vinylFile    = vinylFiles[moduleId];
  var extname      = path.extname(moduleId);
  var shim         = config.shim[moduleId];
  var resource     = {
    moduleId       : moduleId,
    isEntry        : isEntry,
    deps           : [],
    asyncDeps      : [],
    parentModuleId : parentModuleId
  };
  var deps         = resource.deps;
  var asyncDeps    = resource.asyncDeps;
  var filepaths;

  if(!vinylFile) {
    throw new Error('could\'t find file ' + moduleId);
  }
  
  if(shim) {
    resource.shim = true;
    resource.exports = shim.exports;
  }

  resourceMap[moduleId] = resource;

  if(extname === '.js') {
    filepaths = extractPath(vinylFile);
    if(!isEntry)resource.combined = true;
  } else {
    resource.combined = true;
    return;
  }

  filepaths.syncRequire.forEach(function(subModuleId){

    if(!!resourceMap[subModuleId]) {
      //解决冲突
      conflict(subModuleId, moduleId, false);
    } else {

      deps.push(subModuleId);

      parseDepTree(subModuleId, moduleId, false);

    }
  });

  filepaths.asyncRequire.forEach(function(subModuleId){

    if(!!resourceMap[subModuleId]) {
      conflict(subModuleId, moduleId, true);
    } else {

      asyncDeps.push(subModuleId);

      parseDepTree(subModuleId, moduleId, true);
    }
  });
}

exports.parse          = parse;
exports.setConfig      = setConfig;
exports.setResourceMap = setResourceMap;
exports.setVinylFiles  = setVinylFiles;