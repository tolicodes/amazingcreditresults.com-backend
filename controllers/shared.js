var formatUser = require('./../lib/formatter.js').formatUserForOwner,
  ensureRole = require('./../lib/middleware.js').ensureRole;

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

//GET request to get current authorized users parameters in form of json
module.exports = exports = function(core) {

  //Seller, Buyer, Owner can update their names, birthday, ssn
  //https://oselot.atlassian.net/browse/ACR-51
  core.app.put('/api/v1/myself', ensureRole(), function(request, response) {
    request.user
      .update({
          _id: req.params.id
        },
        utilities.createModel(req.body, passThruFields, fieldMap)
      )
      .exec().then(function() {
        response.status(202).json(utilities.createModel(req.body, passThruFields, fieldMap));
      });
  });

  function f4myself(request, response) {
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
  }

  core.app.get('/api/v1/myself', f4myself);
  core.app.all('/auth/myself', f4myself); //only used for unit tests!

  //show current user balance
  //https://oselot.atlassian.net/browse/ACR-387#
  core.app.get('/api/v1/account', ensureRole(), function(request, response) {
    request.model.Transaction.find({
      'client': request.user._id
    })
      .sort('+timestamp')
      .exec(function(error, transactionsFound) {
        if (error) {
          throw error;
        } else {
          var balance = 0,
            transactionsFormatted = [];
          transactionsFound.map(function(t) {
            transactionsFormatted.push({
              'id': t.id,
              'timestamp': t.timestamp,
              'amount': t.amount,
              'type': t.type
            });
            balance = balance + t.amount;
          });

          response.json({
            'data': {
              'balance': balance,
              'transactions': transactionsFormatted
            }
          });
        }
      });

  });
};