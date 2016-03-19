'use strict'

/* globals $ */

require('./style/')

var tpl = require('./tpl/')

var json = require('json/')

$.append(tpl({test: json.test}))

require.async('./a', function (a) {
  console.log(a.get())
})

