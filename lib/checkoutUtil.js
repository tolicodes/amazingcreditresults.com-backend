var _ = require('underscore'),
    async = require('async');

module.exports = (function() {
  var tradelines = [],
      properTradeLineIds = [],
      toPay = 0,
      sumCost = 0,
      paymentTransactionId;

  var checkUserVerified = function(user, cb) {
    var err = [];
    if (user.profile.evsVerified !== true) {
      err.push({
        'code': 400,
        'message': 'SSN, First Name, Last Name, or DOB not verified'
      });
    }
    if (user.profile.phoneVerified !== true) {
      err.push({
        'code': 400,
        'message': 'Phone not verified'
      });
    }
    if (err.length > 0) {
      cb({
        'status': 'Error',
        'errors': err
      });
    } else {
      cb(null);
    }
  };

  var checkTradelineAvailabilityAndSumCost = function(user, model, cb) {
    if (!user.profile.cart || user.profile.cart.length === 0) {
      cb({
        'status': 'Error',
        'errors': [
          {
            'code': 400,
            'message': 'Your cart is empty, please add at least one tradeline before checkout'
          }
        ]
      });
    } else {
      var unavailableTradelines = [];
      sumCost = 0;

      async.each(_.keys(user.profile.cart), function (tradeline, c) {
        model.TradeLine.findById(tradeline)
            .populate('product')
            .exec(function (error, tradelineFound) {
              if (error) {
                c(error);
              } else {
                if (tradelineFound.usedAus >= tradelineFound.totalAus) {
                  tradeErr = {
                    code: 400,
                    field: 'usedAus',
                    name: tradelineFound.product.bank + ' ' + tradelineFound.product.type + ' ' + tradelineFound.product.name,
                    productId: tradelineFound.product._id,
                    id: tradelineFound.id
                  };
                  tradeErr.message = 'Trade line in your cart "' + tradeErr.name + '" no longer available.';
                  unavailableTradelines.push(tradeErr);
                } else {
                  //https://oselot.atlassian.net/wiki/display/ACR/Inventory+Table+Requirements
                  sumCost = sumCost + tradelineFound.cost;
                  properTradeLineIds.push(tradelineFound.id);
                  tradelines.push(tradelineFound);
                }
                c();
              }
            });
      }, function () {
        // If any tradelines in cart unavailable, error out
        if (unavailableTradelines.length !== 0) {
          cb({
            'status': 'Error',
            'code': 400,
            'errors': unavailableTradelines
          });
        } else {
          cb(null, sumCost);
        }
      });
    }
  };

  var calculateCurrentBalance = function(user, model, cb) {
    model.Transaction
        .find({'client': user.id})
        .exec(function (error, transactions) {
          if (error) {
            cb(error);
          } else {
            var balance = 0;
            transactions.map(function (t) {
              balance = balance + t.amount;
            });
            cb(null, balance);
          }
        });
  };

  // Issue Transaction if Buyer can afford it
  var issueTransaction = function(user, model, obj, cb) {
    console.log('=====USER BALANCE=======');
    console.log(obj);
    if (obj.cost <= obj.balance) {
      //Buyer can afford the packages we issue new transaction for it
      model.Transaction.create({
        'client': user.id,
        'amount': obj.cost,
        'type': 'checkout',
        'tradeLinesBought': properTradeLineIds
      }, function (error, tCreated) {
        if (error) {
          cb(error);
        } else {
          paymentTransactionId = tCreated.id;
          cb(null, paymentTransactionId);
        }
      });
    } else {
      //Buyer can't afford the packages
      toPay = obj.cost - obj.balance;
      cb({
        'needToPay': toPay,
        'status': 'Error',
        'errors': [
          {
            'code': 402,
            'message': 'Insufficient balance for this transaction'
          }
        ]
      });
    }
  };

  var processCharge = function(user, cb){
    cb();
  };

  var updateTradelineBuyers = function(user, model, transactionId, cb) {
    if (transactionId) {
      //for every good Tradeline in cart set the userdAus ++, and add userId in buyers
      async.each(properTradeLineIds,
          function (id, c) {
            model.TradeLine.findOneAndUpdate(
                {
                  '_id': id
                },
                {
                  '$inc': {'usedAus': 1},
                  '$push': {'buyers': user._id}
                },
                c
            );
          },
          function (error) {
            if (error) {
              cb(error);
            } else {
              //flush up cart from user profile
              user.profile = user.profile || {};
              user.profile.cart = {};
              //save user profile
              user.save(function (err) {
                cb(err, transactionId);
              });
            }
          });
    } else {
      cb(null, transactionId);
    }
  };

  var confirmCheckout = function(user) {
    user.notifyByEmail({
      'layout': false,
      'template': 'emails/checkoutBuyer',
      'subject': 'Checkout confirmation',
      'tradeLinesInCart': tradelines,
      'total': sumCost,
      'user': user,
      'date': new Date()
    });
  };

  return {
    calculateCurrentBalance: calculateCurrentBalance,
    checkUserVerified: checkUserVerified,
    checkTradelineAvailabilityAndSumCost: checkTradelineAvailabilityAndSumCost,
    confirmCheckout: confirmCheckout,
    issueTransaction: issueTransaction,
    processCharge: processCharge,
    updateTradelineBuyers: updateTradelineBuyers
  };
})();