var welcomeLinkGenerator = require('./../../lib/welcome.js'),
    utilities = require('./../../lib/utilities');

module.exports = exports = function (core) {

  core.app.post('/api/v1/account/resetPassword', function (request, response) {
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
      request.model.User.findOneByKeychain('email', request.body.username, function (error, userFound) {
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
                welcomeLink = core.config.hostUrl + 'password/' + welcomeLink;
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

  core.app.post('/api/v1/account/setPassword', function (request, response) {
    if (request.body.apiKey && request.body.password) {
      request.model.User.findOneByKeychain('welcomeLink', request.body.apiKey,
          function (error, userFound) {
            if (error) {
              throw error;
            } else {
              if (userFound && !userFound.accountVerified && !userFound.root) { //just in case
                var apiKeyAge = Date.now() - userFound.apiKeyCreatedAt.getTime();
                //console.log(apiKeyAge);
                if (apiKeyAge < core.config.passport.apiKeyOutdates) {
                  //key is fresh
                  if (userFound.verifyPassword(request.body.password)) {
                    response.status(400);
                    response.json({
                      'status': 'Error',
                      'errors': [{
                        'code': 400,
                        'message': 'Old password was used!'
                      }]
                    });

                  } else {
                    userFound.accountVerified = true;
                    userFound.apiKeyCreatedAt = Date.now();
                    userFound.setPassword(request.body.password, function (error) {
                      if (error) {
                        throw error;
                      } else {
                        userFound.notifyByEmail({
                          'subject': 'Your password is changed!',
                          'template': 'emails/updPassword',
                          'name': userFound.name,
                          'ip': request.ip
                        });
                        response.status(201);
                        response.json({
                          'Code': 201,
                          'Success': 'Password is set!'
                        });
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
                      'message': 'Wrong or outdated welcome link! Please, contact support for a new one!'
                    }]
                  });
                }
              } else {
                //user is do not exists, or set his/her password already, or is owner
                response.status(400);
                response.json({
                  'status': 'Error',
                  'errors': [{
                    'code': 400,
                    'message': 'Wrong or outdated welcome link! Please, contact support for a new one!'
                  }]
                });
              }
            }
          });
    } else {
      //no apiKey or password in post request body
      response.status(400);
      var errors = [];
      if (!request.body.apiKey) {
        errors.push({
          'code': 400,
          'message': 'Missed parameter - `apiKey`!',
          'field': 'apiKey'
        });
      }
      if (!request.body.password) {
        errors.push({
          'code': 400,
          'message': 'Missed parameter - `password`!',
          'field': 'password'
        });
      }
      response.json({
        'status': 'Error',
        'errors': errors
      });
    }
  });

  core.app.post('/api/v1/account/login', function (request, response) {
    if (request.body.username && request.body.password) {
      request.model.User.findOneByEmail(request.body.username, function (error, userFound) {
        if (error) {
          throw error;
        } else {
          if (userFound && userFound.verifyPassword(request.body.password)) {
            response.status(200);
            response.json({
              'Code': 200,
              'id': userFound.id,
              'huntKey': userFound.apiKey,
              'name': userFound.name
            });
          } else {
            response.status(403);
            response.json({
              'status': 'Error',
              'errors': [
                {
                  'code': 403,
                  'message': 'Invalid username or password. Please try again using correct username and password.'
                }
              ]
            });
          }
        }
      });
    } else {
      response.status(400);
      var errors = [];

      if (!request.body.username) {
        errors.push({
          'code': 400,
          'message': 'Username is not provided!',
          'field': 'username'
        });
      }

      if (!request.body.password) {
        errors.push({
          'code': 400,
          'message': 'Password is not provided!',
          'field': 'password'
        });
      }

      response.json({
        'status': 'Error',
        'errors': errors
      });

    }
  });
};
