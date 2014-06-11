var ensureOwner = require('./../middleware.js').ensureOwner;
module.exports = exports = function (core) {
//https://oselot.atlassian.net/browse/ACR-58
  core.app.post('/api/v1/admin/createOwner', ensureOwner, function (request, response) {
    if (request.body.username && request.body.password) {
      request.model.User.signUp(request.body.username, request.body.password, function (error, userCreated) {
        if (error) {
          throw error;
        } else {
          userCreated.roles = { owner: true };
          userCreated.accountVerified = true;
          userCreated.name = {'givenName': request.username};
          userCreated.save(function (err) {
            if (err) {
              throw err;
            } else {
              response.status(201);
              response.json(userCreated);
            }
          });
        }
      });
    } else {
      response.status(400);
      var errors = [];
      if (!request.body.apiKey) {
        errors.push({
          'code': 400,
          'message': 'Missed parameter - `username`!',
          'field': 'username'
        });
      }
      if (!request.body.password) {
        errors.push({
          'code': 400,
          'message': 'Missed parameter - `password`!',
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