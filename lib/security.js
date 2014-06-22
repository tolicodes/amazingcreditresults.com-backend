var utilities = require('./utilities');
var security  = require('./security');


module.exports.roles = {
  owner: 'owner',
  seller: 'seller',
  buyer: 'buyer'
};

module.exports.ensurePermissions = function(route) {
  return function(request, response, next) {
    if(hasAccess(request.user, route)) {
      return next();
    }

    utilities.error(403, 'Access Denied', response);
  }
};



function hasAccess(user, route) {
  return utilities.arraysIntersection(userRoles(user), route.roles).length > 0;
}

function userRoles(user) {
  var result = [];
  for (var role in user.roles) {
    if (user.roles.hasOwnProperty(role) && user.roles[role]) {
      result.push(role);
    }
  }
  return result;
}
