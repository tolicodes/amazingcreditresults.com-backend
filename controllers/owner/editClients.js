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
}

/**
 * @swagger
 * path: /admin/clients
 * operations:
 *   -  httpMethod: GET
 *      nickname: Owner dashboard for editing clients
 */
  core.app.get('/admin/clients', ensureAdmin, function(request, response){
    response.send('clients')
  });

/**
 * @swagger
 * path: /admin/clients.json
 * operations:
 *   -  httpMethod: GET
 *      nickname: Owners' json endpoing with data about clients
 */
  core.app.get('/admin/clients.json', ensureAdmin, function(request, response){
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
              "id": user.id,
              "email": user.email,
              "name": {
                "familyName" : user.name.familyName,
                "givenName" : user.name.givenName,
                "middleName" : user.name.middleName,
              },
              "gravatar": user.gravatar,
              "gravatar30": user.gravatar30,
              "gravatar50": user.gravatar50,
              "gravatar80": user.gravatar80,
              "gravatar100":  user.gravatar100,
              "online": user.online,
              "root": user.root,
              "accountVerified": user.accountVerified
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
          response.json({
              "id": user.id,
              "email": user.email,
              "name": {
                "familyName" : user.name.familyName,
                "givenName" : user.name.givenName,
                "middleName" : user.name.middleName,
              },
              "gravatar": user.gravatar,
              "gravatar30": user.gravatar30,
              "gravatar50": user.gravatar50,
              "gravatar80": user.gravatar80,
              "gravatar100":  user.gravatar100,
              "online": user.online,
              "root": user.root,
              "accountVerified": user.accountVerified
            });
        } else {
          response.send(404);
        }
      }
    });
  });

  core.app.put('/admin/clients/:id', ensureAdmin, function(request, response){

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
          'needQuestionare': request.body.Questionare ? true : false
        },
        'root': false
      }, function(error, userCreated){
        if(error) {
          throw error;
        } else {
          response.status(201);
          response.json(userCreated);
        }
      });
    } else {
      response.send(400, 'Value of '+s+' is missed!');
    }
  });

//send message with link to site
  core.app.post('/admin/clients/notify/:id', ensureAdmin,function(request, response){
    request.model.User.findById(request.params.id, function(error, userFound){
      if(error) {
        throw error;
      } else {
        var welcomeLink;
        core.async.waterfall([
          function(cb){
            userFound.invalidateSession(cb);
          },
          function(newApiKey, cb){
            welcomeLink = core.config.hostUrl+'/buyer/welcome/'+newApiKey;
            userFound.notifyByEmail({
              'layout':false,
              'template':'emails/welcome',
              'subject':'Site access hyperlink',
              'name': userFound.name,
              'welcomeUrl': welcomeLink
            });
            cb();
          }
        ], function(err){
          if(err) {
            throw err;
          } else {
            response.json({'user':userFound, 'welcomeLink':welcomeLink});
          }
        });
      }
    });
  });
};