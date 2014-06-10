//https://oselot.atlassian.net/browse/ACR-191

var ensureUserIsOwnerMiddleware = require('./../middleware.js').ensureOwner;

module.exports = exports = function (core) {

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
          response.status(404);
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
      'reportsToEquifax', 'reportsToTransunion',
      'improvingShortCreditHistory', 'improvingBadCreditScore', 'improvingMaxedOutCredit',
      'reportsToExperian', 'reportsToEquifax', 'reportsToTransunion',
      'notes'
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

//http://stackoverflow.com/questions/18040315/why-arent-defaults-setters-validators-and-middleware-not-applied-for-findonea
//suprising :-(

  core.app.put('/api/v1/owner/products/:id', ensureUserIsOwnerMiddleware, function (request, response) {
    request.model.Product.findById(request.params.id, function (error, productFound) {
      if (error) {
        throw error;
      } else {
        if (productFound) {
          [
            'name', 'bank', 'type', 'ncRating', 'bcRating',
            'moRating', 'reportsToExperian',
            'reportsToEquifax', 'reportsToTransunion',
            'improvingShortCreditHistory', 'improvingBadCreditScore', 'improvingMaxedOutCredit',
            'reportsToExperian', 'reportsToEquifax', 'reportsToTransunion',
            'notes'
          ].map(function (n) {
              if (request.body[n]) {
                productFound[n] = request.body[n];
              }
            });

          productFound.save(function (err1, productSaved) {
            if (err1) {
              throw err1;
            } else {
              response.status(202);
              response.json({ 'data': productSaved });
            }
          });
        } else {
          response.status(404);
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