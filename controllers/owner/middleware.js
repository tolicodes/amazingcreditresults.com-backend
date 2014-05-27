module.exports = exports = function(request, response, next){
  if(request.user){
      if (request.user.root) {
        next();
      } else {
        response.status(403);
        response.json({
          'status': 'Error',
          'errors': [
            {
              'code': 403,
              'message': 'Access denied!'
            }
          ]
        });
      }
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
};
