var ensureOwner = require('./../middleware.js').ensureOwner;
//https://oselot.atlassian.net/browse/ACR-313
module.exports = exports = function (core) {

  core.app.get('/api/v1/admin/owners', ensureOwner, function (request, response) {
    request.model.User.find({'$or': [
      {'roles.owner': true},
      {root: true}
    ]})
      .sort('+_id')
      .exec(function (error, owners) {
        if (error) {
          throw error;
        } else {
          response.json(
            {
              'data': owners.map(function (owner) {
                return {
                  'id': owner.id,
                  'name': owner.name,
                  'root': owner.root,
                  'email': owner.email,
                  'roles': owner.roles,
                  'isBanned': owner.isBanned
                };
              })
            }
          );
        }
      });
  });

  core.app.get('/api/v1/admin/owners/:id', ensureOwner, function (request, response) {
    request.model.User.findOne({
      'id': request.params.id,
      '$or': [
        {'roles.owner': true},
        {root: true}
      ]})
      .exec(function (error, owner) {
        if (error) {
          throw error;
        } else {
          if (owner) {
            response.json({
              'data': {
                'id': owner.id,
                'name': owner.name,
                'root': owner.root,
                'email': owner.email,
                'roles': owner.roles,
                'isBanned': owner.isBanned
              }
            });
          } else {
            response.status(404);
            response.json({
              'status': 'Error',
              'errors': [
                {
                  'code': 404,
                  'message': 'Owner with this id do not exists!'
                }
              ]
            });
          }
        }
      });
  });

//https://oselot.atlassian.net/browse/ACR-58
  core.app.post('/api/v1/admin/owners', ensureOwner, function (request, response) {
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

  core.app.put('/api/v1/admin/owners/:id', function (request, response) {
    var id = request.params.id;
    if (request.user.root || request.user.id === id) {
      request.model.User.findOne({
          'id': id,
          '$or': [
            {'roles.owner': true},
            {'root': true}
          ]}, function (error, ownerFound) {
          if (error) {
            throw error;
          } else {
            if (ownerFound) {
              if (request.body.name) {
                ['familyName', 'middleName', 'givenName'].map(function (n) {
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
                  response.json({'data': {
                    'id': ownerFound.id,
                    'name': ownerFound.name,
                    'root': ownerFound.root,
                    'email': ownerFound.email,
                    'roles': ownerFound.roles,
                    'isBanned': ownerFound.isBanned
                  }});
                }
              }

              if (request.body.password) {
                ownerFound.setPassword(request.body.password, cb); //it also saves him/her
              } else {
                ownerFound.save(cb);
              }

            } else {
              response.status(404);
              response.json({
                'status': 'Error',
                'errors': [
                  {
                    'code': 404,
                    'message': 'Owner with this id do not exists!'
                  }
                ]
              });
            }
          }
        }
      );
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
  });

  core.app.delete('/api/v1/admin/owners/:id', function (request, response) {
    var id = request.params.id;
    if (request.user.root || request.user.id === id) {
      request.model.User.findOne({
          'id': id,
          '$or': [
            {'roles.owner': true},
            {'root': true}
          ]}, function (error, ownerFound) {
          if (error) {
            throw error;
          } else {
            if (ownerFound) {
              ownerFound.isBanned = true;
              ownerFound.save(function (error) {
                if (error) {
                  throw error;
                } else {
                  response.status(202);
                  response.json({'data': {
                    'id': ownerFound.id,
                    'name': ownerFound.name,
                    'root': ownerFound.root,
                    'email': ownerFound.email,
                    'roles': ownerFound.roles,
                    'isBanned': true
                  }});
                }
              })
            } else {
              response.status(404);
              response.json({
                'status': 'Error',
                'errors': [
                  {
                    'code': 404,
                    'message': 'Owner with this id do not exists!'
                  }
                ]
              });
            }
          }
        }
      );
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
  });
};
