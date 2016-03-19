'use strict'

exports.get = function () {
  return module.uri
}

var b = require('./b')

b.get()
