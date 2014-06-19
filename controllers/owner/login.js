//controller that covers owners login via header based authorization
module.exports = exports = function (core) {
  core.app.post('/api/v1/owner/login', function (request, response) {
    if (request.body.username && request.body.password) {
      request.model.User.findOneByEmail(request.body.username, function (error, userFound) {
        if (error) {
          throw error;
        } else {
          if (userFound && (userFound.roles && userFound.roles.owner === true) && userFound.verifyPassword(request.body.password)) {
            response.status(200);
            response.json({'Code': 200, 'id': userFound.id, 'huntKey': userFound.apiKey, 'name': userFound.name});
          } else {
            response.status(403);
            response.json({
              'status': 'Error',
              'errors': [
                {
                  'code': 403,
                  'message': 'Invalid username or password. Please try again using correct username and password.'
                  //'field': 'username' //https://oselot.atlassian.net/browse/ACR-304#
                }
              ]
            });
          }
        }
      });
    } else {
      response.status(400);
      var errors = [];

      if (!request.body.username) {
        errors.push({
          'code': 400,
          'message': 'Username is not provided!',
          'field': 'username'
        });
      }

      if (!request.body.password) {
        errors.push({
          'code': 400,
          'message': 'Password is not provided!',
          'field': 'password'
        });
      }

      response.json({
        'status': 'Error',
        'errors': errors
      });

    }
  });
};

