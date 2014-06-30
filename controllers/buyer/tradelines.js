module.exports = exports = function(core){
  core.app.get('/api/v1/tradelines', function(request, response){
    if(request.user){
      request.model.TradeLine.find({'active':true})
        .skip(0) //todo - pagination. later, when the data structure is accepted
        .limit(15)
//        .populate('seller')
        .populate('product')
        .sort('+name')
        .exec(function(error, tradeLines){
          if(error){
            throw error;
          } else {
            var tradeLinesPrepared = tradeLines.map(function(t){
              return {
                'id': t._id,
/*/
//not shown to buyer as stated here https://oselot.atlassian.net/wiki/display/ACR/Inventory+Table+Requirements
                'totalAus': t.totalAus,
                'usedAus': t.usedAus,
                'creditLimit': t.creditLimit,
                'cashLimit': t.cashLimit,
                'currentBalance': t.currentBalance,
                'cost': t.cost,
                'notes': t.notes,
//*/
//https://oselot.atlassian.net/browse/ACR-409
                'inCart': (request.user.profile && request.user.profile.cart && request.user.profile.cart[t.id]) ? true : false,

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
            });
            response.json({
              'metaData': {
                'totalPages': 1,
                'page':1
              },
              'data':tradeLinesPrepared
            });
          }
        });

    } else {
      response.status(401);
      response.json({
        'status': 'Error',
        'errors': [
          {
            'code': 401,
            'message': 'Authorization required!'
          }
        ]
      });
    }
  });
};
