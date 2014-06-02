//https://oselot.atlassian.net/browse/ACR-208
var ensureSellerOrOwner = require('./../middleware.js').ensureSellerOrOwner;

module.exports = exports = function (core) {

  function formatProduct(product) {
    return product;
  }

  function formatTradeline(product) {
    return product;
  }

  core.app.get('/api/v1/seller/tradelines', ensureSellerOrOwner, function (request, response) {
    var filter = {};
    [ 'product', 'totalAus', 'usedAus',
      'creditLimit', 'cashLimit', 'currentBalance',
      '_ncRating', '_bcRating', '_moRating',
      'ncRating', 'bcRating', 'moRating',
      'cost', 'price', 'active'].map(function (field) {
        if (request.query[field]) {
          filter[field] = request.query[field];
        }
      });

    filter.seller = request.user.id;//very important!
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

  core.app.get('/api/v1/seller/tradelines/:id', ensureSellerOrOwner, function (request, response) {
    request.model.TradeLine
      .findOne({'_id':request.params.id, 'seller' : request.user.id}) //very important!
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
                  'message': 'Tradeline with this id do not exists!'
                }
              ]
            });
          }
        }
      });
  });

  core.app.post('/api/v1/seller/tradelines', ensureSellerOrOwner, function (request, response) {
    var fields = {};
    [
      'product', 'totalAus', 'usedAus', 'price',
      'creditLimit', 'cashLimit', 'currentBalance', 'ncRating',
      'bcRating', 'moRating', 'cost', 'notes'
    ].map(function (field) {
        if (request.body[field]) {
          fields[field] = request.body[field];
        }
      });
    fields.seller = request.user.id;//very important!
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

  core.app.put('/api/v1/seller/tradelines/:id', ensureSellerOrOwner, function (request, response) {
    request.model.TradeLine.findOne({'_id':request.params.id, 'seller' : request.user.id}, function (error, tradeLineFound) {
      if (error) {
        throw error;
      } else {
        if (tradeLineFound) {
          [
            'product', 'totalAus', 'usedAus', 'price',
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

  core.app.delete('/api/v1/seller/tradelines/:id', ensureSellerOrOwner, function (request, response) {
    request.model.TradeLine.findOneAndUpdate(
        {'_id': request.params.id, 'seller' : request.user.id},
        { 'active': false },
        {'upsert': false},
        function (error, tradeLineArchived) {
          if(error){
            throw error;
          } else {
            if(tradeLineArchived) {
              response.status(202);
              response.json({'status':'Tradeline archived'});
            } else {
              response.status(404);
              response.json({
                "status": "Error",
                "errors": [{
                  "code": 404,
                  "message": "Tradeline with this ID do not exists!"
                }]
              });
            }
          }
        });
  });
};