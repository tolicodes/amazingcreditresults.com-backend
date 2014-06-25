/*
 * Access control middlewares, used by all controllers
 */

exports.error = function error(code, message, response) {
  response.status(code);
  response.json({
    'status': 'Error',
    'errors': [
      {
        'code': code,
        'message': message
      }
    ]
  });
};

function ensureRole(hasRole, request, response, next) {
  if (!request.user) {
    return exports.error(401, 'Authorization required!', response);
  } else if (!hasRole) {
    return exports.error(403, 'Access Denied!', response);
  } else {
    next();
  }
}

exports.ensureOwner = function (request, response, next) {
  ensureRole(request.user && request.user.roles && (request.user.roles.owner), request, response, next)
};

exports.ensureSellerOrOwner = function (request, response, next) {
  ensureRole(request.user && request.user.roles && (request.user.roles.owner || request.user.roles.seller), request, response, next)
};

exports.ensureBuyerOrOwner = function (request, response, next) {
  ensureRole(request.user && request.user.roles && (request.user.roles.owner || request.user.roles.buyer), request, response, next)
};
