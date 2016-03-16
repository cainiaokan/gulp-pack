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

  function nextTick (func) {
    return setTimeout(func, 0)
  }

  function isAbsolute (url) {
    return url.indexOf('://') > 0 || url.indexOf('//') === 0
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

  function loadScript (url, callback) {
    var doc = document
    var head = doc.getElementsByTagName('head')[0]
    var node = doc.createElement('script')
    var done = false
    var timer = setTimeout(function () {
      head.removeChild(node)
      callback(new Error('Load timeout'))
    }, 30000) // 30s
    node.setAttribute('type', 'text/javascript')
    node.setAttribute('charset', 'utf-8')
    node.setAttribute('src', url)
    node.setAttribute('async', true)
    node.onload = node.onreadystatechange = function () {
      if (!done &&
          (!this.readyState ||
            this.readyState === 'loaded' ||
            this.readyState === 'complete')
        ) {
        done = true
        clearTimeout(timer)
        node.onload = node.onreadystatechange = null
        callback()
      }
    }

    node.onerror = function () {
      clearTimeout(timer)
      head.removeChild(node)
      throw new Error('Load Fail')
    }
    head.appendChild(node)
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

  req.async = function (id, callback) {
    var module
    try {
      module = callDep(id)
      nextTick(function () {
        callback(module)
      })
    } catch (ex) {
      loadScript(req.toUri(id), function () {
        callback(callDep(id))
      })
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
