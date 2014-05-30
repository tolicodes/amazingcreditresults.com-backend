//https://oselot.atlassian.net/browse/ACR-197
//https://oselot.atlassian.net/browse/ACR-198
var ensureUserIsOwnerMiddleware = require('./../middleware.js').ensureOwner;

module.exports = exports = function (core) {

  function formatProduct(product) {
    return product;
  }

  function formatTradeline(product) {
    return product;
  }

  core.app.get('/api/v1/owner/tradelines', ensureUserIsOwnerMiddleware, function (request, response) {
    var filter = {};
    [ 'product', 'seller', 'totalAus', 'usedAus',
      'creditLimit', 'cashLimit', 'currentBalance',
      '_ncRating', '_bcRating', '_moRating',
      'ncRating', 'bcRating', 'moRating',
      'cost', 'price', 'active'].map(function (field) {
        if (request.query[field]) {
          filter[field] = request.query[field];
        }
      });
    request.model.TradeLine
      .find(filter)
      .skip(request.query.skip || 0)
      .limit(request.query.limit || 30)
      .sort('+_id')
      .populate('seller')
      .populate('product')
      .exec(function (error, tradeLines) {
        if (error) {
          throw error;
        } else {
          response.json({
            'metaData': {},
            'data': tradeLines.map(formatTradeline)
          });
        }
      });
  });

  core.app.get('/api/v1/owner/tradelines/:id', ensureUserIsOwnerMiddleware, function (request, response) {
    request.model.TradeLine
      .findById(request.params.id)
      .populate('seller')
      .populate('product')
      .exec(function (error, tradelineFound) {
        if (error) {
          throw error;
        } else {
          if (tradelineFound) {
            response.json({'data': tradelineFound});
          } else {
            response.status(404);
            response.json({
              'status': 'Error',
              'errors': [
                {
                  'code': 404,
                  'message': 'Tradeline with this id ' + request.params.id + ' do not exists!'
                }
              ]
            });
          }
        }
      });
  });

  core.app.post('/api/v1/owner/tradelines', ensureUserIsOwnerMiddleware, function (request, response) {
    var fields = {};
    [
      'product', 'seller', 'totalAus', 'usedAus', 'price',
      'creditLimit', 'cashLimit', 'currentBalance', 'ncRating',
      'bcRating', 'moRating', 'cost', 'notes'
    ].map(function (field) {
        if (request.body[field]) {
          fields[field] = request.body[field];
        }
      });
    var newTradeLine = new request.model.TradeLine(fields);
    newTradeLine.save(function (error, tradelineCreated) {
      if (error) {
        throw error;
      } else {
        response.status(201);
        response.json({data: tradelineCreated});
      }
    });
  });

  core.app.put('/api/v1/owner/tradelines/:id', ensureUserIsOwnerMiddleware, function (request, response) {
    request.model.TradeLine.findById(request.params.id, function (error, tradeLineFound) {
      if (error) {
        throw error;
      } else {
        if (tradeLineFound) {
          [
            'product', 'seller', 'totalAus', 'usedAus', 'price',
            'creditLimit', 'cashLimit', 'currentBalance', 'ncRating',
            'bcRating', 'moRating', 'cost', 'notes'
          ].map(function (field) {
              if (request.body[field]) {
                tradeLineFound[field] = request.body[field];
              }
            });

          tradeLineFound.save(function (err, tradeLineSaved) {
            if (err) {
              throw err;
            } else {
              response.status(202);
              response.json({data: tradeLineSaved});
            }
          });

        } else {
          response.status(404);
          response.json({
            'status': 'Error',
            'errors': [
              {
                'code': 404,
                'message': 'Tradeline with this id ' + request.params.id + ' do not exists!'
              }
            ]
          });
        }
      }
    });
  });

  core.app.delete('/api/v1/owner/tradelines/:id', ensureUserIsOwnerMiddleware, function (request, response) {
    request.model.TradeLine.findOneAndUpdate(
        {'_id': request.params.id},
        { 'active': false },
        {'upsert': false},
        function (error, tradeLineArchived) {
          if(error){
            throw error;
          } else {
            response.status(202);
            response.json({'status':'Tradeline archived'});
          }
        });
  });
};