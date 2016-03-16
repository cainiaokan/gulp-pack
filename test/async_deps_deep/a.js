'use strict'

exports.get = function () {
  return module.uri
}

require.async('./b', function (b) {
  console.log(b.get())
})

require.async('./c', function (c) {
  console.log(c.get())
})
