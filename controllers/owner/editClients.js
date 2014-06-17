//controller for owner users to edit the clients list
var welcomeLinkGenerator = require('./../../lib/welcome.js'),
  formatUser = require('./../formater.js').formatUserForOwner,
  ensureOwner = require('./../middleware.js').ensureOwner;

module.exports = exports = function (core) {

  var frmDt = function (today) {
    var h = today.getHours(),
      m = today.getMinutes();

    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'

    var ampm = h >= 12 ? 'PM' : 'AM';
    m = m < 10 ? '0' + m : m;
    return (today.toLocaleDateString() + ' ' + h + ':' + m + ' ' + ampm + ' GMT');
  };

  core.app.get('/api/v1/admin/clients', ensureOwner, function (request, response) {
    var page = request.query.page || 1,
      order = request.query.order || '+_id';

    request.model.User
      .find({
        //todo - parameters for limiting output
      })
      .limit(100)
      .sort(order)
      .skip() //todo - pagination
      .exec(function (error, usersFound) {
        if (error) {
          throw error;
        } else {
          var usersPrepared = usersFound.map(formatUser);
          response.status(200);
          response.json({'page': page, 'data': usersPrepared});
        }
      });
  });

  core.app.get('/api/v1/admin/clients/:id', ensureOwner, function (request, response) {
    request.model.User.findById(request.params.id, function (error, user) {
      if (error) {
        throw error;
      } else {
        if (user) {
          response.status(200);
          response.json({'data': formatUser(user)});
        } else {
          response.status(404);
          response.json({
            'status': 'Error',
            'errors': [
              {
                'code': 404,
                'message': 'User with this id do not exists!'
              }
            ]
          });
        }
      }
    });
  });

  core.app.put('/api/v1/admin/clients/:id', ensureOwner, function (request, response) {
//https://oselot.atlassian.net/browse/ACR-108
    var patch = {},
      roles = {},
      rolesToSet = false;

    if (request.body.email) {
      patch['keychain.email'] = request.body.email;
    }

    if (request.body.accountVerified === true || request.body.accountVerified === false) {
      patch.accountVerified = request.body.accountVerified;
    }

    if (request.body.accountVerified === true || request.body.accountVerified === false) {
      patch['isBanned'] = request.body.isBanned;
    }

    ['familyName', 'givenName', 'middleName'].map(function (a) {
      if (request.body.name && request.body.name[a]) {
        patch['name.' + a] = request.body.name[a];
      }
    });
    ['title', 'street1', 'street2', 'phone', 'altPhone', 'state', 'city', 'zip', 'needQuestionnaire'].map(function (b) {
      if (request.body[b]) {
        patch['profile.' + b] = request.body[b];
      }
    });
    if (request.body.roles) {
      ['seller', 'buyer'].map(function (role) {
        if (request.body.roles[role] === true || request.body.roles[role] === false) {
          roles[role] = request.body.roles[role];
          rolesToSet = true;
        }
      });

      if (rolesToSet) {
        patch.roles = roles;
      }
    }

    request.model.User.findOneAndUpdate(
      {
        '_id': request.params.id,
        'root': false
      },
      patch,
      {
        'upsert': false // important!
      },
      function (error, userFound) {
        if (error) {
          throw error;
        } else {
          if (userFound) {
            response.status(202);
            response.json(formatUser(userFound));
          } else {
            response.status(404);
            response.json({
              'status': 'Error',
              'errors': [
                {
                  'code': 404,
                  'message': 'User with this ID do not exists!'
                }
              ]
            });
          }
        }
      }
    );
  });


  core.app.post('/api/v1/admin/clients', ensureOwner, function (request, response) {
    var isOk,
      missed;

    if (!request.body.email) {
      isOk = false;
      missed = 'email';
    }

    [
      'familyName',
      'givenName'
      //'middleName' //not mandatory for now
    ].map(function (s) {
      if (request.body.name && request.body.name[s] && typeof request.body.name[s] === 'string') {
        isOk = true;
      } else {
        isOk = false;
        missed = s;
      }
    });

    if (isOk) {
      request.model.User.create({
        'email': request.body.email,
        'name': {
          'givenName': request.body.name.givenName,
          'middleName': request.body.name.middleName,
          'familyName': request.body.name.familyName
        },
        'profile': {
          'needQuestionnaire': request.body.Questionnaire ? true : false,
          'phone': request.body.phone,
          'altPhone': request.body.altPhone,
          'state': request.body.state,
          'city': request.body.city,
          'zip': request.body.zip,
          'street1': request.body.street1,
          'street2': request.body.street2,
          'title': request.body.title
        },
        'roles': {
          'buyer': request.body.roles ? request.body.roles.buyer : true,
          'seller': request.body.roles ? request.body.roles.seller : false
        },
        'root': false
      }, function (error, userCreated) {
        if (error) {
          throw error;
        } else {
          response.status(201);
          response.json(formatUser(userCreated));
        }
      });
    } else {
      response.status(400);
      response.json({
        'status': 'Error',
        'errors': [
          {
            'code': 400,
            'message': 'Required value of ' + missed + ' is missed!'
          }
        ]
      });
    }
  });

//send message with link to site, without reseting the password
  core.app.post('/api/v1/admin/clients/welcome/:id', ensureOwner, function (request, response) {
    request.model.User.findById(request.params.id, function (error, userFound) {
      if (error) {
        throw error;
      } else {
        var welcomeLink = welcomeLinkGenerator();
        if (userFound.roles && userFound.roles.owner === true) {
          response.status(400); //not sure about js with it
          response.json({'error': 'Unable to send welcome link to owner!'});
        } else {
          core.async.waterfall([
            function (cb) {
              userFound.keychain.welcomeLink = welcomeLink;
              userFound.markModified('keychain');
              userFound.invalidateSession(cb);
            },
            function (newApiKey, cb) {
//              welcomeLink = core.config.hostUrl+'buyer/welcome/'+welcomeLink;
              welcomeLink = core.config.hostUrl + '#login/' + welcomeLink;
              var tpl = 'emails/welcomeBuyer';
              if (userFound.roles.buyer) {
                tpl = 'emails/welcomeBuyer';
              }
              if (userFound.roles.seller) {
                tpl = 'emails/welcomeSeller';
              }
              userFound.notifyByEmail({
                'layout': false,
                'template': tpl,
                'subject': 'Site access hyperlink to enter site',//todo - change to something more meaningfull
                'name': userFound.name,
                'welcomeLink': welcomeLink,
                'phone': userFound.profile.phone,
                'street1': userFound.profile.street1,
                'date': frmDt(new Date())
              });
              cb();
            }
          ], function (err) {
            if (err) {
              throw err;
            } else {
              response.status(202);
              response.json({
                'message': 'sent',
                'user': formatUser(userFound),
                'welcomeLink': welcomeLink
              });
            }
          });
        }
      }
    });
  });

  core.app.post('/api/v1/admin/clients/resetPassword/:id', ensureOwner, function (request, response) {
    request.model.User.findById(request.params.id, function (error, userFound) {
      if (error) {
        throw error;
      } else {
        var welcomeLink = welcomeLinkGenerator();
        if (userFound.roles && userFound.roles.owner === true) {
          response.status(400); //not sure about js with it
          response.json({'error': 'Unable to send password reset link to owner!'});
        } else {
          core.async.waterfall([
            function (cb) {
              userFound.keychain.welcomeLink = welcomeLink;
              userFound.markModified('keychain');
              userFound.accountVerified = false;
              userFound.invalidateSession(cb);
            },
            function (newApiKey, cb) {
//              welcomeLink = core.config.hostUrl+'buyer/welcome/'+welcomeLink;
              welcomeLink = core.config.hostUrl + '#login/' + welcomeLink;
              userFound.notifyByEmail({
                'layout': false,
                'template': 'emails/welcomeResetPassword',
                'subject': 'Site access hyperlink to reset password', //todo - change to somethig more meaningfull
                'name': userFound.name,
                'welcomeLink': welcomeLink,
                'phone': userFound.profile ? userFound.profile.phone : null,
                'street1': userFound.profile ? userFound.profile.street1 : null,
                'date': frmDt(new Date())
              });
              cb();
            }
          ], function (err) {
            if (err) {
              throw err;
            } else {
              response.status(202);
              response.json({
                'message': 'sent',
                'user': formatUser(userFound),
                'welcomeLink': welcomeLink
              });
            }
          });
        }
      }
    });
  });

  core.app.delete('/api/v1/admin/clients/:id', ensureOwner, function (request, response) {
    if (request.params.id) {
      request.model.User.findOne({
        '_id': request.params.id,
        '$or': [
          {'roles.buyer': true},
          {'roles.seller': true}
        ]
      }, function (error, userFound) {
        if (error) {
          throw error;
        } else {
          if (userFound) {
            userFound.isBanned = true;
            response.status(201);
            response.json({'data': formatUser(userFound)});
          } else {
            response.status(404);
            response.json({
              'status': 'Error',
              'errors': [
                {
                  'code': 404,
                  'message': 'User with this ID do not exists!'
                }
              ]
            });
          }
        }
      });
    } else {
      response.status(400);
      response.json({
        'status': 'Error',
        'errors': [
          {
            'code': 400,
            'message': 'ID is missed!'
          }
        ]
      });
    }
  });
};


