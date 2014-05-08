//controller for owner users to edit the clients list

/**
 * @swagger
 * resourcePath: /admin/
 * description: Owners API for editing clients
 */


module.exports = exports = function(core){
/**
 * @swagger
 * path: /admin/clients
 * operations:
 *   -  httpMethod: GET
 *      nickname: Owner dashboard for editing clients
 */
  core.app.get('/admin/clients', function(request, response){
    response.send('clients')
  });

/**
 * @swagger
 * path: /admin/clients.json
 * operations:
 *   -  httpMethod: GET
 *      nickname: Owners' json endpoing with data about clients
 */
  core.app.get('/admin/clients.json', function(request, response){
    if(request.user && request.user.root){
      request.model.User
        .find({

        })
        .limit(100)
        .skip()
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
                "root":user.root,

              }
            });
            response.json(usersPrepared);
          }
        });
    } else {
      response.send(403);
    }
  });

/**
 * @swagger
 * path: /admin/clients/:id
 * operations:
 *   -  httpMethod: GET
 *      nickname: Owners json with data about clients
 */
  core.app.get('/admin/clients/:id', function(request, response){});

  core.app.put('/admin/clients/:id', function(request, response){});

  core.app.post('/admin/clients', function(request, response){});
};