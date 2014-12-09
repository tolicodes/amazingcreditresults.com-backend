var ensureRole = require('./../../lib/middleware.js').ensureRole;
var utilities = require('../../lib/utilities');
var _ = require('underscore');

module.exports = exports = function(core) {
  core.app.get('/api/v1/auPurchases', ensureRole('owner'), function (request, response) {
    try {
      var query = {};
      // Filters by buyer and/or seller
      if (request.body.buyerId) {
        query.buyer = request.body.buyerId;
      }
      if (request.body.sellerId) {
        query.seller = request.body.sellerId;
      }

      core.model.AuPurchase
      .find(query)
      .populate('buyer seller order tradeline')
      .exec(function (error, purch) {
        if (error) {
          response.status(500).json({status: 'Error', errors: [error]});
        } else {
          response.status(200).json({status: 'Ok', auPurchases: purch});
        }
      });
    } catch (err) {
      console.error(err);
    }
  });

  core.app.put('/api/v1/auPurchases/:id', ensureRole('owner'), function (req, res) {
    // TODO
  });
};