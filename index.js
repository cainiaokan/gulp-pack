'use strict';

var depsParser       = require('./dependencyParser');
var gutil            = require('gulp-util');
var minimatch        = require('minimatch');
var path             = require('path');
var fs               = require('fs');
var os               = require('os');
var _                = require('lodash');
var through          = require('through2');

var defaultCfg       = {
  baseUrl    : './',
  shim       : {},
  genResDeps : false,
  entries    : 'app/**/index.js'
};

var vinylFiles;
var resourceMap;
var config                 = {};
var MODULAR_FILE           = './lib/modular.js';
var MODULAR_ASYNC_FILE     = './lib/modular_async.js';
var modularjs              = fs.readFileSync(MODULAR_FILE, {encoding: 'utf-8'});
var modularjs_async        = fs.readFileSync(MODULAR_ASYNC_FILE, {encoding: 'utf-8'});

function writeBundle(moduleId) {
  var vinylFile = vinylFiles[moduleId];
  vinylFile.contents = new Buffer(writeDeps(moduleId));
}

function writeDeps(moduleId) {
  var res       = resourceMap[moduleId];
  var contents  = '';

  res.deps.forEach(function(moduleId){
    contents += writeDeps(resourceMap[moduleId].moduleId);
  });
  //write asynchronized entry.
  res.asyncDeps.forEach(function(moduleId){
    writeBundle(resourceMap[moduleId].moduleId);
  });
  contents += wrapModuleDef(moduleId);

  //if main entrypoint, add module manage snippet in front of it.
  if(res.isEntry && res.parentModuleId === null) {
    contents = (res.asyncDeps.length ? modularjs_async : modularjs) + 
      os.EOL + writeJsConfig() + contents;
    //insert require
    contents += os.EOL + 'require(\'' + moduleId + '\');' + os.EOL;
  }
  return contents;
}

function writeJsConfig() {
  return 'require.config(' +
    JSON.stringify({
      baseUrl : config.baseUrl
    }, null, 2) +
    ');';
}

function wrapModuleDef(moduleId){
  var vinylFile    = vinylFiles[moduleId];
  var res          = resourceMap[moduleId];
  var extname      = path.extname(moduleId);
  var fileContents = vinylFile.contents.toString();
  var contents     = '';
  var EOL          = os.EOL;

  contents += EOL + 
    'define(\'' + moduleId + '\', function(require, exports, module){';
  
  if(extname === '.js') {
    contents += EOL + fileContents;
  } else if(extname === '.css') {
    fileContents = fileContents.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
    contents += EOL +'var style = document.createElement("style");' + 
                EOL +'var contents = \'' + fileContents + '\';' +
                EOL +'style.type = "text/css";' +
                EOL +'if (style.styleSheet) {' + 
                EOL +' style.styleSheet.cssText = contents;' +
                EOL +'} else {' +
                EOL +' style.innerHTML = contents;' +
                EOL +'}' + 
                EOL +'document.getElementsByTagName("head")[0].appendChild(style);';
  } else if(extname === '.json') {
    contents += EOL + 'return ' + fileContents + ';';
  } else if(extname === '.tpl') {
    contents += EOL + 'return _.template(\'' + fileContents.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/>\s+?</g, '><').replace(/\r?\n/g, '\\n') + '\');';
  } else {
    throw Error('Unknow file type: ' + vinylFiles.path);
  }

  if(res.shim && res.exports) {
    contents += EOL + 'module.exports = ' + res.exports + ';';
  }

  contents += EOL + '});' + EOL;

  return contents;
}

function newCopy(file) {
  var copy = new gutil.File({
    base: file.base,
    cwd : file.cwd,
    path: file.path
  });
  copy.contents = new Buffer(file.contents);
  return copy;
}

module.exports = function pack(conf){

  resourceMap = {};
  vinylFiles = {};
  config = _.defaults(config, conf, defaultCfg);

  depsParser.setVinylFiles(vinylFiles);
  depsParser.setConfig(config);
  depsParser.setResourceMap(resourceMap);

  var stream = through.obj(function(file, encoding, callback){    
    var moduleId = file.relative;

    if (file.isStream()) {
      cb(new gutil.PluginError('pack', 'Streaming not supported'));
      return;
    }

    if(process.platform === 'win32') {
      moduleId = moduleId.replace(/\\+/g, '/');
    }

    vinylFiles[moduleId] = newCopy(file);

    callback();

  }, function(callback) {

    Object.keys(vinylFiles).forEach(function(moduleId){
      if(minimatch(moduleId, config.entries)){
        try {
          depsParser.parse(moduleId);
          writeBundle(moduleId);
        } catch(ex) {
          callback(new gutil.PluginError('pack', ex));
        }
      }
    });

    Object.keys(vinylFiles).forEach(function(moduleId){
      var res = resourceMap[moduleId];
      if(!res) {
        stream.push(vinylFiles[moduleId]);
      } else if(!res.combined) {
        stream.push(vinylFiles[moduleId]);
      }
    });

    if(config.genResDeps) {
      var resourcesJson = new gutil.File({
        path: 'resource_deps.json'
      });
      resourcesJson.contents = new Buffer(JSON.stringify(resourceMap, null, 2));
      stream.push(resourcesJson);      
    }

    callback();
  });
  
  return stream;
};