module.exports = exports = function (core) {
//https://oselot.atlassian.net/browse/ACR-191

  function ensureUserIsOwnerMiddleware(request, response, next) {
    if (request.user && request.user.root) {
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
    }
  }

  function formatProduct(product) {
    return product;
  }

  core.app.get('/api/v1/owner/products', ensureUserIsOwnerMiddleware, function (request, response) {
    request.model.Product.find({
      //todo - add some search parameters later
    })
      .limit(100)
      .skip()
      .sort('+name')
      .exec(function (error, productsFound) {
        if (error) {
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

  core.app.get('/api/v1/owner/products/:id', ensureUserIsOwnerMiddleware, function (request, response) {
    request.model.Product.findById(request.params.id, function (error, product) {
      if (error) {
        throw error;
      } else {
        if (product) {
          response.json({
            'data': formatProduct(product)
          });
        } else {
          response.status(400);
          response.json({
            'status': 'Error',
            'errors': [
              {
                'code': 404,
                'message': 'Product with this id do not exists!'
              }
            ]
          });
        }
      }
    });
  });

  core.app.post('/api/v1/owner/products', ensureUserIsOwnerMiddleware, function (request, response) {
    var params = {};

    [
      'name', 'bank', 'type', 'ncRating', 'bcRating',
      'moRating', 'reportsToExperian',
      'reportsToEquifax', 'reportsToTransunion'
    ].map(function (n) {
        if (request.body[n]) {
          params[n] = request.body[n];
        }
    });

    request.model.Product.create(params, function (error, productCreated) {
      if (error) {
        throw error;
      } else {
        response.status(201);
        response.json({'data': productCreated});
      }
    });
  });

//actually the patch behavior
  core.app.put('/api/v1/owner/products/:id', ensureUserIsOwnerMiddleware, function (request, response) {
    var patch = {};

    [
      'name', 'bank', 'type', 'ncRating', 'bcRating',
      'moRating', 'reportsToExperian',
      'reportsToEquifax', 'reportsToTransunion'
    ].map(function (n) {
        if (request.body[n]) {
          patch[n] = request.body[n];
        }
    });


    request.model.Product.findOneAndUpdate({'_id': request.params.id},
      patch,
      function (error, productUpdated) {
        if (error) {
          throw error;
        } else {
          response.status(201);
          response.json({'data': productUpdated});
        }
      });
  });

  core.app.delete('/api/v1/owner/products/:id', ensureUserIsOwnerMiddleware, function (request, response) {
    if (request.params.id) {
      var id;
      core.async.waterfall([
        function (cb) {
          request.model.Product.findById(request.params.id, cb);
        },
        function (productFound, cb) {
          if (productFound) {
            id = productFound.id;
            request.model.TradeLine.count({'product': productFound.id}, cb);
          } else {
            cb(new Error('code404'));
          }
        },
        function (productsCount, cb) {
          if (productsCount === 0) {
            cb(null);
          } else {
            cb(new Error('code400'));
          }
        },
        function (cb) {
          request.model.Product.remove({'_id': id}, cb);
        }
      ], function (error) {
        if (error) {
          switch (error.message) {
            case 'code404':
              response.status(404);
              response.json({
                'status': 'Error',
                'errors': [
                  {
                    'code': 404,
                    'message': 'Product with this ID do not exists!'
                  }
                ]
              });
              break;
            case 'code400':
              response.status(400);
              response.json({
                'status': 'Error',
                'errors': [
                  {
                    'code': 400,
                    'message': 'Product with this ID is used by Tradelines!'
                  }
                ]
              });
              break;
            default:
              throw error;
          }
        } else {
          response.status(202);
          response.json({
            'status': 'deleted'
          });
        }
      });
    } else {
      response.status(400);
      response.json({
        'status': 'Error',
        'errors': [
          {
            'code': 400,
            'message': 'ID is not defined!'
          }
        ]
      });
    }
  });
};