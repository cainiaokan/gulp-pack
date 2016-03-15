'use strict';

exports.get = function () {
  return module.uri;
}

require.async('./d', function (d) {
  console.log(d.get());
});