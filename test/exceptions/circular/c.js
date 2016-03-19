'use strict'

exports.get = function () {
  return module.uri
}

var a = require('./a')

a.get()
