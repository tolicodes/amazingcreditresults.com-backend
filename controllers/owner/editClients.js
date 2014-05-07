//controller for owner users to edit the clients list

module.exports = exports = function(core){
  core.app.get('/admin/clients', function(request, response){});

  core.app.get('/admin/clients/:id', function(request, response){});

  core.app.put('/admin/clients/:id', function(request, response){});

  core.app.post('/admin/clients/:id', function(request, response){});
};