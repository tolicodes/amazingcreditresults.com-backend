/*
 * Access control middlewares, used by all controllers
 */

exports.ensureOwner = function (request, response, next) {
  ensureRole(request.user.roles && (request.user.roles.owner), request, response, next)
};

exports.ensureSellerOrOwner = function (request, response, next) {
  ensureRole(request.user.roles && (request.user.roles.owner || request.user.roles.seller), request, response, next)
};

exports.ensureBuyerOrOwner = function (request, response, next) {
  ensureRole(request.user.roles && (request.user.roles.owner || request.user.roles.buyer), request, response, next)
};

function ensureRole(hasRole, request, response, next) {
  if (!request.user) return error(401, 'Authorization required!', response);
  if (!hasRole)      return error(403, 'Access Denied!', response);
  next();
}

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
