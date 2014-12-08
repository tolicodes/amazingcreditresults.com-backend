var ensureRole = require('./../../lib/middleware.js').ensureRole;

module.exports = exports = function (core) {
  core.app.get('/api/v1/orders', ensureRole(['buyer', 'owner']), function(request, response) {
    var query = request.user.owner === true ? {} : { 'buyerId': request.user.id };
    core.model.Order.find(query).exec(function(error, orders){
      if (error) {
        response.status(500).json({status: 'Error', errors: [error]});
      } else {
        response.status(200).json({status: 'Ok', orders: orders});
      }
    });
  });
};
