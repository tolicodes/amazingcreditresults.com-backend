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

    if(['familyName','givenName','middleName'])

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
              'telefone': user.profile ? user.profile.telefone : '',
              'localAddress': user.profile ? user.profile.localAddress: '',
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
              'gravatar': user.gravatar,
              'gravatar30': user.gravatar30,
              'gravatar50': user.gravatar50,
              'gravatar80': user.gravatar80,
              'gravatar100':  user.gravatar100,
              'online': user.online,
              'root': user.root,
              'accountVerified': user.accountVerified,
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
        }
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
            'telefone': userFound.profile ? userFound.profile.telefone:'',
            'localAddress': userFound.profile ? userFound.profile.localAddress:'',
            'profile': {
              'needQuestionare': userFound.profile ? userFound.profile.needQuestionare : true
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
    ['email','familyName','givenName','middleName'].map(function(s){
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
          'needQuestionare': request.body.Questionare ? true : false,
          'telefone': request.body.telefone,
          'localAddress': request.body.localAddress
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
              'needQuestionare': userCreated.profile.needQuestionare
            },
            'telefone': userCreated.profile.telefone,
            'localAddress': userCreated.profile.localAddress,
            'root': false,
            'accountVerified':true
            });
        }
      });
    } else {
      response.send(400, 'Value of '+s+' is missed!');
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
//          response.status(400); //not sure about js with it
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
                'telefone': userCreated.profile.telefone,
                'localAddress': userCreated.profile.localAddress
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
//          response.status(400); //not sure about js with it
          response.json({'error':'Unable to send welcome link to owner!'});
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
                'telefone': userCreated.profile.telefone,
                'localAddress': userCreated.profile.localAddress,
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


