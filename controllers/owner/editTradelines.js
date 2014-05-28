//https://oselot.atlassian.net/browse/ACR-197
//https://oselot.atlassian.net/browse/ACR-198

module.exports = exports = function (core) {
  var ensureUserIsOwnerMiddleware = require('./middleware.js');

  function formatProduct(product) {
    return product;
  }
  function formatTradeline(product) {
    return product;
  }

  core.app.get('/api/v1/owner/tradelines', ensureUserIsOwnerMiddleware, function(request, response){
    request.model.TradeLine
      .find({
        //add filter
      })
      .skip(request.query.skip || 0)
      .limit(request.query.limit || 30)
      .sort('+_id')
      .populate('seller')
      .populate('product')
      .exec(function(error, tradeLines){
        if(error) {
          throw error;
        } else {
          response.json({
            'metaData': {},
            'data': tradeLines.map(formatTradeline)
          });
        }
      });
  });

  core.app.get('/api/v1/owner/tradelines/:id', ensureUserIsOwnerMiddleware, function(request, response){
    request.model.TradeLine
      .findById(request.params.id)
      .exec(function(error, tradelineFound){
        if(error){
          throw error;
        } else {
          if(tradelineFound) {
            response.json(tradelineFound);
          } else {
            response.status(404);
            response.json({
              'status': 'Error',
              'errors': [{
                'code': 404,
                'message': 'Tradeline with this id '+request.params.id+' do not exists!'
              }]
            });
          }
        }
      });
  });

  core.app.post('/api/v1/owner/tradelines', ensureUserIsOwnerMiddleware, function(request, response){
    var fields = {};
    [
     'name','product','seller','totalAus','usedAus',
     'creditLimit','cashLimit','balance','ncRating',
     'bcRating','moRating','cost','notes'
    ].map(function(field){
      if(request.body[field]){
        fields[field]=request.body[field];
      }
    });
    request.model.TradeLine.create(fields, function(error, tradelineCreated){
      if(error) {
        throw error;
      } else {
        response.json(tradelineCreated);
      }
    });
  });

  core.app.put('/api/v1/owner/tradelines/:id', ensureUserIsOwnerMiddleware, function(request, response){
    var fields = {};
    [
     'name','product','seller','totalAus','usedAus',
     'creditLimit','cashLimit','balance','ncRating',
     'bcRating','moRating','cost','notes'
    ].map(function(field){
      if(request.body[field]){
        fields[field]=request.body[field];
      }
    });

    request.model.User.TradeLine(
      { '_id': request.params.id }, patch, { 'upsert': false }, function (error, tradelineFound) {
        if(error) {
          throw error;
        } else {
          if(tradelineFound) {
            response.json(tradelineFound);
          } else {
            response.status(404);
            response.json({
              'status': 'Error',
              'errors': [{
                'code': 404,
                'message': 'Tradeline with this id '+request.params.id+' do not exists!'
              }]
            });
          }
        }
      });
  });

  core.app.delete('/api/v1/owner/tradelines/:id', ensureUserIsOwnerMiddleware, function(request, response){
    response.send('ok)');
  });
};