//https://oselot.atlassian.net/browse/ACR-208
var ensureSellerOrOwner = require('./../middleware.js').ensureSellerOrOwner;

module.exports = exports = function (core) {

  function formatProduct(product) {
    return product;
  }

  function formatTradeline(t) {
    return {
      'id': t._id,
      'totalAus': t.totalAus,
      'usedAus': t.usedAus,
      'creditLimit': t.creditLimit,
      'cashLimit': t.cashLimit,
      'currentBalance': t.currentBalance,
      'cost': t.cost,
      'seller': t.seller,
      'statementDate': t.statementDate,
      'dateOpen': t.dateOpen,
      'availableAus': t.availableAus,
      'product': {
        'id':t.product.id,
        'name':t.product.name,
        'bank':t.product.bank,
        'reportsToExperian':t.product.reportsToExperian,
        'reportsToEquifax':t.product.reportsToEquifax,
        'reportsToTransunion':t.product.reportsToTransunion,
        'ncRating': t.product.ncRating,
        'bcRating': t.product.bcRating,
        'moRating': t.product.moRating,
        'type': t.product.type
      },
      'price': t.price,
      'ncRating': t.ncRating,
      'bcRating': t.bcRating,
      'moRating': t.moRating
    }
  }

  core.app.get('/api/v1/seller/tradelines', ensureSellerOrOwner, function (request, response) {
    var filter = {};
    [ 'product', 'totalAus', 'usedAus',
      'creditLimit', 'cashLimit', 'currentBalance', 'statementDate',
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
      .populate('product')
      .exec(function (error, tradeLineFound) {
        if (error) {
          throw error;
        } else {
          if (tradeLineFound) {
            request.model.TradeLineChange
              .find({'tradeLine':tradeLineFound.id})
              .sort('-id')
              .exec(function(error, tradeLineChanges){
                if(error){
                  throw error;
                } else {
                  tradeLineFound.changes = tradeLineChanges;
                  response.json({'data': tradeLineFound});
                }
              });
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
      'creditLimit', 'cashLimit', 'currentBalance', 'ncRating', 'statementDate',
      'bcRating', 'moRating', 'cost'
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
/*/
  core.app.put('/api/v1/seller/tradelines/:id', ensureSellerOrOwner, function (request, response) {
    request.model.TradeLine.findOne({'_id':request.params.id, 'seller' : request.user.id}, function (error, tradeLineFound) {
      if (error) {
        throw error;
      } else {
        if (tradeLineFound) {
          [
            'product', 'totalAus', 'usedAus', 'price',
            'creditLimit', 'cashLimit', 'currentBalance', 'ncRating', 'statementDate',
            'bcRating', 'moRating', 'cost'
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
//*/
  core.app.put('/api/v1/seller/tradelines/:id', ensureSellerOrOwner, function (request, response) {
    request.model.TradeLine.findOne({'_id':request.params.id, 'seller' : request.user.id}, function (error, tradeLineFound) {
      if (error) {
        throw error;
      } else {
        if (tradeLineFound) {
          var changeset = new request.model.TradeLineChange;


          [
            'product', 'totalAus', 'usedAus', 'price',
            'creditLimit', 'cashLimit', 'currentBalance', 'ncRating', 'statementDate',
            'bcRating', 'moRating', 'cost'
          ].map(function (field) {
              if (request.body[field]) {
                changeset[field] = request.body[field];
              }
            });

          changeset.tradeLine = tradeLineFound.id;
          changeset.issuer = request.user.id;
          changeset.seller = request.user.id;

          changeset.save(function (err, tradeLineChangeSaved) {
            if (err) {
              throw err;
            } else {
              response.status(202);
              response.json({data: tradeLineChangeSaved});
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