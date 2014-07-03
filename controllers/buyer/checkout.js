var ensureBuyerOrOwner = require('../../lib/middleware.js').ensureBuyerOrOwner,
  formatter = require('../formatter');

module.exports = exports = function (core) {
  core.app.post('/api/v1/cart/checkout', ensureBuyerOrOwner, function (request, response) {
    var tradelineIds = request.user.profile ? (Object.keys(request.user.profile.cart || {})) : [],
      tradelines = [],
      properTradeLineIds = [],
      toPay = 0,
      sumCost = 0,
      paymentTransactionId;

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
//also drop non active transactiosn, and with

              core.async.map(tradelineIds,
                function (tradeLineId, cc) {
                  request.model.TradeLine.findById(tradeLineId)
                    .populate('product')
                    .exec(function (error, tradeLineFound) {
                      if (error) {
                        cc(error);
                      } else {
                        if ((tradeLineFound.totalAus - tradeLineFound.usedAus) > 0 && tradeLineFound.active) {
//https://oselot.atlassian.net/wiki/display/ACR/Inventory+Table+Requirements
                          sumCost = sumCost + tradeLineFound.cost;
                          properTradeLineIds.push(tradeLineFound.id);
                          tradelines.push(tradeLineFound);
                        }
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
//Buyer can affort the packages we issue new transaction for it
            request.model.Transaction.create({
              'client': request.user.id,
              'amount': obj.cost,
              'type': 'checkout',
              'tradeLinesBought': properTradeLineIds
            }, function (error, tCreated) {
              if (error) {
                cb(error);
              } else {
                paymentTransactionId = tCreated[0].id; //todo - test it!!!
                cb(null, true);
              }
            });
          } else {
//Buyer can't affort the packages
            toPay = obj.cost - obj.balance;
            cb(null, false);
          }
        },
        function (transactionIssued, cb) {
          if (transactionIssued) {
//for every good Tradeline in cart set the userdAus ++, and add userId in buyers
            core.async.each(properTradeLineIds,
              function (id, c) {
                request.model.TradeLine.findOneAndUpdate(
                  {
                    '_id': id
                  },
                  {
                    '$inc': {'usedAus': 1},
                    '$push': {'buyers': request.user._id}
                  },
                  c
                );
              },
              function (error) {
                if (error) {
                  cb(error);
                } else {
//flush up cart from user profile
                  request.user.profile.cart = {};
//save user profile
                  request.user.save(function (err) {
                    cb(err, true);
                  });
                }
              });
          } else {
            cb(null, null);
          }
        }
      ],
      function (error, checkoutIsDone) {
        if (error) {
          throw error;
        } else {
          if (checkoutIsDone) {
            response.status(201);
            response.json({
              'status': 'Ok',
              'transactionId': paymentTransactionId
            });
            request.user.notifyByEmail({
              'layout': false,
              'template': 'emails/checkoutBuyer',
              'subject': 'Checkout confirmation',
              'tradeLinesInCart': tradelines,
              'total': sumCost,
              'user': request.user,
              'date': new Date()
            });
          } else {
            response.status(402); //http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html
            response.json({
              'needToPay': toPay,
              'status': 'Error',
              'errors': [
                {
                  'code': 402,
                  'message': 'Insufficient balance! Payment required!'
                }
              ]
            });
          }
        }
      }
    );
  });
};
