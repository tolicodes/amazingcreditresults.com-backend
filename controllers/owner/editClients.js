//controller for owner users to edit the clients list

/**
 * @swagger
 * resourcePath: /admin/
 * description: Owners API for editing clients
 */


module.exports = exports = function(core){

var ensureAdmin = function(request, response, next){
  if(request.user && request.user.root){
    next();
  } else {
    request.flash('error','Authentication required!');
    response.redirect('/admin/login');
  }
};

/**
 * @swagger
 * path: /admin/clients
 * operations:
 *   -  httpMethod: GET
 *      nickname: Owner dashboard for editing clients
 */
  core.app.get('/admin/clients', ensureAdmin, function(request, response){
    response.render('owner/editClientsDev', {'title':'Edit clients'})
  });

/**
 * @swagger
 * path: /admin/clients.json
 * operations:
 *   -  httpMethod: GET
 *      nickname: Owners' json endpoing with data about clients
 */
  core.app.get('/admin/clients.json', ensureAdmin, function(request, response){
    var page = request.query.page || 1,
      order = request.query.order;

    request.model.User
      .find({
         //todo - parameters for limiting output
      })
      .limit(100)
      .skip() //todo - pagination
      .exec(function(error, usersFound){
        if(error){
          throw error;
        } else {
          var usersPrepared = usersFound.map(function(user){
            return {
              'id': user.id,
              'email': user.email,
              'name': {
                'familyName' : user.name.familyName, //http://schema.org/familyName
                'givenName' : user.name.givenName, //http://schema.org/givenName
                'middleName' : user.name.middleName //http://schema.org/middleName - at least the google oauth has this structure!
              },
              'title': user.profile ? (user.profile.title || 'Mr.'): 'Mr.',
              'telefone': user.profile ? (user.profile.telefone || '') : '',
              'localAddress': user.profile ? (user.profile.localAddress || ''): '',
              'needQuestionnaire': user.profile ? user.profile.needQuestionnaire : '',
              'gravatar': user.gravatar,
              'gravatar30': user.gravatar30,
              'gravatar50': user.gravatar50,
              'gravatar80': user.gravatar80,
              'gravatar100':  user.gravatar100,
              'online': user.online,
              'root': user.root,
              'accountVerified': user.accountVerified
            }
          });
          response.json({ 'page':1,'clients':usersPrepared});
        }
      });
  });

/**
 * @swagger
 * path: /admin/clients/:id
 * operations:
 *   -  httpMethod: GET
 *      nickname: Owners json with data about clients
 */
  core.app.get('/admin/clients/:id', ensureAdmin, function(request, response){
    request.model.User.findById(request.params.id, function(error, user){
      if(error) {
        throw error;
      } else {
        if(user){
          response.status(200);
          response.json({
              'id': user.id,
              'email': user.email,
              'name': {
                'familyName' : user.name.familyName,
                'givenName' : user.name.givenName,
                'middleName' : user.name.middleName
              },
              'title': user.profile ? user.profile.title : 'Mr.',
              'gravatar': user.gravatar,
              'gravatar30': user.gravatar30,
              'gravatar50': user.gravatar50,
              'gravatar80': user.gravatar80,
              'gravatar100':  user.gravatar100,
              'online': user.online,
              'root': user.root,
              'accountVerified': user.accountVerified,
              'needQuestionnaire': user.profile ? user.profile.needQuestionnaire : '',
              'telefone': user.profile ? user.profile.telefone : '',
              'localAddress': user.profile ? user.profile.localAddress  : ''
          });
        } else {
          response.send(404);
        }
      }
    });
  });

  core.app.put('/admin/clients/:id', ensureAdmin, function(request, response){
    request.model.User.findOneAndUpdate(
      {
        '_id':request.params.id,
        'root':false
      },
      {
        'keychain.email': request.body.email,
        'name': {
          'familyName' : request.body.familyName,
          'givenName' : request.body.givenName,
          'middleName' : request.body.middleName
        },
        'profile.title': request.body.title,
        'profile.localAddress': request.body.localAddress,
        'profile.telefone': request.body.telefone,
        'profile.needQuestionnaire': request.body.needQuestionnaire
      },
      {
        'upsert':false // important!
      }, function(error, userFound){
        if(error){
          throw error;
        } else {
          response.status(202);
          response.json({
            'id': userFound.id,
            'email': userFound.email,
            'name':{
              'givenName':userFound.name.givenName,
              'middleName':userFound.name.middleName,
              'familyName':userFound.name.familyName
            },
            'title': userFound.profile ? userFound.profile.title : '',
            'telefone': userFound.profile ? userFound.profile.telefone:'',
            'localAddress': userFound.profile ? userFound.profile.localAddress:'',
            'profile': {
              'needQuestionnaire': userFound.profile ? userFound.profile.needQuestionnaire : true
            },
            'root': false
          });
        }
      }
    );
  });


  core.app.post('/admin/clients', ensureAdmin, function(request, response){
    var isOk,
      missed;
    [
      'email',
      'familyName',
      'givenName',
    //  'middleName' //not mandatory for now
    ].map(function(s){
      if(request.body[s] && typeof request.body[s] === 'string') {
        isOk = true;
      } else {
        isOk = false;
        missed = s;
      }
    });
    if(isOk) {
      request.model.User.create({
        'email': request.body.email,
        'name':{
          'givenName':request.body.givenName,
          'middleName':request.body.middleName,
          'familyName':request.body.familyName
        },
        'profile': {
          'needQuestionnaire': request.body.Questionnaire ? true : false,
          'telefone': request.body.telefone,
          'localAddress': request.body.localAddress,
          'title': request.body.title,
        },
        'root': false
      }, function(error, userCreated){
        if(error) {
          throw error;
        } else {
          response.status(201);
          response.json({
            'id': userCreated.id,
            'email': userCreated.email,
            'name':{
            'givenName':userCreated.name.givenName,
              'middleName':userCreated.name.middleName,
              'familyName':userCreated.name.familyName
            },
            'profile': {
              'needQuestionnaire': userCreated.profile.needQuestionnaire
            },
            'title': userCreated.profile.title,
            'telefone': userCreated.profile.telefone,
            'localAddress': userCreated.profile.localAddress,
            'root': false,
            'accountVerified':true
            });
        }
      });
    } else {
      response.send(400, 'Value of '+missed+' is missed!');
    }
  });

//send message with link to site, without reseting the password
  core.app.post('/admin/clients/welcome/:id', ensureAdmin,function(request, response){
    request.model.User.findById(request.params.id, function(error, userFound){
      if(error) {
        throw error;
      } else {
        var welcomeLink;
        if(userFound.root){
          response.status(400); //not sure about js with it
          response.json({'error':'Unable to send welcome link to owner!'});
        } else {
          core.async.waterfall([
            function(cb){
              userFound.invalidateSession(cb);
            },
            function(newApiKey, cb){
              welcomeLink = core.config.hostUrl+'buyer/welcome/'+newApiKey;
              userFound.notifyByEmail({
                'layout':false,
                'template':'emails/welcome',
                'subject':'Site access hyperlink',
                'name': userFound.name,
                'welcomeLink': welcomeLink,
                'telefone': userFound.profile.telefone,
                'localAddress': userFound.profile.localAddress,
                'date': (new Date()).toUTCString()
              });
              cb();
            }
          ], function(err){
            if(err) {
              throw err;
            } else {
              response.status(202);
              response.json({'message':'sent','user':userFound, 'welcomeLink':welcomeLink});
            }
          });
        }
      }
    });
  });

    core.app.post('/admin/clients/resetPassword/:id', ensureAdmin,function(request, response){
    request.model.User.findById(request.params.id, function(error, userFound){
      if(error) {
        throw error;
      } else {
        var welcomeLink;
        if(userFound.root){
          response.status(400); //not sure about js with it
          response.json({'error':'Unable to send password reset link to owner!'});
        } else {
          core.async.waterfall([
            function(cb){
              userFound.accountVerified = false;
              userFound.invalidateSession(cb);
            },
            function(newApiKey, cb){
              welcomeLink = core.config.hostUrl+'buyer/welcome/'+newApiKey;
              userFound.notifyByEmail({
                'layout':false,
                'template':'emails/welcomeResetPassword',
                'subject':'Site access hyperlink',
                'name': userFound.name,
                'welcomeLink': welcomeLink,
                'telefone': userFound.profile.telefone,
                'localAddress': userFound.profile.localAddress,
                'date': (new Date()).toUTCString()
              });
              cb();
            }
          ], function(err){
            if(err) {
              throw err;
            } else {
              response.status(202);
              response.json({'message':'sent','user':userFound, 'welcomeLink':welcomeLink});
            }
          });
        }
      }
    });
  });
//https://oselot.atlassian.net/browse/ACR-58
  core.app.post('/admin/createOwner', function(request, response){
    if(request.body.email && request.body.password){
      request.model.User.signUp(request.username, request.password, function(error, userCreated){
        if(error){
          throw error;
        } else {
          userCreated.root = true;
          userCreated.accountVerified = true;
          userCreated.name = {'givenName': request.username};
          userCreated.save(function(err){
            if(err) {
              throw err;
            } else {
              response.status(201);
              response.json(userCreated);
            }
          });
        }
      });
    } else {
      response.status(400);
      response.json({'error':'Fields of username or password are missed'});
    }
  });
};


