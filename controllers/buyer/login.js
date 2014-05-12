//controller for buyer login process
module.exports = exports = function(core){

//universal error reporter page for login process
//buyer is redirected to this page when any of errors occurs
//for example, when s/he used outdated welcome link
//the error text is populated by flash messages
  core.app.get('/buyer/error', function(request, response){
    response.render('buyer/error', {
      'title':'Error!'
    });
  });


//it will be something like
//https://amazingcreditresults.com/welcome/741fca619eaaa21dd2d469346034e1ef19cfafba8e85ff259e11642d1c2a5379ed84716b318776c69f5acf1d57fbbf24020cde6b76aae7a4c8bd1965e2ed65a0
//links have ttl of 5 days
//see Development Plan # Buyer 1
  core.app.get('/buyer/welcome/:apiKey', function(request, response){
    request.model.User.findOneByApiKey(request.params.apiKey,
      function(error, userFound){
        if(error) {
          throw error;
        } else {
          if(userFound) {
            var apiKeyAge = Date.now() - userFound.apiKeyCreatedAt.getTime();
            if(apiKeyAge < core.config.passport.apiKeyOutdates) {
//key is fresh
              if(!userFound.accountVerified){
//2. The first time a Buyer clicks the link, s/he will see a prompt asking to create a password
                response.render('buyer/stage1', {
                  'title':'Set password!',
                  'myself': userFound
                });
              } else {
//3. The second time a Buyer click the link, s/he will be prompted for the password
                response.render('buyer/stage2', {
                  'title':'Enter password!',
                  'myself': userFound
                });
              }
            } else {
//key is outdated
              request.flash('error','Wrong or outdated welcome link! Please, contact support for a new one!'); //todo - change to more clear
              response.redirect('/buyer/error');
            }
          } else {
//there is nobody, who has this key!
            request.flash('error','Wrong or outdated welcome link! Please, contact support for a new one!'); //todo - change to more clear
            response.redirect('/buyer/error');
          }
        }
      }
    );
  });

//GET request to get current authorized users parameters in form of json

  core.app.get('/auth/myself', function(request, response){
    if(request.user){
      var user = request.user;
      response.json({
        "id": user.id,
        "huntKey":user.apiKey,//used for sessionless authorization
        "email": user.email,
        "name": {
          "familyName" : user.name.familyName, //http://schema.org/familyName
          "givenName" : user.name.givenName, //http://schema.org/givenName
          "middleName" : user.name.middleName //http://schema.org/middleName - at least the google oauth has this structure!
        },
        "gravatar": user.gravatar,
        "gravatar30": user.gravatar30,
        "gravatar50": user.gravatar50,
        "gravatar80": user.gravatar80,
        "gravatar100":  user.gravatar100,
        "online": user.online,
        "root": user.root,
        "accountVerified": user.accountVerified,
        "telefone": user.profile ? user.profile.telefone : '',
        "localAddress": user.profile ? user.profile.localAddress : ''
      });
    } else {
      response.status(400);
      response.json({'error':'Authorization required!'})
    }
  });


//POST request for setting the password for first time!
  core.app.post('/buyer/setPassword', function(request, response){
    if(request.body.apiKey && request.body.password){
    request.model.User.findOneByApiKey(request.body.apiKey,
      function(error, userFound){
        if(error) {
          throw error;
        } else {
          if(userFound && !userFound.accountVerified &&!userFound.root) { //just in case
            var apiKeyAge = Date.now() - userFound.apiKeyCreatedAt.getTime();
            if(apiKeyAge < core.config.passport.apiKeyOutdates) {
//key is fresh
              userFound.accountVerified = true;
              userFound.setPassword(request.body.password, function(error){
                request.flash('success','Password is set!');
                response.redirect('/buyer/welcome/'+userFound.apiKey);
              });
            } else {
//key is outdated
              request.flash('error','Wrong or outdated welcome link! Please, contact support for a new one!'); //todo - change to more clear
              response.redirect('/buyer/error');
            }
          } else {
//user is do not exists, or set his/her password already, or is owner
            request.flash('error','Wrong or outdated welcome link! Please, contact support for a new one!'); //todo - change to more clear
            response.redirect('/buyer/error');
          }
        }
      });
    } else {
//no apiKey and password in post request body
      response.send(400);
    }
  });

//POST request for authorizing Buyer when s\he enters password
  core.app.post('/buyer/login', function(request, response){
    if(request.user){
      request.flash('error','You are already authorized as '+request.user.displayName+'!'); //todo - change to more clear
      response.redirect('/buyer/error');
    } else {
      if(request.body.apiKey && request.body.password){
        request.model.User.findOneByApiKey(request.body.apiKey, function(error, userFound){
          if(error){
            throw error;
          } else {
            if(userFound){
              if(userFound.verifyPassword(request.body.password)){
                request.login(userFound, function(err){
                  if(err) {
                    throw err;
                  } else {
                    request.flash('success', 'Welcome!');
                    response.redirect('/buyer');
                  }
                });
              } else {
                request.flash('error','Unable to authorize - wrong password!'); //todo - change to more clear
                response.redirect('/buyer/welcome/'+userFound.apiKey);
              }
            } else {
              request.flash('error','Unable to authorize - wrong welcome link!'); //todo - change to more clear
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