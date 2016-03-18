'use strict'

exports.get = function () {
  return module.uri
}

var a = require('./a')
var c = require('./c')

a.get()
c.get()
