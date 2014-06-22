module.exports.arraysIntersection = function(first, second) {
  return first.filter(function(n) {
    return second.indexOf(n) != -1
  });
};

module.exports.error = function(code, message, response) {
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

module.exports.http = {
  methods: {
    GET: 'get',
    POST: 'post',
    PUT: 'put',
    DELETE: 'del'
  }
};

var urlPrefix = '/api/v1';

module.exports.addPrefixToRoutePaths = function(routes) {
  return routes.map(function (route) {
    route.path = urlPrefix + route.path;
    return route;
  });
};
