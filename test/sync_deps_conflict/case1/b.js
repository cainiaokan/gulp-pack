'use strict'

exports.get = function () {
  return module.uri
}

require.async('./c', function (c) {
  c.get()
})
