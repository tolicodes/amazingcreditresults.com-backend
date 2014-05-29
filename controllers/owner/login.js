//controller that covers owners login
module.exports = exports = function(core){
/*/
  core.app.get('/', function(request,response){
    response.render('landing', {'title':'Welcome!'});
  });

//session based authorization.
  core.app.get('/admin/login', function(request, response){
    response.render('owner/login', {
      'title': 'Owners` login page'
    });
  });

  core.app.get('/auth/success', function(request, response){
    if(request.user && request.user.root){
      request.flash('success', 'Welcome!');
      response.redirect('/admin/clients');
    } else {
      response.send(404);
    }
  });

  core.app.get('/auth/failure', function(request, response){
    request.flash('error','Authentication failed!');
    response.redirect('/admin/login');
  });
//*/

//header based authorization
  core.app.post('/api/v1/owner/login', function(request, response){
    if(request.body.username && request.body.password){
      request.model.User.findOneByEmail(request.body.username, function(error, userFound){
        if(error){
          throw error;
        } else {
          if(userFound && userFound.root && userFound.verifyPassword(request.body.password)){
            response.status(200);
            response.json({'Code':200, 'huntKey':userFound.apiKey})
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

