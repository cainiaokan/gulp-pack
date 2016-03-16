'use strict'

// get time string
exports.getTime = function () {
  var now = new Date()
  var year = now.getFullYear()
  var month = now.getMonth() + 1
  var day = now.getDate()
  return year +
    (month < 10 ? month : 0 + month) +
    (day < 10 ? day : 0 + day)
}

