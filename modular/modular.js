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
