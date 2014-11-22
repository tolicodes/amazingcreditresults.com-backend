var ensureBuyerOrOwner = require('../../lib/middleware.js').ensureBuyerOrOwner,
    async = require('async');

var Checkout = (function() {
    var tradelineIds,
      tradelines = [],
      properTradeLineIds = [],
      toPay = 0,
      paymentTransactionId;

    var calculateCurrentBalance = function(request, cb) {
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
            cb(null, balance);
          }
        });
    };

    var calculateSingleTradeline = function(request, tradeLineId, cb) {
      request.model.TradeLine.findById(tradeLineId)
        .populate('product')
        .exec(function (error, tradeLineFound) {
          if (error) {
            cb(error);
          } else {
            if ((tradeLineFound.totalAus - tradeLineFound.usedAus) > 0 && tradeLineFound.active) {
              //https://oselot.atlassian.net/wiki/display/ACR/Inventory+Table+Requirements
              sumCost = sumCost + tradeLineFound.cost;
              properTradeLineIds.push(tradeLineFound.id);
              tradelines.push(tradeLineFound);
            }
            cb(null);
          }
        });
    };

    var calculateCostOfTradelines = function(request, cb) {
      sumCost = 0;
      tradelineIds = request.user.profile ? (Object.keys(request.user.profile.cart || {})) : [],
      async.map(tradelineIds,
        function (tradeLineId, cc) {
          calculateSingleTradeline(request, tradeLineId, cc);
        },
        function (error) {
          if (error) {
            cb(error);
          } else {
            cb(null, sumCost);
          }
        });
    };

    // Issue Transaction if Buyer can afford it
    var issueTransaction = function(request, obj, cb) {
      console.log('=====OBJ=======');
      console.log(obj);
      if (obj.cost <= obj.balance) {
        //Buyer can afford the packages we issue new transaction for it
        request.model.Transaction.create({
          'client': request.user.id,
          'amount': obj.cost,
          'type': 'checkout',
          'tradeLinesBought': properTradeLineIds
        }, function (error, tCreated) {
          if (error) {
            cb(error);
          } else {
            paymentTransactionId = tCreated.id;
            cb(null, true);
          }
        });
      } else {
      //Buyer can't afford the packages
        toPay = obj.cost - obj.balance;
        cb(null, false);
      }
    };

    var updateTradelineBuyers = function(request, transactionIssued, cb) {
      if (transactionIssued) {
        //for every good Tradeline in cart set the userdAus ++, and add userId in buyers
        async.each(properTradeLineIds,
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
              request.user.profile = request.user.profile || {};
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
    };

    var confirmCheckout = function(request, response, error, checkoutIsDone) {
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
            'total': Checkout.getSumCost(),
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
    };

    return {
      calculateCurrentBalance: calculateCurrentBalance,
      calculateCostOfTradelines: calculateCostOfTradelines,
      confirmCheckout: confirmCheckout,
      issueTransaction: issueTransaction,
      updateTradelineBuyers: updateTradelineBuyers,
      getSumCost: function() {
        return sumCost;
      },
      getProperTradelineIds: function() {
        return properTradeLineIds;
      }
    };
})();



module.exports = exports = function (core) {
  core.app.post('/api/v1/cart/checkout', ensureBuyerOrOwner, function (request, response) {
    core.async.waterfall(
      [
        function (cb) {
          core.async.parallel({
            //calculate the current user balance
            'balance': function (c) {
              Checkout.calculateCurrentBalance(request, c);
            },
            //Calculate the cost of all tradelines Buyer want to purchase
            //also drop non active transactions, and with
            'cost': function (c) {
              Checkout.calculateCostOfTradelines(request, c);
            }
          }, cb);
        },
        function (obj, cb) {
          Checkout.issueTransaction(request, obj, cb);
        },
        function (transactionIssued, cb) {
          Checkout.updateTradelineBuyers(request, transactionIssued, cb);
        }
      ],
      function (error, checkoutIsDone) {
        Checkout.confirmCheckout(request, response, error, checkoutIsDone);
      }
    );
  });
};
