/*
 * Welcome string generator
 */

var crypto = require('crypto');

module.exports = exports = function () {
  var buffer = crypto.randomBytes(26),
    i,
    ans='';

  for (i = 0; i < buffer.length; i++) {
    var c = buffer[i];
    var c2 = Math.floor(c / 10.24);
    var c3 = c2 + 97;
    ans = ans + String.fromCharCode(c3);
  }
  return ans;
};
