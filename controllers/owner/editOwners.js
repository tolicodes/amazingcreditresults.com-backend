var ensureRole = require('./../../lib/middleware.js').ensureRole;
var utilities = require('../../lib/utilities');

var fields = ['name', 'root', 'email', 'roles', 'isBanned'];

//https://oselot.atlassian.net/browse/ACR-313
module.exports = exports = function(core) {
  core.app.get('/api/v1/admin/owners', ensureRole('owner'), function(request, response) {
    request.model.User
      .find({
        'roles.owner': true
      })
      .sort('+_id')
      .exec().then(function (data) {
          utilities.returnList(response, data, fields);
      }, utilities.throwError);
  });

  core.app.get('/api/v1/admin/owners/:id', ensureRole('owner'), function(request, response) {
    request.model.User
      .findOne({
        '_id': request.params.id,
        'roles.owner': true
      })
      .exec().then(function (obj) {
          if(!obj) {
            return utilities.error(404, 'Owner not found', res);
          }
          
          res.json(utilities.pickFields(fields, data));
        }, utilities.throwError);
  });

  //https://oselot.atlassian.net/browse/ACR-58
  core.app.post('/api/v1/admin/owners', ensureRole('owner'), function(request, response) {
    if (request.body.username && request.body.password) {
      request.model.User.signUp(request.body.username, request.body.password, function(error, userCreated) {
        if (error) {
          throw error;
        } else {
          userCreated.roles = {
            'owner': true
          };
          userCreated.accountVerified = true;

          userCreated.name = {
            'givenName': request.body.name.givenName,
            'middleName': request.body.name.middleName,
            'familyName': request.body.name.familyName
          };
          
          userCreated.save(function(err) {
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

  core.app.put('/api/v1/admin/owners/:id', ensureRole('owner'), function(request, response) {
    var id = request.params.id;
    if (request.user.root || request.user.id === id) {
      request.model.User.findOne({
        '_id': id,
        '$or': [{
          'roles.owner': true
        }, {
          'root': true
        }]
      }, function(error, ownerFound) {
        if (error) {
          throw error;
        } else {
          if (ownerFound) {
            if (request.body.name) {
              ['familyName', 'middleName', 'givenName'].map(function(n) {
                if (request.body.name[n]) {
                  ownerFound.name[n] = request.body.name[n];
                }
              });
            }

            function cb(error) {
              if (error) {
                throw error;
              } else {
                response.status(202);
                response.json({
                  'data': {
                    'id': ownerFound.id,
                    'name': ownerFound.name,
                    'root': ownerFound.root,
                    'email': ownerFound.email,
                    'roles': ownerFound.roles,
                    'isBanned': ownerFound.isBanned
                  }
                });
              }
            }

            if (request.body.password) {
              if (ownerFound.verifyPassword(request.body.password)) {
                response.status(400);
                response.json({
                  'status': 'Error',
                  'errors': [{
                    'code': 400,
                    'message': 'Old password was used!'
                  }]
                });
              } else {
                ownerFound.setPassword(request.body.password, cb); //it also saves him/her
              }
            } else {
              ownerFound.save(cb);
            }

          } else {
            response.status(404);
            response.json({
              'status': 'Error',
              'errors': [{
                'code': 404,
                'message': 'Owner with this id do not exists!'
              }]
            });
          }
        }
      });
    } else {
      response.status(403);
      response.json({
        'status': 'Error',
        'errors': [{
          'code': 403,
          'message': 'Access denied!'
        }]
      });
    }
  });

  core.app.delete('/api/v1/admin/owners/:id', ensureRole('owner'), function(request, response) {
    var id = request.params.id;
    if (request.user.root || request.user.id === id) {
      request.model.User.findOne({
        '_id': id,
        '$or': [{
          'roles.owner': true
        }, {
          'root': true
        }]
      }, function(error, ownerFound) {
        if (error) {
          throw error;
        } else {
          if (ownerFound) {
            ownerFound.isBanned = true;
            ownerFound.save(function(error) {
              if (error) {
                throw error;
              } else {
                response.status(202);
                response.json({
                  'data': {
                    'id': ownerFound.id,
                    'name': ownerFound.name,
                    'root': ownerFound.root,
                    'email': ownerFound.email,
                    'roles': ownerFound.roles,
                    'isBanned': true
                  }
                });
              }
            });
          } else {
            response.status(404);
            response.json({
              'status': 'Error',
              'errors': [{
                'code': 404,
                'message': 'Owner with this id do not exists!'
              }]
            });
          }
        }
      });
    } else {
      response.status(403);
      response.json({
        'status': 'Error',
        'errors': [{
          'code': 403,
          'message': 'Access denied!'
        }]
      });
    }
  });
};
