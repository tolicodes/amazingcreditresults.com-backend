function reverse(string) {
  return string.toString().split('').reverse().join('')
};

// Formatted value of one thousand dollars should look like '$1,000'
exports.formatMoney = function (price) {
  return '$' + reverse(reverse(price).replace(/(\d{3}(?!$))/g, "$1,"));
};


