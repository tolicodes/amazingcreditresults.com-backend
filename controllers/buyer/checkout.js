module.exports = exports = function (core) {
  var ensureBuyerOrOwner = require('../../lib/middleware.js').ensureBuyerOrOwner,
      Checkout = require('../../lib/checkoutUtil.js')(core);

  core.app.get('/api/v1/account/balance', ensureBuyerOrOwner, function (request, response) {
      Checkout.calculateCurrentBalance(request.user, function(notHere, balance) {
          response.status(201).json({
              balance: balance
          });
      });

  });
  core.app.post('/api/v1/cart/checkout', ensureBuyerOrOwner, function (request, response) {
      core.async.waterfall(
          [
            function (cb) {
              Checkout.checkUserVerified(request.user, cb);
            },
            function (cb) {
              core.async.parallel({
                //calculate the current user balance
                'balance': function (c) {
                  Checkout.calculateCurrentBalance(request.user, c);
                },
                //Calculate the cost of all tradelines Buyer want to purchase
                //Also check that tradelines all available for purchase
                'cost': function (c) {
                  Checkout.checkTradelineAvailabilityAndSumCost(request.user, c);
                }
              }, cb);
            },
            function (cartBalance, cb) {
              console.log('processing charge');
              Checkout.processCharge(request.user, request.body, cartBalance, cb);
            },
            function (chargeInfo, cb) {
              console.log('issue debit transaction');
              Checkout.issueTransaction(request.user, chargeInfo, cb);
            },
            function (paymentInfo, cb) {
              console.log('create order');
              Checkout.createOrder(request.user.id, paymentInfo, cb);
            },
            function (paymentInfo, cb) {
              console.log('update tradelinebuyers');
              Checkout.updateTradelineBuyers(request.user, paymentInfo, cb);
            }
          ],
          function (error, paymentInfo) {
            if (error) {
              var code = error.errors[0].code || 400;
              response.status(code).json(error);
            } else {
              console.log('confirm checkout');
              Checkout.confirmCheckout(request.user, paymentInfo);
              response.status(201).json({
                'status': 'Ok',
                'orderId': paymentInfo.orderId,
                'chargeTransactionId': paymentInfo.chargeTransactionId,
                'orderTransactionId': paymentInfo.orderTransactionId
              });
            }
          }
      );
  });
};
