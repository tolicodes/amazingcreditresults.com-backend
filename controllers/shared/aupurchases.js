var ensureRole = require('./../../lib/middleware.js').ensureRole;
var utilities = require('../../lib/utilities');
var _ = require('underscore');

var fields = [
  'product', 'seller', 'totalAus', 'currentAus',
  'statementDate', 'dateOpen', 'creditLimit', 'usedAus', 'cashLimit',
  'ncRating', 'bcRating', 'moRating',  'currentBalance', 'cost',
  'price', 'balance', 'notes', 'tier', 'active'
];

var editableFields = _(fields).chain().clone().without('product', 'seller').value();

module.exports = exports = function(core) {
  core.app.get('/api/v1/auPurchases', ensureRole(['owner', 'buyer', 'seller']), function (req, res) {
  });

  core.app.put('/api/v1/auPurchases/:id', ensureRole('owner'), function (req, res) {
  });
};