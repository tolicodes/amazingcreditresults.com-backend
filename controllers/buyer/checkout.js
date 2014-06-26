var ensureBuyerOrOwner = require('../../lib/middleware.js').ensureBuyerOrOwner,
  formatter = require('../formatter');

module.exports = exports = function (core) {
  core.app.post('/api/v1/cart/checkout', ensureBuyerOrOwner, function (request, response) {
    var tradelineIds = request.user.profile ? (Object.keys(request.user.profile.cart || {})) : [];
    core.async.waterfall(
      [
        function (cb) {
          core.async.parallel({
            'balance': function (c) {
//calculate the current user balance
              request.model.Transaction
                .find({'client': request.user.id})
                .exec(function (error, transactions) {
                  if (error) {
                    c(error);
                  } else {
                    var balance = 0;
                    transactions.map(function (t) {
                      balance = balance + t.amount;
                    });
                    c(null, balance);
                  }
                });
            },
            'cost': function (c) {
//calculate the cost of all tradelines Buyer want to buyer
              var sumCost = 0;
              core.async.map(tradelineIds,
                function (tradelineId, cc) {
                  request.model.TradeLine.findById(tradelineId, function (error, tradeLineFound) {
                    if (error) {
                      cc(error);
                    } else {
                      sumCost = sumCost + tradeLineFound.cost; //https://oselot.atlassian.net/wiki/display/ACR/Inventory+Table+Requirements
                      cc(null);
                    }
                  });
                },
                function (error) {
                  if (error) {
                    c(error);
                  } else {
                    c(null, sumCost);
                  }
                });
            }
          }, cb);
        },
        function (obj, cb) {
//decide what to do
          if (obj.cost <= obj.balance) {
//Buyer can affort the packages
//we issue new transaction for it
            request.model.Transaction.create({
              'client': request.user.id,
              'amount': obj.cost,
              'type': 'checkout',
              'tradelinesBought': tradelineIds
            }, function (error) {
              if (error) {
                cb(error);
              } else {
                cb(null, true);
              }
            });
          } else {
//Buyer can't affort the packages
            response.status(402); //http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html
            response.json({
              'needToPay': (obj.cost - obj.balance),
              'status': 'Error',
              'errors': [
                {
                  'code': 402,
                  'message': 'Insufficient balance! Payment required!'
                }
              ]
            });
            cb(null, false);
          }
        },
        function (transactionIssued, cb) {
          if (transactionIssued) {
            //todo
            cb();
          } else {
            cb(null);
          }
        }
      ],
      function (error) {
        if (error) {
          throw error;
        } else {
          response.send('ok');
        }
      }
    );
  });
};
