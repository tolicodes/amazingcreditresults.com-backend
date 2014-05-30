//controller that covers owners login via header based authorization
module.exports = exports = function(core){
  core.app.post('/api/v1/owner/login', function(request, response){
    if(request.body.username && request.body.password){
      request.model.User.findOneByEmail(request.body.username, function(error, userFound){
        if(error){
          throw error;
        } else {
          if(userFound && userFound.root && userFound.verifyPassword(request.body.password)){
            response.status(200);
            response.json({'Code':200, 'id':userFound.id,'huntKey':userFound.apiKey,'name':userFound.name})
          } else {
            response.status(403);
            response.json({'Code':403,'Error':'Unable to authorize Owner with this credentials!'});
          }
        }
      });
    } else {
      response.status(400);
      response.json({'Code':400,'Error':'The values of `username` or `password` are not provided!'});
    }
  });
};

