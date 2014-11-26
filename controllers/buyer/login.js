//controller for buyer login process
module.exports = exports = function(core) {
  /*
   * Header Based Authorization
   */

  //setting password - first step
  core.app.post('/api/v1/buyer/setPassword', function(request, response) {
    if (request.body.apiKey && request.body.password) {
      request.model.User.findOneByKeychain('welcomeLink', request.body.apiKey,
        function(error, userFound) {
          if (error) {
            throw error;
          } else {
            if (userFound && !userFound.accountVerified && !userFound.root) { //just in case
              var apiKeyAge = Date.now() - userFound.apiKeyCreatedAt.getTime();
              console.log(apiKeyAge)
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
                  userFound.setPassword(request.body.password, function(error) {
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


  //authorizing (aka getting huntKey) by apiKey and password - second
  core.app.post('/api/v1/buyer/login', function(request, response) {
    if (request.body.email && request.body.password) {
      request.model.User.findOneByKeychain('email', request.body.email, function(error, userFound) {
        if (error) {
          throw error;
        } else {
          if (userFound) {
            //console.log(request.body.password);
            //console.log(userFound);
            //console.log(userFound.verifyPassword(request.body.password));
            if (userFound.verifyPassword(request.body.password)) {
              response.status(202);
              response.json({
                'Code': 202,
                'Success': 'Welcome!',
                'huntKey': userFound.apiKey
              });
            } else {
              response.status(403);
              response.json({
                'status': 'Error',
                'errors': [{
                  'code': 403,
                  'message': 'Unable to authorize - wrong password!',
                  'field': 'password'
                }]
              });
            }
          } else {
            response.status(403);
            response.json({
              'status': 'Error',
              'errors': [{
                'code': 403,
                'message': 'Unable to authorize - wrong email!',
                'field': 'email'
              }]
            });
          }
        }
      });
    } else {
      //no email and password in post request body
      response.status(400);
      var errors = [];
      if (!request.body.email) {
        errors.push({
          'code': 400,
          'message': 'Missed parameter - `email`!',
          'field': 'email'
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
