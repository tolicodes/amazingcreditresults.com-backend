module.exports = exports = function(core){
  //session based authorization
  //deprecated

  //universal error reporter page for login process
  //buyer is redirected to this page when any of errors occurs
  //for example, when s/he used outdated welcome link
  //the error text is populated by flash messages
  core.app.get('/buyer/error', function (request, response) {
    response.render('buyer/error', {
      'title': 'Error!'
    });
  });

  //it will be something like
  //https://amazingcreditresults.com/welcome/paputrahaetsobaka
  //links have ttl of 5 days
  //see Development Plan # Buyer 1
  //used in cookie session based authorization
  core.app.get('/buyer/welcome/:welcomeLink', function (request, response) {
    request.model.User.findOneByKeychain('welcomeLink', request.params.welcomeLink,
      function (error, userFound) {
        if (error) {
          throw error;
        } else {
          if (userFound) {
            var apiKeyAge = Date.now() - userFound.apiKeyCreatedAt.getTime();
            if (apiKeyAge < core.config.passport.apiKeyOutdates) {
              //key is fresh
              if (!userFound.accountVerified) {
                //2. The first time a Buyer clicks the link, s/he will see a prompt asking to create a password
                response.render('buyer/stage1', {
                  'title': 'Set password!',
                  'myself': userFound
                });
              } else {
                //3. The second time a Buyer click the link, s/he will be prompted for the password
                response.render('buyer/stage2', {
                  'title': 'Enter password!',
                  'myself': userFound
                });
              }
            } else {
              //key is outdated
              response.render('buyer/stage2', {
                'title': 'Enter password!',
                'myself': userFound,
                'flash': {
                  'error': 'Your welcome link is outdated! Please, contact support to recieve a new one!'
                }
              });
            }
          } else {
            //there is nobody, who has this key!
            response.render('buyer/stage2', {
              'title': 'Enter password!',
              'myself': userFound,
              'flash': {
                'error': 'Your welcome link is not accepted!  Please, contact support to recieve a new one!'
              }
            });
          }
        }
      }
    );
  });

  //POST request for setting the password for first time!
  //used in cookie session based authorization
  core.app.post('/buyer/setPassword', function (request, response) {
    if (request.body.apiKey && request.body.password) {
      request.model.User.findOneByKeychain('welcomeLink', request.body.apiKey,
        function (error, userFound) {
          if (error) {
            throw error;
          } else {
            if (userFound && !userFound.accountVerified && !userFound.root) { //just in case
              var apiKeyAge = Date.now() - userFound.apiKeyCreatedAt.getTime();
              if (apiKeyAge < core.config.passport.apiKeyOutdates) {
                //key is fresh
                userFound.accountVerified = true;
                userFound.setPassword(request.body.password, function (err) {
                  if (err) {
                    throw err;
                  } else {
                    request.flash('success', 'Password is set!');
                    response.redirect('/buyer/welcome/' + userFound.keychain.welcomeLink);
                  }
                });
              } else {
                //key is outdated
                request.flash('error', 'Wrong or outdated welcome link! Please, contact support for a new one!'); //todo - change to more clear
                response.redirect('/buyer/error');
              }
            } else {
              //user is do not exists, or set his/her password already, or is owner
              request.flash('error', 'Wrong or outdated welcome link! Please, contact support for a new one!'); //todo - change to more clear
              response.redirect('/buyer/error');
            }
          }
        });
    } else {
      //no apiKey and password in post request body
      request.flash('error', 'The values of `apiKey` or `password` are missed!'); //todo - change to more clear
      response.redirect('/buyer/error');
    }
  });

  //POST request for authorizing Buyer when s\he enters password
  //used in cookie session based authorization
  core.app.post('/buyer/login', function (request, response) {
    if (request.user) {
      request.flash('error', 'You are already authorized as ' + request.user.displayName + '!'); //todo - change to more clear
      response.redirect('/buyer/error');
    } else {
      if (request.body.apiKey && request.body.password) {
        request.model.User.findOneByKeychain('welcomeLink', request.body.apiKey, function (error, userFound) {
          if (error) {
            throw error;
          } else {
            if (userFound) {
              if (userFound.verifyPassword(request.body.password)) {
                request.login(userFound, function (err) {
                  if (err) {
                    throw err;
                  } else {
                    request.flash('success', 'Welcome!');
                    response.redirect('/buyer');
                  }
                });
              } else {
                request.flash('error', 'Unable to authorize - wrong password!'); //todo - change to more clear
                response.redirect('/buyer/welcome/' + userFound.keychain.welcomeLink);
              }
            } else {
              request.flash('error', 'Unable to authorize - wrong welcome link!'); //todo - change to more clear
              response.redirect('/buyer/error');
            }
          }
        });
      } else {
        response.send(400);
      }
    }
  });
}