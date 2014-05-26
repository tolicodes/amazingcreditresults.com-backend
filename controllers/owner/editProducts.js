module.exports = exports = function(core){
//https://oselot.atlassian.net/browse/ACR-191

function ensureUserIsOwnerMiddleware(request, response, next){
  if(request.user && request.user.root){
    next();
  } else {
    response.status(403);
    response.json({
        'status': 'Error',
        'errors': [{
          'code': 403,
          'message': 'Access denied!'
        }]
    });
  }
}

function formatProduct(product){
  return product;
}

core.app.get('/api/v1/owner/products', ensureUserIsOwnerMiddleware, function(request, response){
  request.model.Product.find({
    //todo - add some search parameters later
  })
  .limit(100)
  .skip()
  .sort('+name')
  .exec(function(error, productsFound){
    if(error){
      throw error;
    } else {
      response.json({
        'metaData': {
          'totalPages': 1,
          'page': 1
        },
        'data': productsFound.map(formatProduct)
      });
    }
  });
});

core.app.get('/api/v1/owner/products/:id', ensureUserIsOwnerMiddleware, function(request, response){
  request.model.Product.findById(request.params.id, function (error, product) {
    if (error) {
      throw error;
    } else {
      if(product){
        response.json({
          'data':formatProduct(product)
        });
      } else {
        response.status(400);
        response.json({
          'status': 'Error',
          'errors': [{
            'code': 404,
            'message': 'Product with this id do not exists!'
          }]
        });
      }
    }
  });
});

core.app.post('/api/v1/owner/products', ensureUserIsOwnerMiddleware, function(request, response){

});

core.app.put('/api/v1/owner/products/:id', ensureUserIsOwnerMiddleware, function(request, response){

});

core.app.delete('/api/v1/owner/products/:id', ensureUserIsOwnerMiddleware, function(request, response){
  //not sure about it!
});


}