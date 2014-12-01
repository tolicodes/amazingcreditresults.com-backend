var welcomeLinkGenerator = require('./../lib/welcome.js'),
    utilities = require('./../lib/utilities'),
    formatUser = require('./../lib/formatter.js').formatUserForOwner,
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

  core.app.post('/api/v1/account/resetPassword', function(request, response) {
    if (!request.body.username) {
      response.status(400).json({
        'status': 'Error',
        'errors': [
          {
            'code': 400,
            'message': 'Username required to reset password!'
          }
        ]
      });
    } else {
      request.model.User.findOneByKeychain('email', request.body.username, function(error, userFound) {
        if (error) {
          throw error;
        } else {
          var welcomeLink = welcomeLinkGenerator();
          if (!userFound) {
            response.status(400);
            response.json({
              'status': 'Error',
              'errors': [
                {
                  'code': 400,
                  'message': 'Username provided does not exist!'
                }
              ]
            });
          } else {
            core.async.waterfall([
              function (cb) {
                userFound.keychain.welcomeLink = welcomeLink;
                userFound.markModified('keychain');
                userFound.accountVerified = false;
                userFound.apiKeyCreatedAt = Date.now();
                userFound.invalidateSession(cb);
              },
              function (newApiKey, cb) {
                welcomeLink = core.config.hostUrl + 'password/'+welcomeLink;
                userFound.notifyByEmail({
                  'layout': false,
                  'template': 'emails/welcomeResetPassword',
                  'subject': 'Reset Your AmazingCreditResults Password',
                  'name': userFound.name,
                  'welcomeLink': welcomeLink,
                  'phone': userFound.profile ? userFound.profile.phone : null,
                  'street1': userFound.profile ? userFound.profile.street1 : null,
                  'date': utilities.frmDt(new Date())
                });
                cb();
              }
            ], function (err) {
              if (err) {
                throw err;
              } else {
                var json = {
                  'message': 'Reset email sent'
                };
                if (request.body.debug === 'true') {
                  json.welcomeLink = welcomeLink; // Is it too unsafe to return this? Am using it for testing
                }
                response.status(202).json(json);
              }
            });
          }
        }
      });
    }

  });

  core.app.get('/api/v1/myself', f4myself);
  core.app.all('/auth/myself', f4myself); //only used for unit tests!

};
