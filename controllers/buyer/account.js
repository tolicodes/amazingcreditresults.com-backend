var ensureRole = require('./../../lib/middleware.js').ensureRole;

module.exports = exports = function (core) {
  //show current user balance
  //https://oselot.atlassian.net/browse/ACR-387#
  core.app.get('/api/v1/account', ensureRole('buyer'), function(request, response) {
    request.model.Transaction.find({
      'client': request.user._id
    })
      .sort('+timestamp')
      .exec(function(error, transactionsFound) {
        if (error) {
          throw error;
        } else {
          var balance = 0,
            transactionsFormatted = [];
          transactionsFound.map(function(t) {
            transactionsFormatted.push({
              'id': t.id,
              'timestamp': t.timestamp,
              'amount': t.amount,
              'type': t.type
            });
            balance = balance + t.amount;
          });

          response.json({
            'data': {
              'balance': balance,
              'transactions': transactionsFormatted
            }
          });
        }
      });

  });
};
