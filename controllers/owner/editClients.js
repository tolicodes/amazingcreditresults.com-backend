//controller for owner users to edit the clients list
var welcomeLinkGenerator = require('./../../lib/welcome.js'),
  formatUser = require('./../../lib/formatter.js').formatUserForOwner,
  formatTradelineForBuyer = require('./../../lib/formatter.js').formatTradelineForBuyer,
  ensureOwner = require('./../../lib/middleware.js').ensureOwner,
  utilities = require('./../../lib/utilities'),
  moment = require('moment'),
  _ = require('underscore');

module.exports = exports = function (core) {

  core.app.get('/api/v1/admin/clients', ensureOwner, function (request, response) {
    var page = request.query.page || 1,
      perPage = request.query.perPage || 100,
      order = request.query.order || '+_id',
      skip = (page - 1) * perPage;

    utilities.fixQueryFormatting(request.query);

    var filter = utilities.createFilter(request.query, ['isBanned'], {
      'owner': 'roles.owner',
      'buyer': 'roles.buyer',
      'seller': 'roles.seller'
    });

    core.async.parallel({
      'metadata': function (cb) {
        request.model.User
          .count(filter)
          .exec(function (error, numberOfClients) {
            if (error) {
              cb(error);
            } else {
              cb(null, {
                'users': numberOfClients,
                'page': page,
                'perPage': perPage,
                'order': order,
                'filter': filter
              });
            }
          });
      },
      'data': function (cb) {
        request.model.User
          .find(filter)
          .limit(perPage)
          .sort(order)
          .skip(skip)
          .exec(cb);
      }
    }, function (error, obj) {
      response.status(200);
      response.json({'metadata': obj.metadata, 'data': obj.data.map(formatUser)});
    });
  });

  core.app.get('/api/v1/admin/clients/:id', ensureOwner, function (request, response) {
    request.model.User.findById(request.params.id, function (error, user) {
      if (error) {
        throw error;
      } else {
        if (user) {
          core.async.parallel({
            'data': function (cb) {
              cb(null, formatUser(user));
            },
            'transactions': function (cb) {
              request.model.Transaction
                .find({'client': user._id})
                .sort('-timestamp')
                .exec(cb);
            },
            'preSelectedTradeLines': function (cb) {
              var tlIdAr = (user.profile && user.profile.preSelectTradeLines) ? user.profile.preSelectTradeLines : [];
              core.async.map(tlIdAr, function (id, clbk) {
                request.model.TradeLines.findById(id, function (error, tradeLineFound) {
                  if (error) {
                    clbk(error);
                  } else {
                    if (tradeLineFound) {
                      clbk(null, formatTradelineForBuyer(tradeLineFound));
                    } else {
                      clbk(null);
                    }
                  }
                });
              }, cb);
            }
          }, function (error, obj) {
            if (error) {
              throw error;
            } else {
              response.status(200);
              response.json(obj);
            }
          });
        } else {
          response.status(404);
          response.json({
            'status': 'Error',
            'errors': [
              {
                'message': 'User with this id do not exists!'
              }
            ]
          });
        }
      }
    });
  });

  core.app.put('/api/v1/admin/clients/:id', ensureOwner, function (request, response) {
    var patch,
      roles = {},
      rolesToSet = false;

    var nameFields = ['familyName', 'givenName', 'middleName', 'suffix', 'title'];

    fieldMap = {
      'street1': 'profile.street1',
      'street2': 'profile.street2',
      'state': 'profile.state',
      'city': 'profile.city',
      'ssn': 'profile.ssn',
      'birthday': 'profile.birthday',
      'zip': 'profile.zip'
    };

    patch = utilities.createPatch(request.body, nameFields, fieldMap);
    console.log(patch);

    if (patch !== {}) {
      // An EVS field was changed, so reset verification
      patch['profile.evsVerified'] = false;
    }

    if (request.body.email) {
      patch['keychain.email'] = request.body.email;
    }

    // Would need to do API request to figure out if phone number changing
    // so to be on the same side unset phone verify flag on each change
    if (request.body.phone) {
      patch['profile.phone'] = request.body.phone;
      patch['profile.phoneVerified'] = false;
    }

    // TODO write a test to find out if there is a bug here that can turn an Owner into a non-owner
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
        '_id': request.params.id
      },
      patch,
      {
        'upsert': false // important!
      },
      function (error, userFound) {
        utilities.checkError(error, userFound, 'User not found!', response, function(data, response){
          response.status(202).json(formatUser(data));
        });
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
        'accountVerified': request.body.accountVerified ? true : false,
        'isBanned': request.body.isBanned ? true : false,
        'profile': {
          'phone': request.body.phone,
          'altPhone': request.body.altPhone,
          'state': request.body.state,
          'city': request.body.city,
          'zip': request.body.zip,
          'street1': request.body.street1,
          'street2': request.body.street2,
          'title': request.body.name.title,
          'suffix': request.body.name.suffix,
          'ssn': request.body.ssn,
          'birthday': request.body.birthday
        },
        'roles': {
          'buyer': request.body.roles ? utilities.stringToBoolean(request.body.roles.buyer) : true,
          'seller': request.body.roles ? utilities.stringToBoolean(request.body.roles.seller) : false
        },
        'root': false
      }, function (error, userCreated) {
        if (error) {
          throw error;
        } else {
//https://oselot.atlassian.net/browse/ACR-454
          if (request.body.doNotSendEmail === 'true') {
            response.status(201);
            response.set('Location', '/api/v1/admin/clients/' + userCreated.id);
            response.json(formatUser(userCreated));
          } else {
            var welcomeLink = welcomeLinkGenerator();
            core.async.waterfall([
              function (cb) {
                userCreated.keychain.welcomeLink = welcomeLink;
                userCreated.apiKeyCreatedAt = Date.now();
                userCreated.markModified('keychain');
                userCreated.invalidateSession(cb);
              },
              function (newApiKey, cb) {
//              welcomeLink = core.config.hostUrl+'buyer/welcome/'+welcomeLink;
                welcomeLink = core.config.hostUrl + 'welcome/' + welcomeLink;
                var tpl = 'emails/welcomeBuyer';
                if (userCreated.roles && userCreated.roles.buyer) {
                  tpl = 'emails/welcomeBuyer';
                }
                if (userCreated.roles && userCreated.roles.seller) {
                  tpl = 'emails/welcomeSeller';
                }
                userCreated.notifyByEmail({
                  'layout': false,
                  'template': tpl,
                  'subject': 'Site access hyperlink to enter site',//todo - change to something more meaningfull
                  'name': userCreated.name,
                  'welcomeLink': welcomeLink,
                  'phone': userCreated.profile.phone,
                  'street1': userCreated.profile.street1,
                  'date': utilities.frmDt(new Date())
                });
                cb();
              }
            ], function (err) {
              if (err) {
                throw err;
              } else {
                response.status(201);
                response.set('Location', '/api/v1/admin/clients/' + userCreated.id);
                response.json(formatUser(userCreated));
              }
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
            'message': 'Required value of ' + missed + ' is missing!'
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
        var welcomeLink = userFound.keychain.welcomeLink || welcomeLinkGenerator();
        if ((userFound.roles && userFound.roles.owner === true) || userFound.root) {
          response.status(400);
          response.json({
            'status': 'Error',
            'errors': [
              {
                'code': 400,
                'message': 'Unable to send welcome link to owner!'
              }
            ]
          });
        } else {
          core.async.waterfall([
            function (cb) {
              userFound.keychain.welcomeLink = welcomeLink;
              userFound.apiKeyCreatedAt = Date.now();
              userFound.markModified('keychain');
              userFound.invalidateSession(cb);
            },
            function (newApiKey, cb) {
//              welcomeLink = core.config.hostUrl+'buyer/welcome/'+welcomeLink;
              welcomeLink = core.config.hostUrl + 'welcome/' + welcomeLink;
              var tpl = 'emails/welcomeBuyer';
              if (userFound.roles && userFound.roles.buyer) {
                tpl = 'emails/welcomeBuyer';
              }
              if (userFound.roles && userFound.roles.seller) {
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
                'date': utilities.frmDt(new Date())
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
        if ((userFound.roles && userFound.roles.owner === true) || userFound.root) {
          response.status(400);
          response.json({
            'status': 'Error',
            'errors': [
              {
                'code': 400,
                'message': 'Unable to send password reset link to owner!'
              }
            ]
          });
        } else {
          core.async.waterfall([
            function (cb) {
              userFound.keychain.welcomeLink = welcomeLink;
              userFound.markModified('keychain');
              userFound.accountVerified = false;
              userFound.apiKeyCreatedAt = Date.now();
              userFound.invalidateSession(cb);
            },
            function (newApiKey, cb) {
//              welcomeLink = core.config.hostUrl+'buyer/welcome/'+welcomeLink;
              welcomeLink = core.config.hostUrl + 'welcome/' + welcomeLink;
              userFound.notifyByEmail({
                'layout': false,
                'template': 'emails/welcomeResetPassword',
                'subject': 'Reset password on Amazingcreditresults.com',
                'name': userFound.name,
                'welcomeLink': welcomeLink,
                'phone': userFound.profile ? userFound.profile.phone : null,
                'street1': userFound.profile ? userFound.profile.street1 : null,
                'date': utilities.frmDt(new Date())
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
    if (!request.params.id) {
      return utilities.error(400, 'ID is missed!', response);
    }

    request.model.User.findById(request.params.id, function (error, userFound) {
      if (error) {
        throw error;
      }

      if (!userFound) {
        return utilities.error(404, 'User with this ID do not exists!', response);
      }

      if (!userFound.roles.buyer && !userFound.roles.seller) {
        return utilities.error(400, 'Only buyers and sellers can be removed', response);
      }

      userFound.update({isBanned: true}, function (error) {
        if (error) {
          throw error;
        }

        response.status(202).end();
      });
    });
  });

  core.app.post('/api/v1/admin/clients/balance/:id', ensureOwner, function (request, response) {
    request.model.User.findById(request.params.id, function (error, userFound) {
      if (error) {
        throw error;
      } else {
        if (userFound) {
          request.model.Transaction.create({
            'client': userFound._id,
            'type': 'ownerUpload',
            'amount': request.body.amount,
            'notes': request.body.notes.toString() + ' | Transaction issued by Owner ' + request.user.email,
            'date': moment(request.body.date).toDate(),
            'paidBy': request.body.paidBy
          }, function (error) {
            if (error) {
              throw error;
            } else {
              response.status(202);
              response.json({'status': 'Ok'});
            }
          });
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
  });
};


