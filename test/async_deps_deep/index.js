'use strict'

require.async('./a', function (a) {
  console.log(a.get())
})
