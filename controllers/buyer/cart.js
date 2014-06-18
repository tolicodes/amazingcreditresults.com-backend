var ensureBuyerOrOwner = require('../middleware.js').ensureBuyerOrOwner;

module.exports = exports = function (core) {

  core.app.get('/api/v1/buyer/cart', ensureBuyerOrOwner, function (request, response) {
    var tradelineIds = request.user.profile ? (request.user.profile.cart || []) : [];
    core.async.map(tradelineIds,
      request.model.TradeLine.findById,
      function (error, tradeLinesFound) {
        if (error) {
          throw error;
        } else {
          response.json({
            'data': tradeLinesFound,
            'itemsInCart': tradeLinesFound.length
          });
        }
      });
  });

};