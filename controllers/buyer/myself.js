var ensureRole = require('./../../lib/middleware.js').ensureRole;

module.exports = exports = function (core) {
  //show current user balance
  //https://oselot.atlassian.net/browse/ACR-387#
  core.app.get('/api/v1/myself/transactions', ensureRole('buyer'), function(request, response) {
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

  //https://oselot.atlassian.net/browse/ACR-145
  core.app.get('/api/v1/buyer/needToSetPassword/:welcomeLink', function(request, response) {
    request.model.User.findOneByKeychain('welcomeLink', request.params.welcomeLink,
        function(error, userFound) {
          if (error) {
            throw error;
          } else {
            if (userFound) {
              var apiKeyAge = Date.now() - userFound.apiKeyCreatedAt.getTime();
              if (apiKeyAge < core.config.passport.apiKeyOutdates || userFound.accountVerified) {
                //key is fresh
                if (!userFound.accountVerified) {
                  //2. The first time a Buyer clicks the link, s/he will see a prompt asking to create a password
                  response.json({
                    'email': userFound.email,
                    'needToSetPassword': true,
                    'name': {
                      'familyName': userFound.name.familyName, //http://schema.org/familyName
                      'givenName': userFound.name.givenName, //http://schema.org/givenName
                      'middleName': userFound.name.middleName //http://schema.org/middleName - at least the google oauth has this structure!
                    }
                  });
                } else {
                  //3. The second time a Buyer click the link, s/he will be prompted for the password
                  response.json({
                    'email': userFound.email,
                    'needToSetPassword': false,
                    'name': {
                      'familyName': userFound.name.familyName, //http://schema.org/familyName
                      'givenName': userFound.name.givenName, //http://schema.org/givenName
                      'middleName': userFound.name.middleName //http://schema.org/middleName - at least the google oauth has this structure!
                    }
                  });
                }
              } else {
                //key is outdated
                response.status(400);
                response.json({
                  'status': 'Error',
                  'errors': [{
                    'code': 400,
                    'message': 'Link is outdated!'
                  }]
                });
              }
            } else {
              //there is nobody, who has this key!
              response.status(404);
              response.json({
                'status': 'Error',
                'errors': [{
                  'code': 404,
                  'message': 'Link is not valid!'
                }]
              });
            }
          }
        }
    );
  });
};
