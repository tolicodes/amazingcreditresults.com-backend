// Formatted value of one thousand dollars should look like '$1,000'
exports.formatMoney = function (price) {
  return '$' + reverse(reverse(price).replace(/(\d{3}(?!$))/g, "$1,"));
};


exports.error = function error(code, message, response) {
  response.status(code);
  response.json({
    'status': 'Error',
    'errors': [
      {
        'code': code,
        'message': message
      }
    ]
  });
};

function reverse(string) {
  return string.toString().split('').reverse().join('')
}
