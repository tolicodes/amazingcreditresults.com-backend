//controller that covers owners login

module.exports = exports = function(core){
  core.app.get('/admin/login', function(request, response){
    response.render('owner/login', {
      'title': 'Owners` login page'
    });
  });
}

