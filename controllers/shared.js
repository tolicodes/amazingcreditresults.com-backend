var formatUser = require('./formatter.js').formatUserForOwner,
  ensureBuyerOrOwner = require('./../lib/middleware.js').ensureBuyerOrOwner;

//GET request to get current authorized users parameters in form of json
module.exports = exports = function (core) {
  function f4myself(request, response) {
    if (request.user) {
      response.json(formatUser(request.user));
    } else {
      response.status(400);
      response.json({
        'status': 'Error',
        'errors': [
          {
            'code': 400,
            'message': 'Authorization required!'
          }
        ]
      });
    }
  }

  core.app.all('/api/v1/myself', f4myself);
  core.app.all('/auth/myself', f4myself); //not used and can be deprecated

//Seller, Buyer, Owner can update their names, birthday, ssn
//https://oselot.atlassian.net/browse/ACR-51
  core.app.put('/api/v1/myself', function (request, response) {
    if (request.user) {
      ['familyName', 'givenName', 'middleName'].map(function (n) {
        if (request.body.name[n]) {
          request.user.name = request.body.name[n];
        }
      });

      request.user.profile.birthday = request.body.birthday;
      request.user.profile.ssn = request.body.ssn;

      request.user.save(function (error) {
        if (error) {
          throw error;
        } else {
          response.json(formatUser(request.user));
        }
      });
    } else {
      response.status(400);
      response.json({
        'status': 'Error',
        'errors': [
          {
            'code': 400,
            'message': 'Authorization required!'
          }
        ]
      });
    }
  });

//show current user balance
//https://oselot.atlassian.net/browse/ACR-387#
  core.app.get('/api/v1/account', function (request, response) {
    if (request.user) {
      request.model.Transaction.find({'client': request.user._id})
        .sort('+timestamp')
        .exec(function (error, transactionsFound) {
          var balance = 0,
            transactionsFormatted = [];
          transactionsFound.map(function (t) {
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
        });
    } else {
      response.status(400);
      response.json({
        'status': 'Error',
        'errors': [
          {
            'code': 400,
            'message': 'Authorization required!'
          }
        ]
      });
    }
  });
};
