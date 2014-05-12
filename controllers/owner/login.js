//controller that covers owners login
module.exports = exports = function(core){
  core.app.get('/', function(request,response){
    response.render('landing', {'title':'Welcome!'});
  });

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

}

