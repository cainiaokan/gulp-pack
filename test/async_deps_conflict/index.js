'use strict'

require.async('./a', function (a) {
  console.log(a.get())
})

require.async('./b', function (b) {
  console.log(b.get())
})
