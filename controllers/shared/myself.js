var formatUser = require('./../../lib/formatter.js').formatUserForOwner,
    ensureRole = require('./../../lib/middleware.js').ensureRole,
    util = require('./../../lib/buyerUtil.js'),
    _ = require('underscore');


//GET request to get current authorized users parameters in form of json
module.exports = exports = function(core) {

  //Seller, Buyer, Owner can update their names, birthday, ssn
  //https://oselot.atlassian.net/browse/ACR-51
  core.app.put('/api/v1/myself', ensureRole(['buyer', 'owner', 'seller']), function(request, response) {
    // fixing a strange bug in the tests
    request.user.profile = request.user.profile || {};
    if (request.user.profile.evsVerified && !util.canEditAfterEVS(request.body)) {
      response.status(400).json({
        status: 'Error',
        errors: [{
          'code': 400,
          'message': 'Cannot modify these fields after EVS Verification'
        }]
      });
    } else {
     core.model.User
      .findOneAndUpdate({
          _id: request.user.id
        },
        util.createModel(request.body, request.user)
      )
      .exec().then(function(user) {
        response.status(202).json(formatUser(user));
      });
    }
  });

  core.app.get('/api/v1/myself', ensureRole(['buyer', 'owner', 'seller']), function(request, response) {
    if (request.user) {
      response.json(formatUser(request.user));
    } else {
      response.status(400);
      response.json({
        'status': 'Error',
        'errors': [{
          'code': 400,
          'message': 'Authorization required!'
        }]
      });
    }
  });

};
