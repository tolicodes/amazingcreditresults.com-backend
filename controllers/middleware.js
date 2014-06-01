/*
 * Access control middlewares, used by all controllers
 */

exports.ensureOwner = function(request, response, next){
  if(request.user){
      if (request.user.roles && (request.user.roles.owner)) {
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

exports.ensureSellerOrOwner = function(request, response, next){
  if(request.user){
      if (request.user.roles && (request.user.roles.owner || request.user.roles.seller)) {
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

exports.ensureBuyerOrOwner = function(request, response, next){
  if(request.user){
      if (request.user.roles && (request.user.roles.owner || request.user.roles.buyer)) {
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