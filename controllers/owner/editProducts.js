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
  var params = {
    'name': request.body.name,
    'bank': request.body.bank,
    'type': request.body.type,
    'ncRating': request.body.ncRating,
    'bcRating': request.body.bcRating,
    'moRating': request.body.moRating,
    'reportsToExperian': request.body.reportsToExperian,
    'reportsToEquifax': request.body.reportsToEquifax,
    'reportsToTransunion': request.body.reportsToTransunion
  };
  request.model.Product.create(params, function(error, productCreated){
    if(error) {
      throw error;
    } else {
      response.status(201);
      response.json({'data':productCreated});
    }
  });
});

//actually the patch behavior
core.app.put('/api/v1/owner/products/:id', ensureUserIsOwnerMiddleware, function(request, response){
  var patch = {};

  [
    'name','bank','type','ncRating','bcRating',
    'moRating','reportsToExperian',
    'reportsToEquifax','reportsToTransunion'
  ].map(function(n){
    if(request.body[n]) {
      patch[n] = request.body[n];
    }
  });


  request.model.Product.findOneAndUpdate({'_id': request.params.id,},
    patch,
    function(error, productUpdated){
      if(error) {
        throw error;
      } else {
        response.status(201);
        response.json({'data': productUpdated});
      }
  });
});

core.app.delete('/api/v1/owner/products/:id', ensureUserIsOwnerMiddleware, function(request, response){
  //not sure about it!
});


}