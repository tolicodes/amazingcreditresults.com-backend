var dummyUsers = [{
      'email': 'owner@example.org',
      'password': 'test123',
      'name': {
        'familyName': 'Zorg',
        'middleName': 'Emmanuele',
        'givenName': 'Jean Batist'
      },
      'role': 'owner',
      'accountVerified': true,
      'root': true,
      'apiKey': 'iaqcodytumioxrunxvyemsebsviaqcodytumioxrunxvyemsebsv'
    },
    //*/
    {
      'email': 'johndoe@example.org',
      'welcomeLink': 'dedba5a84e44544afb66a',
      'accountVerified': false,
      'apiKey': 'abc1',
      'role': 'buyer',
      'name': {
        'familyName': 'Doe',
        'middleName': 'Theodor',
        'givenName': 'John'
      }
    }, {
      'email': 'janedoe@example.org',
      'welcomeLink': 'a84e44544afb66dedba5a',
      'accountVerified': true,
      'password': 'test123',
      'apiKey': 'abc2',
      'role': 'buyer',
      'name': {
        'familyName': 'Doe',
        'middleName': 'Eleonor',
        'givenName': 'Jane'
      }
    }, {
      'email': 'gracedoe@example.org',
      'welcomeLink': 'a4544afb66dedba584e4a',
      'accountVerified': true,
      'password': 'test123',
      'role': 'seller',
      'name': {
        'familyName': 'Doe',
        'middleName': '',
        'givenName': 'Grace'
      }
    }, {
      'email': 'bad_owner@example.org',
      'password': 'test123',
      'name': {
        'familyName': 'Dallas',
        'middleName': 'Shaun',
        'givenName': 'Corbin'
      },
      'role': 'owner',
      'root': true,
      'apiKey': 'iaqtumioxrunxvyemsebsvcodytumioxrunxvyemsebsviaqcody',
      'isBanned': true
    }
    //*/
  ],
  dummyProducts = [{
    'name': 'Freedom',
    'bank': 'Chase',
    'type': 'Visa',
    'reportsToExperian': true,
    'reportsToEquifax': false,
    'reportsToTransunion': true,
    'maximumAus': 15
  }, {
    'name': 'Sapphire',
    'bank': 'Chase',
    'type': 'American Express',
    'reportsToExperian': true,
    'reportsToEquifax': true,
    'reportsToTransunion': true,
    'maximumAus': 15
  }, {
    'name': 'Americard',
    'bank': 'Bank of America',
    'type': 'MasterCard',
    'reportsToExperian': false,
    'reportsToEquifax': false,
    'reportsToTransunion': false,
    'maximumAus': 15
  }],

  dummyTradeLines = [{
    'totalAus': 15,
    'usedAus': 0,
    'creditLimit': 20000,
    'cashLimit': 0,
    'balance': 100, 
    'ncRating': 'Bronze',
    'bcRating': 'Bronze',
    'moRating': 'Bronze',
    'cost': 1000,
    'notes': 'Some notes',
    'price': 1100,
    'statementDate': 1,
    tier: 3,
    'active': true
  }, {
    'totalAus': 15,
    'usedAus': 0,
    'creditLimit': 20000,
    'cashLimit': 0,
    'balance': 100,
    'cost': 1000,
    'notes': 'Some notes',
    'price': 1100,
    'statementDate': 1,
    tier: 2,
    'active': true
  }, {
    'totalAus': 15,
    'usedAus': 0,
    'creditLimit': 20000,
    'cashLimit': 0,
    'balance': 100,
    'cost': 1000,
    'notes': 'Some notes',
    tier: 1,
    'price': 1100,
    'statementDate': 1,
    'active': false
  }];


module.exports = exports = function(core) {
  console.log('Database population!');
  if (core.config.env !== 'development' && core.config.env !== 'test') {
    console.error('Should not populate DB in env: ' + core.config.env);
    return; //just in case
  }


  core.async.waterfall([

    function(callback) {
      var ownerId;
      core.async.each(
        dummyUsers,
        function(user, cb) {
          if (user.role === 'owner') {
            core.model.User.findOneAndUpdate({
                'keychain.email': user.email
              }, {
                'name': {
                  'familyName': user.name.familyName || '',
                  'givenName': user.name.givenName || '',
                  'middleName': user.name.middleName || ''
                },
                'apiKey': user.apiKey,
                'email': user.email,
                'root': user.root ? true : false,
                'roles': {
                  'owner': true
                },
                'isBanned': user.isBanned ? true : false
              }, {
                'upsert': true
              },
              function(error, userFound) {
                if (error) {
                  cb(error);
                } else {
                  userFound.setPassword(user.password, function(err) {
                    if (err) {
                      cb(err);
                    } else {
                      console.log('---------------------------');
                      console.log('Owner ' + userFound.email + ':' + user.password + ' with huntKey of ' + userFound.apiKey + ' is created!');
                      ownerId = userFound.id;
                      cb();
                    }
                  });
                }
              }
            );
          } else {
            if (user.accountVerified) {
              core.model.User.findOneAndUpdate({
                  'keychain.email': user.email
                }, {
                  'name': {
                    'familyName': user.name.familyName || '',
                    'givenName': user.name.givenName || '',
                    'middleName': user.name.middleName || ''
                  },
                  'keychain.welcomeLink': user.welcomeLink,
                  'apiKey': user.apiKey || core.rack(),
                  'email': user.email,
                  'roles': {
                    'owner': null,
                    'seller': (user.role === 'seller'),
                    'buyer': (user.role === 'buyer')
                  },
                  'accountVerified': true,
                  'root': false
                }, {
                  'upsert': true
                },
                function(error, userFound) {
                  if (error) {
                    cb(error);
                  } else {
                    userFound.setPassword(user.password, function(err) {
                      if (err) {
                        cb(err);
                      } else {
                        console.log('---------------------------');
                        console.log('Verified buyer ' + userFound.email + ' with password "' + user.password + '" is created!');
                        console.log('Visit ' + core.config.hostUrl + '#login/' +
                          userFound.keychain.welcomeLink + ' to sign in as him/her!');
                        cb();
                      }
                    });
                  }
                }
              );
            } else {
              core.model.User.findOneAndUpdate({
                  'keychain.email': user.email
                }, {
                  'name': {
                    'familyName': user.name.familyName || '',
                    'givenName': user.name.givenName || '',
                    'middleName': user.name.middleName || ''
                  },
                  'apiKey': user.apiKey || core.rack(),
                  'email': user.email,
                  'accountVerified': false,
                  'root': false
                }, {
                  'upsert': true
                },
                function(error, userFound) {
                  if (error) {
                    cb(error);
                  } else {
                    console.log('---------------------------');
                    console.log('Unverified buyer ' + userFound.email + ' is created!');
                    console.log('Visit ' + core.config.hostUrl + '#login/' +
                      userFound.keychain.welcomeLink + ' to set password for him/her');
                    cb();
                  }
                }
              );
            }
          }
        },
        function(error) {
          callback(error, ownerId);
        }
      );
    },
    function(ownerId, callback) {
      var productIds = [];
      core.async.each(dummyProducts, function(product, cb) {
        core.model.Product.findOneAndUpdate({
            'name': product.name
          },
          product, {
            'upsert': true
          },
          function(error, productFound) {
            if (error) {
              cb(error);
            } else {
              productIds.push(productFound._id);
              console.log('Adding test product ' + productFound.name + ' with id of ' + productFound.id);
              cb(null);
            }
          }
        );
      }, function(error) {
        callback(error, ownerId, productIds);
      });
    },
    function(ownerId, productIds, callback) {
      var i = 0;
      core.async.each(dummyTradeLines, function(t, cb) {
        t.seller = ownerId;
        t.product = productIds[i];
        i++;
        core.model.TradeLine.findOneAndUpdate({
            seller: ownerId,
            product: t.product  
          },
          t, 
          {
            upsert: true
          },
          function(err, tradeLineCreated) {
          if (err) {
            cb(err);
          } else {
            console.log('Test tradeline ' + tradeLineCreated.id + ' created!');
            cb(null);
          }
        });
      }, callback);
    }
  ], function(error) {
    if (error) {
      throw error;
    } else {
      console.log('Database populated!');
      core.emit('populated', 'Database population complete');
    }
  });
};
