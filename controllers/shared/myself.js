var formatUser = require('./../../lib/formatter.js').formatUserForOwner,
    ensureRole = require('./../../lib/middleware.js').ensureRole,
    _ = require('underscore');

var createModel = (function() {
  var passThruFields = ['name.familyName', 'name.givenName', 'name.middleName', 'name.title', 'name.generation'];
  var fieldMap = {
    'street1': 'profile.street1',
    'street2': 'profile.street2',
    'phone': 'profile.phone',
    'state': 'profile.state',
    'city': 'profile.city',
    'ssn': 'profile.ssn',
    'birthday': 'profile.birthday',
    'zip': 'profile.zip'
  };

  return function(body) {
    var patch = {};
    if (body.name) {
      _(body.name).forEach(function(val, prop) {
        var key = 'name.' + prop;
        if (passThruFields.indexOf(key) !== -1) {
          patch[key] = val;
        }
      });
    }
    _(fieldMap).forEach(function(fullKey, shortKey) {
      if (body.hasOwnProperty(shortKey)) {
        patch[fullKey] = body[shortKey];
      }
    });
    return patch;
  };

})();



//GET request to get current authorized users parameters in form of json
module.exports = exports = function(core) {

  //Seller, Buyer, Owner can update their names, birthday, ssn
  //https://oselot.atlassian.net/browse/ACR-51
  core.app.put('/api/v1/myself', ensureRole(['buyer', 'owner', 'seller']), function(request, response) {
    core.model.User
      .findOneAndUpdate({
          _id: request.user.id
        },
        createModel(request.body)
      )
      .exec().then(function(user) {
        response.status(202).json(formatUser(user));
      });
  });

  core.app.get('/api/v1/myself', function(request, response) {
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
