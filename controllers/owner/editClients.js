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
    response.json([]);
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

  core.app.post('/admin/clients/:id', function(request, response){});
};