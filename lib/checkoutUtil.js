var _ = require('underscore'),
    balanced = require('balanced-official'),
    moment = require('moment'),
    async = require('async');

module.exports = (function() {
  var tradelines = [],
      properTradeLineIds = [],
      sumCost = 0,
      paymentTransactionId;

  var createTransaction = function(user, model, args, cb) {
    var modelArgs = {
      'client': args.client || user.id,
      'amount': args.amount,
      'type': args.type,
      'fundingSource': args.fundingSource,
      'date': args.date || moment().format('YYYY-MM-DD'),
      'timestamp': args.timestamp|| moment().toDate(),
      'userCreated': args.userCreated || user.id,
      'tradeLinesBought': args.tradeLinesBought,
      'reason': args.reason
    };
    model.Transaction.create(modelArgs, function (error, tCreated) {
      paymentTransactionId = tCreated.id;
      cb(error, paymentTransactionId);
    });
  };

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

  // Issue Debit Transaction For User
  var issueTransaction = function(user, model, paymentInfo, cb) {
    //Buyer can afford the packages we issue new transaction for it
    var debitArgs = {
      'amount': paymentInfo.cart.cost * -1, // Negative because it is a debit
      'type': 'orderPlaced',
      'tradeLinesBought': properTradeLineIds // TODO get this variable differently
    };
    createTransaction(user, model, debitArgs, function(error, transactionId) {
      paymentInfo.orderTransactionId = transactionId;
      cb(error, paymentInfo);
    });

    // Removed because this validation is done elsewhere
    /*} else {
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
    */
  };

  var validateChargeValidity = function(user, body, cart) {
    var err = [];
    var acctCredit = body.amtAccountCredit || 0;
    if (acctCredit > cart.balance) {
      err.push({
        'code': 400,
        'message': 'Account credit specified is higher than what is available to your account'
      });
    }
    try {
      if ((acctCredit < cart.cost) && !(body.useAchAccount || body.creditCardToken)) {
        err.push({
          'code': 400,
          'message': 'Please specify an ACH account or credit card for payment'
        });
      }
      if (body.useAchAccount && body.creditCardToken) {
        err.push({
          'code': 400,
          'message': 'Please only choose one payment method, credit card or ACH account'
        });
      } else if (body.useAchAccount && user.profile.achAccount.verified === false) {
        err.push({
          'code': 402,
          'message': 'ACH Account not verified'
        });
      }
      if (err.length > 0) {
        return {
          'status': 'Error',
          'errors': err
        };
      } else {
        return null;
      }
    } catch(err) {
      console.error(err);
    }
  };

  var processCharge = function(user, body, model, cart, cb){
    var err = validateChargeValidity(user, body, cart);
    console.log(err);
    if (err) {
      cb(err);
    } else {
      try {
        var amtCredit = body.amtAccountCredit ? parseFloat(body.amtAccountCredit) : 0,
            chargeAmt = cart.cost - amtCredit;
        if (body.useAchAccount) {
          var bankAcct = balanced.get('/bank_accounts/' + user.profile.achAccount.id);
          balanced.get('/customers/' + user.profile.achAccount.customerId).orders.create({
            "description": "Cart Checkout for " + user.email
          }).debit_from(bankAcct, chargeAmt * 100) // convert chargeAmt from dollars to cents
          .then(function (debit) {
            var transactionInfo = {
              'amount': chargeAmt,
              'type': 'achCharge',
              'fundingSource': debit.id,
              'reason': 'Charge for Tradeline Checkout'
            };
            createTransaction(user, model, transactionInfo, function(error, transactionId) {
              cb(error, {
                charged: chargeAmt,
                amtCredit: amtCredit,
                cart: cart,
                achDebitId: debit.id,
                chargeTransactionId: transactionId
              });
            });

          }, function(err){
            cb(err);
          });
        } else if (body.creditCardToken) {

        } else { // All on account credit!
          console.log('Skipping charge processing, all on account credit!');
          cb(null, {
            charged: 0,
            amtCredit: amtCredit,
            cart: cart
          });
        }
      } catch(err) {
        console.error(err);
        cb(err);
      }
    }
  };

  var createOrder = function(userId, model, paymentInfo, cb) {
    console.log(paymentInfo);
    try {

      var transactions = [paymentInfo.orderTransactionId];
      if (paymentInfo.chargeTransactionId) {
        transactions.unshift(paymentInfo.chargeTransactionId);
      }
      model.Order.create({
        'buyerId': userId,
        'orderTotal': paymentInfo.cart.cost,
        'timestamp': moment().toDate(),
        'transactions': transactions
      }, function (err, newOrder) {
        paymentInfo.orderId = newOrder.id;
        cb(err, paymentInfo);
      });
    } catch(err) {
      console.error(err);
      cb(err, paymentInfo);
    }
  };

  var updateTradelineBuyers = function(user, model, paymentInfo, cb) {
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
            cb(err, paymentInfo);
          });
        }
      }
    );
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
    createOrder: createOrder,
    updateTradelineBuyers: updateTradelineBuyers
  };
})();