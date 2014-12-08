var ensureRole = require('./../../lib/middleware.js').ensureRole;

module.exports = exports = function (core) {
  core.app.get('/api/v1/orders', ensureRole(['buyer', 'owner']), function(request, response) {
    /* Permissions
      Buyer: Sees own orders
      Owner: Sees ALL orders
      Optional Owner Filter:
      'buyerId': <buyerId> Only those related to a buyer
    */
    var query;
    if (request.user.owner === true) {
      query = request.body.buyerId ? { 'buyerId': request.body.buyerId } : {};
    } else {
      query = {'buyerId': request.user.id};
    }

    core.model.Order.find(query).exec(function(error, orders){
      if (error) {
        response.status(500).json({status: 'Error', errors: [error]});
      } else {
        response.status(200).json({status: 'Ok', orders: orders});
      }
    });
  });
};
