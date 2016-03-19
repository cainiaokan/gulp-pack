'use strict'

exports.get = function () {
  return module.uri
}

require.async('./c', function (c) {
  console.log(c.get())
})

var c = require('./c')
c.get()
