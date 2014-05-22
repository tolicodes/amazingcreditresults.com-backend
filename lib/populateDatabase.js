var dummyUsers = [
    {
      'email': 'owner@example.org',
      'password': 'test123',
      'root': true,
    },
    /*/
     {
     'email': 'johndoe@example.org',
     'accountVerified':false,
     'name': {
     'familyName' : 'Doe',
     'givenName' : 'John'
     }
     },
     {
     'email': 'janedoe@example.org',
     'accountVerified':true,
     'password' : 'test123',
     'name': {
     'familyName' : 'Doe',
     'givenName' : 'Jane'
     }
     }
     //*/
  ],
  dummyProducts = [
    {
      'name': 'Visa Gemoroi 0',
      'bank': 'Sperbank (testing)',
      'ncRating': 0,
      'bcRating': 0,
      'moRating': 0,
      'reportsToExperian': false,
      'reports_to_equifax': false,
      'reports_to_transunion': false,
      'notes': 'This is your problem.',
      'maximumAus': 100
    },
    {
      'name': 'Visa Gemoroi 1',
      'bank': 'Sperbank (testing)',
      'ncRating': 1,
      'bcRating': 1,
      'moRating': 1,
      'reportsToExperian': false,
      'reports_to_equifax': false,
      'reports_to_transunion': false,
      'notes': 'This is your problem.',
      'maximumAus': 100
    },
    {
      'name': 'Visa Gemoroi 2',
      'bank': 'Sperbank (testing)',
      'ncRating': 2,
      'bcRating': 2,
      'moRating': 2,
      'reportsToExperian': false,
      'reports_to_equifax': false,
      'reports_to_transunion': false,
      'notes': 'This is your problem.',
      'maximumAus': 100
    }
  ],
  dummyTradeLines = [
    {
//      'product': { type: core.mongoose.Schema.Types.ObjectId, ref: 'Product' },
//      'seller': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User' },
      'totalAus': 100,
      'usedAus': 0,
      'creditLimit': 0,
      'cashLimit': 0,
      'balance': 100,
      'ncRating': 0,
      'bcRating': 0,
      'moRating': 0,
      'cost': 1000,
      'notes': 'Some notes'
    },
    {
//      'product': { type: core.mongoose.Schema.Types.ObjectId, ref: 'Product' },
//      'seller': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User' },
      'totalAus': 100,
      'usedAus': 0,
      'creditLimit': 0,
      'cashLimit': 0,
      'balance': 100,
      'ncRating': 0,
      'bcRating': 0,
      'moRating': 0,
      'cost': 1000,
      'notes': 'Some notes'
    },
    {
//      'product': { type: core.mongoose.Schema.Types.ObjectId, ref: 'Product' },
//      'seller': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User' },
      'totalAus': 100,
      'usedAus': 0,
      'creditLimit': 0,
      'cashLimit': 0,
      'balance': 100,
      'ncRating': 0,
      'bcRating': 0,
      'moRating': 0,
      'cost': 1000,
      'notes': 'Some notes'
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
          if (user.root) {
            core.model.User.findOneAndUpdate(
              { 'keychain.email': user.email },
              {
                'apiKey': core.rack(),
                'username': user.username,
                'root': true,
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
                  'apiKey': core.rack(),
                  'email': user.email,
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
                        console.log('Verified buyer ' + userFound.email + ' : ' + user.password + ' is created!');
                        console.log('Visit ' + core.config.hostUrl + 'buyer/welcome/' +
                          userFound.apiKey + ' to sign in as him/her!');
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
                    throw error;
                  } else {
                    console.log('---------------------------');
                    console.log('Unverified buyer ' + userFound.email + ' is created!');
                    console.log('Visit ' + core.config.hostUrl + 'buyer/welcome/' +
                      userFound.apiKey + ' to set password for him/her');
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
      var productIds=[];
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
              cb(null);
            }
          });
      }, function (error) {
        callback(error, ownerId, productIds);
      });
    },
    function (ownerId, productIds, callback) {
      var i=0;
      core.async.each(dummyTradeLines, function(t, cb){
        t.seller = ownerId;
        t.product = productIds[0];
        i++;
        core.model.TradeLine.create(t, cb);
      }, callback);
    }
  ], function(error){
    if(error){
      throw error;
    } else {
      console.log('Database populated!');
    }
  });
};