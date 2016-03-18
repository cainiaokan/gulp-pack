'use strict'

exports.get = function () {
  return module.uri
}

var c = require('./c')

c.get()
