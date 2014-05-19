module.exports = exports = function(core){
  core.app.get('/api/v1/tradelines', function(request, response){
    if(request.user){
      request.model.TradeLine.find()
        .skip(0)
        .limit(100)
        .sort('+name')
        .exec(function(error, tradelines){
          if(error){
            throw error;
          } else {
            response.json({
              'page':0,
              'tradelines':tradelines
            });
          }
        });

    } else {
      response.status(401);
      response.json({'Code':'401', 'Error':'Authorization required!'});
    }
  });
};
