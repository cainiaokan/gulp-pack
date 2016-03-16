/* global $, alert*/
'use stirct'

require('common/style/common.css')

var util = require('common/script/util')
var message = require('./message')
var timeTpl = require('./time.tpl')

$('body').append(timeTpl({time: util.getTime()}))

alert(message.getMessage())

