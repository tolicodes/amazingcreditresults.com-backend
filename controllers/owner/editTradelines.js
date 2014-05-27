module.exports = exports = function (core) {
//https://oselot.atlassian.net/browse/ACR-197

  function ensureUserIsOwnerMiddleware(request, response, next) {
    if(request.user){
      if (request.user.root) {
        next();
      } else {
        response.status(403);
        response.json({
          'status': 'Error',
          'errors': [
            {
              'code': 403,
              'message': 'Access denied!'
            }
          ]
        });
      } else {
        response.status(401);
        response.json({
          'status': 'Error',
          'errors': [
            {
              'code': 401,
              'message': 'Authorization required!'
            }
          ]
        });
      }
  }

  function formatProduct(product) {
    return product;
  }
  function formatTradeline(product) {
    return product;
  }

  core.app.get('/api/v1/owner/tradelines', ensureUserIsOwnerMiddleware, function(request, response){

  });

  core.app.post('/api/v1/owner/tradelines', ensureUserIsOwnerMiddleware, function(request, response){

  });

  core.app.get('/api/v1/owner/tradelines/:id', ensureUserIsOwnerMiddleware, function(request, response){

  });

  core.app.put('/api/v1/owner/tradelines/:id', ensureUserIsOwnerMiddleware, function(request, response){

  });


};