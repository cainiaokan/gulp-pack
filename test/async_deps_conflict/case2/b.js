'use strict'

exports.get = function () {
  return module.uri
}

require('./c').get()
