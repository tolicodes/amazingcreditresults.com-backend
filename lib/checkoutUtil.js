module.exports = exports = function(core) {
  var _ = require('underscore'),
      balanced = require('balanced-official'),
      stripe = require('stripe')(core.config.stripeApiKey),
      moment = require('moment'),
      async = require('async');


  var createTransaction = function(user, args, cb) {
    var paymentTransactionId;
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
    core.model.Transaction.create(modelArgs, function (error, tCreated) {
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

  var checkTradelineAvailabilityAndSumCost = function(user, cb) {
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
      var unavailableTradelines = [],
          properTradeLineIds = [],
          sumCost = 0;

      async.each(_.keys(user.profile.cart), function (tradeline, c) {
        core.model.TradeLine.findById(tradeline)
            .populate('product')
            .exec(function (error, tradelineFound) {
                if (!tradelineFound) {
                  cb({
                    'status': 'Error',
                    'code': 500,
                    'errors': [{
                      'message': 'Invalid Tradeline Id: ' + tradeline
                    }]
                  });
                } else if (tradelineFound.usedAus >= tradelineFound.totalAus) {
                  var tradeErr = {
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
                  // TODO find another way to populate these for confirmation email
                  //tradelines.push(tradelineFound);
                }
                c(error);
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

  var calculateCurrentBalance = function(user, cb) {
    core.model.Transaction
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
  var issueTransaction = function(user, paymentInfo, cb) {
    try {
      //Buyer can afford the packages we issue new transaction for it
      var debitArgs = {
        'amount': paymentInfo.cart.cost * -1, // Negative because it is a debit
        'type': 'orderPlaced',
        'tradeLinesBought': paymentInfo.purchasedTradelines
      };
      createTransaction(user, debitArgs, function (error, transactionId) {
        paymentInfo.orderTransactionId = transactionId;
        cb(error, paymentInfo);
      });
    } catch(err) {
      console.error(err);
    }

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

  var processCharge = function(user, body, cart, cb){
    var err = validateChargeValidity(user, body, cart);
    if (err) {
      cb(err);
    } else {
      try {
        var amtCredit = body.amtAccountCredit ? parseFloat(body.amtAccountCredit) : 0,
            chargeAmt = cart.cost - amtCredit;
        if (body.useAchAccount) {
          var bankAcct = balanced.get('/bank_accounts/' + user.profile.achAccount.id);
          balanced.get('/customers/' + user.profile.achAccount.customerId).orders.create({
            description: 'ACR Cart Checkout for ' + user.email
          }).debit_from(bankAcct, chargeAmt * 100) // convert chargeAmt from dollars to cents
          .then(function (debit) {
            var transactionInfo = {
              'amount': chargeAmt,
              'type': 'achCharge',
              'fundingSource': debit.id,
              'reason': 'Charge for Tradeline Checkout'
            };
            createTransaction(user, transactionInfo, function(error, transactionId) {
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
          stripe.charges.create({
            amount: chargeAmt,
            currency: 'usd',
            card: body.creditCardToken,
            description: 'AmazingCreditReport Cart Checkout',
            receipt_email: user.email
          }, function(err, charge) {
            var transactionInfo = {
              'amount': chargeAmt,
              'type': 'creditCardCharge',
              'fundingSource': charge.id,
              'reason': 'Charge for Tradeline Checkout'
            };
            createTransaction(user, transactionInfo, function(error, transactionId) {
              cb(error, {
                charged: chargeAmt,
                amtCredit: amtCredit,
                cart: cart,
                stripeChargeId: charge.id,
                chargeTransactionId: transactionId
              });
            });
          });

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

  var createOrder = function(userId, paymentInfo, cb) {
    try {

      var transactions = [paymentInfo.orderTransactionId];
      if (paymentInfo.chargeTransactionId) {
        transactions.unshift(paymentInfo.chargeTransactionId);
      }
      core.model.Order.create({
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

  var incrementTradelineAus = function(tradelineId, userId, cb) {
    core.model.TradeLine.findOneAndUpdate(
      { '_id': tradelineId },
      {
        '$inc': {'usedAus': 1},
        '$push': {'buyers': userId}
      },
      cb);
  };

  var createAuPurchaseRecord = function(tradeline, userId, paymentInfo, cb) {
    console.log('Creating AU Purchase Record!');
    core.model.AuPurchase.create({
      'tradeline': tradeline.id,
      'buyer': userId,
      'seller': tradeline.seller,
      'order': paymentInfo.orderId,
      'soldFor': tradeline.price
      // TODO figure out how to handle sellerPayout: How much the seller is owed
      //'sellerPayout': Number
    }, cb);
  };

  var updateTradelineBuyers = function(user, paymentInfo, cb) {
    //for every good Tradeline in cart set the userdAus ++, and add userId in buyers
    var tradelines = _.keys(user.profile.cart);
    async.map(tradelines,
      function (id, c) {
        async.waterfall([
            function(cc) {
              incrementTradelineAus(id, user._id, cc);
            },
            function(tradeline, cc) {
              createAuPurchaseRecord(tradeline, user._id, paymentInfo, cc);
            }
        ], c);
      },
      function (error, records) {
        if (error) {
          cb(error);
        } else {
          paymentInfo.purchasedTradelines = tradelines;
          //flush up cart from user profile
          user.profile = user.profile || {};
          user.profile.cart = {};
          //save user profile
          user.save(function (err) {
            if (err) {
              cb(err);
            } else {
             core.model.Order.update(
               { _id: paymentInfo.orderId },
               { auPurchases: _(records).pluck('_id') },
               function(err) {
                 cb(err, paymentInfo);
             });
            }

          });
        }
      }
    );
  };

  var confirmCheckout = function(user, paymentInfo) {
    try {
      user.notifyByEmail({
        'layout': false,
        'template': 'emails/checkoutBuyer',
        'subject': 'Checkout confirmation',
        'tradeLinesInCart': paymentInfo.purchasedTradelines, // TODO populate these
        'total': paymentInfo.cart.cost,
        'user': user,
        'date': new Date()
      });
    } catch(err) {
      console.error(err);
    }
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
};