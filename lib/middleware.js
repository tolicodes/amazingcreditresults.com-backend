/*
 * Access control middlewares, used by all controllers
 */
var utilities = require('./utilities.js');
var _ = require('underscore');

function ensureRole(hasRole, request, response, next) {
  if (!request.user) {
    return utilities.error(401, 'Authorization required!', response);
  } else if (!hasRole) {
    return utilities.error(403, 'Access Denied!', response);
  } else {
    next();
  }
}

exports.ensureRole = function(roles) {
  roles = _.isString(roles) ? [roles] : roles;

  return function(request, response, next){
    if(!request.user || !request.user.roles) {
      return utilities.error(401, 'Authorization required!', response);
    }

    var authed = false;

    _(roles).each(function(role){
      if(request.user.roles[role]) {
        authed =true;
      }
    });

    if(!authed) {
       return utilities.error(403, 'Access Denied!', response);
    } else {
      next();
    }
  }
};

exports.ensureBuyer = function(request){
  ensureRole.apply(['buyer'].concat(arguments));
};

exports.ensureOwner = function (request, response, next) {
  ensureRole(
    request.user && request.user.roles && (request.user.roles.owner),
    request,
    response,
    next
  );
};

exports.ensureSellerOrOwner = function (request, response, next) {
  ensureRole(
    request.user && request.user.roles && (request.user.roles.owner || request.user.roles.seller),
    request,
    response,
    next
  );
};

exports.ensureBuyerOrOwner = function (request, response, next) {
  ensureRole(
    request.user && request.user.roles && (request.user.roles.owner || request.user.roles.buyer),
    request,
    response,
    next
  );
};

exports.ensureBuyerOrSeller = function (request, response, next) {
  ensureRole(
      request.user && request.user.roles && (request.user.roles.owner || request.user.roles.buyer || request.user.roles.seller),
    request,
    response,
    next
  );
};