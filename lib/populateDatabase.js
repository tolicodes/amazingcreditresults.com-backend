var dummyUsers = [
    {
      'email': 'owner@example.org',
      'password': 'test123',
      'name':{
        'familyName': 'Zorg',
        'middleName': 'Emmanuele',
        'givenName': 'Jean Batist'
      },
      'role':'owner',
      'apiKey':'iaqcodytumioxrunxvyemsebsviaqcodytumioxrunxvyemsebsv',
    },
//*/
    {
      'email': 'johndoe@example.org',
      'welcomeLink': 'dedba5a84e44544afb66a',
      'accountVerified': false,
      'role': 'buyer',
      'name': {
        'familyName': 'Doe',
        'middleName': 'Theodor',
        'givenName': 'John'
      }
    },
    {
      'email': 'janedoe@example.org',
      'welcomeLink': 'a84e44544afb66dedba5a',
      'accountVerified': true,
      'password': 'test123',
      'role': 'buyer',
      'name': {
        'familyName': 'Doe',
        'middleName': 'Eleonor',
        'givenName': 'Jane'
      }
    },
    {
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
    }
//*/
  ],
  dummyProducts = [
    {
      'name': 'Gemoroi 0',
      'bank': 'Sperbank (testing)',
      'ncRating': 'Bronze',
      'bcRating': 'Bronze',
      'moRating': 'Bronze',
      'type': 'Visa',
      'reportsToExperian': false,
      'reportsToEquifax': false,
      'reportsToTransunion': false,
      'notes': 'This is your problem.',
      'maximumAus': 15
    },
    {
      'name': 'Gemoroi 1',
      'bank': 'Sperbank (testing)',
      'ncRating': 'Silver',
      'bcRating': 'Silver',
      'moRating': 'Silver',
      'type': 'Visa',
      'reportsToExperian': false,
      'reportsToEquifax': false,
      'reportsToTransunion': false,
      'notes': 'This is your problem.',
      'maximumAus': 15
    },
    {
      'name': 'Gemoroi 2',
      'bank': 'Sperbank (testing)',
      'ncRating': 'Platinium',
      'bcRating': 'Platinium',
      'moRating': 'Platinium',
      'type': 'Visa',
      'reportsToExperian': false,
      'reportsToEquifax': false,
      'reportsToTransunion': false,
      'notes': 'This is your problem.',
      'maximumAus': 15
    }
  ],
  dummyTradeLines = [
    {
//      'product': { type: core.mongoose.Schema.Types.ObjectId, ref: 'Product' },
//      'seller': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User' },
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
      'price':1100,
      'active':true,
    },
    {
//      'product': { type: core.mongoose.Schema.Types.ObjectId, ref: 'Product' },
//      'seller': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User' },
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
      'price':1100,
      'active':true
    },
    {
//      'product': { type: core.mongoose.Schema.Types.ObjectId, ref: 'Product' },
//      'seller': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User' },
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
      'price':1100,
      'active':false
    }
  ];


module.exports = exports = function (core) {
  console.log('Database population!');
  if (core.config.env != 'development') {
    return; //just in case
  }

  core.async.waterfall([
    function (callback) {
      var ownerId;
      core.async.each(
        dummyUsers,
        function (user, cb) {
          if (user.role === 'owner') {
            core.model.User.findOneAndUpdate(
              { 'keychain.email': user.email },
              {
                'name': {
                  'familyName': user.name.familyName || '',
                  'givenName': user.name.givenName || '',
                  'middleName': user.name.middleName || ''
                },
                'apiKey': user.apiKey,
                'email': user.email,
                'root': true,
                'roles': { 'owner' : true },
              },
              {
                'upsert': true
              },
              function (error, userFound) {
                if (error) {
                  cb(error);
                } else {
                  userFound.setPassword(user.password, function (err) {
                    if (err) {
                      cb(err);
                    } else {
                      console.log('---------------------------');
                      console.log('Owner ' + userFound.email + ':' + user.password + ' is created!');
                      ownerId = userFound.id;
                      cb();
                    }
                  });
                }
              });
          } else {
            if (user.accountVerified) {
              core.model.User.findOneAndUpdate(
                { 'keychain.email': user.email },
                {
                  'name': {
                    'familyName': user.name.familyName || '',
                    'givenName': user.name.givenName || '',
                    'middleName': user.name.middleName || ''
                  },
                  'keychain.welcomeLink': user.welcomeLink,
                  'apiKey': core.rack(),
                  'email': user.email,
                  'roles':{
                    'owner': null,
                    'seller': user.role.seller,
                    'buyer': user.role.buyer
                  },
                  'accountVerified': true,
                  'root': false,
                },
                {
                  'upsert': true
                },
                function (error, userFound) {
                  if (error) {
                    cb(error);
                  } else {
                    userFound.setPassword(user.password, function (err) {
                      if (err) {
                        cb(err);
                      } else {
                        console.log('---------------------------');
                        console.log('Verified buyer ' + userFound.email + ' with password "' + user.password + '"/ is created!');
                        console.log('Visit ' + core.config.hostUrl + '#login/' +
                          userFound.keychain.welcomeLink + ' to sign in as him/her!');
                        cb();
                      }
                    });
                  }
                });
            } else {
              core.model.User.findOneAndUpdate(
                { 'keychain.email': user.email },
                {
                  'name': {
                    'familyName': user.name.familyName || '',
                    'givenName': user.name.givenName || '',
                    'middleName': user.name.middleName || ''
                  },
                  'apiKey': core.rack(),
                  'email': user.email,
                  'accountVerified': false,
                  'root': false,
                },
                {
                  'upsert': true
                },
                function (error, userFound) {
                  if (error) {
                    cb(error);
                  } else {
                    console.log('---------------------------');
                    console.log('Unverified buyer ' + userFound.email + ' is created!');
                    console.log('Visit ' + core.config.hostUrl + '#login/' +
                      userFound.keychain.welcomeLink + ' to set password for him/her');
                    cb();
                  }
                });

            }
          }
        },
        function (error) {
          callback(error, ownerId);
        });
    },
    function (ownerId, callback) {
      var productIds = [];
      core.async.each(dummyProducts, function (product, cb) {
        core.model.Product.findOneAndUpdate(
          {'name': product.name},
          product,
          {
            'upsert': true
          },
          function (error, productFound) {
            if (error) {
              cb(error)
            } else {
              productIds.push(productFound._id);
              console.log('Adding test product '+productFound.name+' with id of '+productFound.id);
              cb(null);
            }
          });
      }, function (error) {
        callback(error, ownerId, productIds);
      });
    },
    function (ownerId, productIds, callback) {
      var i = 0;
      core.async.each(dummyTradeLines, function (t, cb) {
        t.seller = ownerId;
        t.product = productIds[0];
        i++;
        core.model.TradeLine.create(t, function(err, tradeLineCreated){
          if(err){
            cb(err);
          } else {
            console.log('Test tradeline '+tradeLineCreated.id+' created!');
            cb(null);
          }
        });
      }, callback);
    }
  ], function (error) {
    if (error) {
      throw error;
    } else {
      console.log('Database populated!');
    }
  });
};