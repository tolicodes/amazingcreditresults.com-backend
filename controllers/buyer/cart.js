var ensureBuyerOrOwner = require('../../lib/middleware.js').ensureBuyerOrOwner,
  formatter = require('../../lib/formatter');

module.exports = exports = function (core) {

  core.app.get('/api/v1/cart/tradelines', ensureBuyerOrOwner, function (request, response) {
    var tradelineIds = request.user.profile ? (Object.keys(request.user.profile.cart || {})) : [];
    core.async.map(tradelineIds,
      function (id, cb) {
        request.model.TradeLine
          .findById(id)
          .populate('product')
          .lean()
          .exec(cb);
      },
      function (error, tradeLinesFound) {
        if (error) {
          throw error;
        } else {
         
          response.json({
            'data': tradeLinesFound.map(
                formatter.formatTradelineForBuyer.bind(null, request.user)
            ),
            'itemsInCart': tradeLinesFound.length
          });
        }
      });
  });

  core.app.post('/api/v1/cart/tradelines', ensureBuyerOrOwner, function (request, response) {
    if (request.body.id) {
      core.async.waterfall([
        function (cb) {
          request.model.TradeLine.findById(request.body.id, cb);
        }
      ], function (error, tradeLineFound) {
        if (error) {
          throw error;
        } else {
          if (tradeLineFound) {
            if (tradeLineFound.active) {
              request.user.profile = request.user.profile || {};
              request.user.profile.cart = request.user.profile.cart || []; 
              request.user.profile.cart['' + tradeLineFound.id] = true;
              request.user.update({$addToSet: {'profile.cart' : tradeLineFound.id}}, function (error) {
                if (error) {
                  throw error;
                } else {
                  response.status(202);
                  response.json({'status': 'Ok'});
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

  core.app.delete('/api/v1/cart/tradelines/:id', ensureBuyerOrOwner, function (request, response) {
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
          response.status(202);
          response.json({'status': 'Ok'});
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
};
