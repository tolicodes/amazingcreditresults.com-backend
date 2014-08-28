//controller for owner users to edit the clients list
var welcomeLinkGenerator = require('./../../lib/welcome.js'),
  formatUser = require('./../../lib/formatter.js').formatUserForOwner,
  formatTradelineForBuyer = require('./../../lib/formatter.js').formatTradelineForBuyer,
  ensureOwner = require('./../../lib/middleware.js').ensureOwner,
  curl = require('request'),
  xml2js = require('xml2js'),
  utilities = require('./../../lib/utilities.js');

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
      perPage = request.query.perPage || 100,
      order = request.query.order || '+_id',
      skip = (page - 1) * perPage,
      filter = { 'roles': {} };

    ['owner', 'buyer', 'seller'].map(function (role) {
      if (request.query[role] == true) {
        filter.roles[role] = true;
      }
    });

    if (request.query.isBanned === 'true') {
      filter.isBanned = true;
    }

    if (request.query.isBanned === 'false') {
      filter.isBanned = false;
    }

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

    if (request.body.isBanned === true || request.body.isBanned === false) {
      patch.isBanned = request.body.isBanned;
    }

    ['familyName', 'givenName', 'middleName'].map(function (a) {
      if (request.body.name && request.body.name[a]) {
        patch['name.' + a] = request.body.name[a];
      }
    });

    ['title', 'suffix'].map(function(b) {
      if (request.body.name && request.body.name[a]) {
        patch['profile.' + a] = request.body.name[a];
      }
    });

    [
      'title', 'street1', 'street2',
      'phone', 'altPhone', 'state',
      'city', 'ssn', 'birthday',
      'zip', 'needQuestionnaire'
    ].map(function (b) {
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

    if (request.body.preSelectTradeLines && Array.isArray(request.body.preSelectTradeLines)) {
      patch.profile.preSelectTradeLines = request.body.preSelectTradeLines;
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
        'accountVerified': request.body.accountVerified ? true : false,
        'isBanned': request.body.isBanned ? true : false,
        'profile': {
          'needQuestionnaire': request.body.needQuestionnaire ? true : false,
          'phone': request.body.phone,
          'altPhone': request.body.altPhone,
          'state': request.body.state,
          'city': request.body.city,
          'zip': request.body.zip,
          'street1': request.body.street1,
          'street2': request.body.street2,
          'title': request.body.title,
          'ssn': request.body.ssn,
          'birthday': request.body.birthday
        },
        'roles': {
          'buyer': true,
          'seller': request.body.roles ? request.body.roles.seller : false
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
                welcomeLink = core.config.hostUrl + '#login/' + welcomeLink;
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
                  'date': frmDt(new Date())
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
              welcomeLink = core.config.hostUrl + '#login/' + welcomeLink;
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


//we can actually delete user from database if he or she has no transactions or tradelines
      core.async.parallel({
        'countTransactions': function (cb) {
          request.model.Transaction.count({'client': userFound._id}, cb);
        },
        'countTradelines': function (cb) { //for seller, for example
          request.model.TradeLine.count({'seller': userFound._id}, cb);
        }
      }, function (error, p) {
        if (error) {
          throw error;
        } else {
          if (p.countTransactions === 0 && p.countTradelines === 0) {
            userFound.remove(function (error) {
              if (error) {
                throw error
              } else {
                response.status(200);
                response.json({'status': 'Deleted'});
              }
            });
          } else {
            utilities.error(400,
              (
                'Unable to delete client. He or she has ' +
                p.countTransactions + ' transactions and ' +
                p.countTradelines + ' tradelines owned'
              ),
              response);
          }
        }
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
            'notes': request.body.notes.toString() + 'Transaction issued by Owner ' + request.user.email,
            'date': request.body.date,
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

  core.app.post('/api/v1/admin/clients/verifyssn/:id', ensureOwner, function (request, response) {
    request.model.User.findById(request.params.id, function (error, userFound) {
      if (error) {
        throw error;
      } else {
        if (userFound) {
          var builder = new xml2js.Builder(),
            content = builder.buildObject({
              'PlatformRequest': {
                'Credentials': {
                  'Username': core.config.evs.username,
                  'Password': core.config.evs.password
                },
                'CustomerReference': userFound.id,
                'Identity': {
                  'Ssn': (userFound.profile && userFound.profile.ssn) ? userFound.profile.ssn : '111-111-111'
                }
              }
            });
          /*/
           var content = '<?xml version="1.0" encoding="utf-8"?>' +
           '<PlatformRequest>' +
           '<Credentials>' +
           '<Username>' + core.config.evs.username + '</Username>' +
           '<Password>' + core.config.evs.password + '</Password>' +
           '</Credentials>' +
           '<CustomerReference>' + userFound.id + '</CustomerReference>' +
           '<Identity>' +
           '<Ssn>' + userFound.profile.ssn + '</Ssn>' +
           '</Identity>' +
           '</PlatformRequest>';
           //*/
          curl({
            'method': 'POST',
            'url': 'https://identiflo.everification.net/WebServices/Integrated/Main/V200/SSNLookup',
            'body': content
          }, function (error, res, body) {
            if (error) {
              throw error;
            } else {
              var parser = new xml2js.Parser();
              parser.parseString(body, function (error, result) {
                if (error) {
                  throw error;
                } else {
                  response.json(result);
                }
              });
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


