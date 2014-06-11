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
      .exec(function (error, tradeLineFound) {
        if (error) {
          throw error;
        } else {
          if (tradeLineFound) {
            request.model.TradeLineChange
              .find({'tradeLine': tradeLineFound.id})
              .sort('-_id')
              .populate('issuer')
              .populate('reviewer')
              .exec(function (error, tradeLineChanges) {
                if (error) {
                  throw error;
                } else {
//                  console.log(tradeLineChanges);
                  tradeLineFound.changes = tradeLineChanges || [];
//                  console.log(tradeLineFound);
                  response.json({'data': tradeLineFound, 'changes': tradeLineChanges});
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

  core.app.post('/api/v1/owner/tradelines', ensureUserIsOwnerMiddleware, function (request, response) {
    var fields = {};
    [
      'product', 'seller', 'totalAus', 'usedAus', 'price',
      'creditLimit', 'cashLimit', 'currentBalance', 'ncRating', 'statementDate',
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
          var tradeLineChange = new request.model.TradeLineChange;
          tradeLineChange.tradeLine = tradeLineFound.id;
          tradeLineChange.issuer = request.user.id;
          tradeLineChange._status = 1;

          [
            'product', 'seller', 'totalAus', 'usedAus', 'price',
            'creditLimit', 'cashLimit', 'currentBalance', 'ncRating', 'statementDate',
            'bcRating', 'moRating', 'cost', 'notes'
          ].map(function (field) {
              if (request.body[field]) {
                tradeLineFound[field] = request.body[field];
                tradeLineChange[field] = request.body[field];
              }
            });
          core.async.parallel({
            'tradeline': function (cb) {
              tradeLineFound.save(cb);
            },
            'change': function (cb) {
              tradeLineChange.save(cb);
            }
          }, function (err, obj) {
            if (err) {
              throw err;
            } else {
              response.status(202);
              response.json({data: tradeLineFound });
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
        if (error) {
          throw error;
        } else {
          if (tradeLineArchived) {
            response.status(202);
            response.json({'status': 'Tradeline archived'});
          } else {
            response.status(404);
            response.json({
              "status": "Error",
              "errors": [
                {
                  "code": 404,
                  "message": "Tradeline with this ID do not exists!"
                }
              ]
            });
          }
        }
      });
  });

//ACR-254
  core.app.post(/^\/api\/v1\/owner\/tradelines\/([a-f0-9]+)\/changeset\/([a-f0-9]+)\/approve/, function (request, response) {
    var tradeLineId = request.params[0],
      changeId = request.params[1];
    core.async.parallel({
      'tradeLine': function (cb) {
        request.model.TradeLine.findById(tradeLineId, cb);
      },
      'tradeLineChange': function (cb) {
        request.model.TradeLine.find({'_id': changeId, 'tradeLine': tradeLineId}, cb);
      }
    }, function (error, obj) {
      if (error) {
        throw error;
      } else {
        if (obj.tradeLine && obj.tradeLineChange) {
          obj.tradeLineChange.approve(request.user, function (err) {
            if (err) {
              throw err;
            } else {
              response.json({
                'tradeLine': obj.tradeLine,
                'tradeLineChange': obj.tradeLineChange,
                'status': 'approve'
              });
            }
          });
        } else {
          response.status(404);
          response.json({
            "status": "Error",
            "errors": [
              {
                "code": 404,
                "message": "Tradeline or TradelineChange with this IDs do not exists!"
              }
            ]
          });

        }
      }
    });
  });

  core.app.post(/^\/api\/v1\/owner\/tradelines\/([a-f0-9]+)\/changeset\/([a-f0-9]+)\/deny/, function (request, response) {
    var tradeLineId = request.params[0],
      changeId = request.params[1];
    core.async.parallel({
      'tradeLine': function (cb) {
        request.model.TradeLine.findById(tradeLineId, cb);
      },
      'tradeLineChange': function (cb) {
        request.model.TradeLine.find({'_id': changeId, 'tradeLine': tradeLineId}, cb);
      }
    }, function (error, obj) {
      if (error) {
        throw error;
      } else {
        if (obj.tradeLine && obj.tradeLineChange) {
          obj.tradeLineChange.deny(request.user, function (err) {
            if (err) {
              throw err;
            } else {
              response.json({
                'tradeLine': obj.tradeLine,
                'tradeLineChange': obj.tradeLineChange,
                'status': 'approve'
              });
            }
          });
        } else {
          response.status(404);
          response.json({
            "status": "Error",
            "errors": [
              {
                "code": 404,
                "message": "Tradeline or TradelineChange with this IDs do not exists!"
              }
            ]
          });

        }
      }
    });
  });

};