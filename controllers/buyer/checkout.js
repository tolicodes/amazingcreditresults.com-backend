var ensureBuyerOrOwner = require('../../lib/middleware.js').ensureBuyerOrOwner,
    Checkout = require('../../lib/checkoutUtil.js');

module.exports = exports = function (core) {
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
                  Checkout.calculateCurrentBalance(request.user, request.model, c);
                },
                //Calculate the cost of all tradelines Buyer want to purchase
                //Also check that tradelines all available for purchase
                'cost': function (c) {
                  Checkout.checkTradelineAvailabilityAndSumCost(request.user, request.model, c);
                }
              }, cb);
            },
            /*function (obj, cb) {
              Checkout.processCharge(request.user, cb);
            },*/
            function (obj, cb) {
              Checkout.issueTransaction(request.user, request.model, obj, cb);
            },
            function (transactionId, cb) {
              Checkout.updateTradelineBuyers(request.user, request.model, transactionId, cb);
            }
          ],
          function (error, paymentTransactionId) {
            if (error) {
              var code = error.errors[0].code || 400;
              response.status(code).json(error);
            } else {
              Checkout.confirmCheckout(request.user);
              response.status(201).json({
                'status': 'Ok',
                'transactionId': paymentTransactionId
              });
            }
          }
      );
  });
};
