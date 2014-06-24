var ensureBuyerOrOwner = require('../../lib/middleware.js').ensureBuyerOrOwner;

module.exports = exports = function (core) {

  core.app.get('/api/v1/cart/items', ensureBuyerOrOwner, function (request, response) {
    var tradelineIds = request.user.profile ? (request.user.profile.cart.keys() || []) : [];
    core.async.map(tradelineIds,
      request.model.TradeLine.findById,
      function (error, tradeLinesFound) {
        if (error) {
          throw error;
        } else {
          response.json({
            'data': tradeLinesFound,
            'itemsInCart': tradeLinesFound.length
          });
        }
      });
  });

  core.app.post('/api/v1/cart/items', ensureBuyerOrOwner, function (request, response) {
    if (request.params.id) {
      core.async.waterfall([
        function (cb) {
          request.model.TradeLine.findById(request.params.id, cb);
        }
      ], function (error, tradeLineFound) {
        if (error) {
          throw error;
        } else {
          if (tradeLineFound) {
            if (tradeLineFound.active) {
              request.user.profile = request.user.profile || {};
              request.user.profile.cart = request.user.profile.cart || {};
              request.user.profile.cart['' + tradeLineFound.id] = true;
              request.user.save(function (error) {
                if (error) {
                  throw error;
                } else {
                  response.status(202);//accepted
                  response.json({'status': 'ok'}); //todo: what is the expected response for it?
                }
              });
            } else {
              response.status(400);
              response.json({
                'status': 'Error',
                'errors': [
                  {
                    'code': 400,
                    'message': 'Tradeline is not available, it is not in active state!'
                  }
                ]
              });
            }
          } else {
            response.status(404);
            response.json({
              'status': 'Error',
              'errors': [
                {
                  'code': 404,
                  'message': 'Tradeline with this id do not exists!'
                }
              ]
            });
          }
        }
      });
    } else {
      response.status(400);
      response.json({
        'status': 'Error',
        'errors': [
          {
            'code': 400,
            'message': 'Tradeline id is missed!'
          }
        ]
      });
    }
  });

  core.app.delete('/api/v1/cart/items/:id', ensureBuyerOrOwner, function (request, response) {
    if (request.params.id) {
      if (request.user.profile && request.user.profile.cart) {
        delete request.user.profile.cart[request.params.id];
      } else {
        request.user.profile = request.user.profile || {};
        request.user.profile.cart = request.user.profile.cart || {};
      }
      request.user.save(function (error) {
        if (error) {
          throw error;
        } else {
          response.status(202);//accepted
          response.json({'status': 'ok'}); //todo: what is the expected response for it?
        }
      });
    } else {
      response.status(400);
      response.json({
        'status': 'Error',
        'errors': [
          {
            'code': 400,
            'message': 'Tradeline id is missed!'
          }
        ]
      });
    }
  });

  core.app.post('/api/v1/cart/checkout', ensureBuyerOrOwner, function (request, response) {
    response.send('okay');
  });
};