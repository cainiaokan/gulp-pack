'use strict'

exports.get = function () {
  return module.uri
}

var d = require('./d')

d.get()

