var MongoClient = require('mongodb').MongoClient,
    async = require('async'),
    fs = require('fs'),
    stripe = require('stripe')('sk_test_SveuxIxYZC3Rtub749wuPLtx'),
    request = require('request'),
    port = 3001,
    _ = require('underscore');

// Connection URL - may need to change depending on your local config
var url = 'mongodb://localhost:27017/amazing-test';

exports.clone = function(obj) {
 var target = {};
 for (var i in obj) {
  if (obj.hasOwnProperty(i)) {
   target[i] = obj[i];
  }
 }
 return target;
};

exports.dropCollection = function(collName, callback) {
  // Use connect method to connect to the Server
  MongoClient.connect(url, function(err, db) {
    var collection = db.collection(collName);

    if (!collection) {
      db.close();
      console.error('Collection '+ collName + 'not found!');
    } else {
      collection.drop(function(err) {
        db.close();
        if (err) {
          console.error(err);
        }
        // You made it!
        //console.log('Dropped collection: ' + collName);
        callback();
      });
    }
  });
};

exports.dropDB = function(callback) {
  // Use connect method to connect to the Server
  MongoClient.connect(url, function(err, db) {
    db.dropDatabase(function(err) {
      if (err) {
        db.close();
        throw Error(err);
      }
      db.close();
      // You made it!
      console.log('Dropped database');
      callback();
    });
  });
};

var resetUser = function(userInfo, callback) {
  MongoClient.connect(url, function(err, db) {
    var collection = db.collection('users');
    collection.remove({ 'keychain.email' : userInfo.keychain.email }, function() {
      collection.insert([userInfo], function(err, result) {
        db.close();
        callback(err, result[0]);
      });
    });
  });
};

exports.resetNewClient = function(callback) {
  var testId = Math.floor(Math.random() * 10000),
  userInfo = {
    'keychain' : {
      'email': 'unitTestUser' + testId + '@mail.ru'
    },
    'name': {
      'givenName': 'John' + testId,
      'middleName': 'Teodor' + testId,
      'familyName': 'Doe' + testId
    },
    'apiKey' : 'abc5',
    'accountVerified' : false,
    'root' : false,
    'profile' : {
      'title': 'Mr.',
      'suffix': 'III',
      'street1' : '123 Street',
      'street2' : 'Apt 1',
      'phone' : '555-123-4567',
      'city': 'Brooklyn',
      'state': 'NY',
      'zip': '11201',
      'telefone': '555-339' + testId
    }
  };
  resetUser(userInfo, callback);
};

exports.resetOwner = function(callback) {
  var owner = {
    'keychain' : {
      'email': 'pandadoe@example.org'
    },
    'name' : {
      'familyName': 'Doe',
      'middleName': 'Jones',
      'givenName': 'Panda'
    },
    'apiKey': 'abc9',
    'roles' : {
      'buyer' : false,
      'seller' : false,
      'owner' : true
    },
    'profile' : {},
    'accountVerified' : true,
    'root' : false,
    'password' : '6ccc4a48bf6701c1d824c08276dc182b159425686f4d048d3c7abe342e83b24beb4d015a451a6a4d5ef283a6299e418367ae90cbf0ad8df06e3c24259c82129f',
    'salt' : 'fbf897be7250e952aa13ef0d1ae1c3c71b52102b64c24f7bc8a1c70ed0de482edb81680be6dc28f95c450c9677d5d8412389a736b812052edac8632c7422f808'
  };

  resetUser(owner, callback);
};

exports.resetBuyer = function(callback, mods) {
  mods = mods || {};
  var buyer = {
    'keychain' : {
      'welcomeLink': 'a84e44544afb66dedba6a',
      'email': 'jamesdoe@example.org'
    },
    'name' : {
      'familyName': 'Doe',
      'middleName': 'Dean',
      'givenName': 'James'
    },
    'apiKey': 'abc4',
    'roles' : {
      'buyer' : true,
      'seller' : false,
      'owner' : null
    },
    'profile' : {
      'evsVerified': (mods.evsVerified !== undefined) ? mods.evsVerified : true,
      'phoneVerified': (mods.phoneVerified !== undefined) ? mods.phoneVerified : true,
      'street1' : '125 Street',
      'street2' : 'Apt 3',
      'phone' : mods.phone || '5551239567',
      'city': 'Brooklyn',
      'state': 'NY',
      'zip': '11201',
      'ssn': '333-555-1111',
      'achAccount': mods.achAccount || undefined
    },
    'accountVerified' : true,
    'root' : false,
    'password' : '6ccc4a48bf6701c1d824c08276dc182b159425686f4d048d3c7abe342e83b24beb4d015a451a6a4d5ef283a6299e418367ae90cbf0ad8df06e3c24259c82129f',
    'salt' : 'fbf897be7250e952aa13ef0d1ae1c3c71b52102b64c24f7bc8a1c70ed0de482edb81680be6dc28f95c450c9677d5d8412389a736b812052edac8632c7422f808'
  };

  resetUser(buyer, callback);

};

exports.findWithRole = function (role, body) {
  return _.find(body.data, function (user) {
    return user.roles[role];
  });
};

exports.resetProductsAndTradelines = function(callback) {
  var products, tradelines;
  MongoClient.connect(url, function(err, db) {
    var sellerId;
    console.log(__dirname);
    async.parallel([
        function(cb) {
          fs.readFile(__dirname + '/data/tradelines.json', function(err, data) {
            if (err) {
              cb(err);
            }
            console.log(data);
            tradelines = JSON.parse(data).data;
            cb();
          });
        },
        function(cb) {
          fs.readFile(__dirname + '/data/products.json', function(err, data) {
            if (err) {
              cb(err);
            }
            products = JSON.parse(data).data;
            cb();
          });
        },
        function(cb) {
          exports.dropCollection('tradelines', cb);
        },
        function(cb) {
          exports.dropCollection('orders', cb);
        },
        function(cb) {
          exports.dropCollection('aupurchases', cb);
        },
        function(cb) {
          exports.dropCollection('products', cb);
        },
        function(cb) {
          var coll = db.collection('users');
          coll.find({'roles.seller': true}).limit(1).toArray(function(err, docs){
            sellerId = docs[0]._id;
            cb();
          });
        }
      ],
      // Now insert them into DB
      function() {
        var productIds = [];
        var collection;
        async.series([
          function(cb) {
            collection = db.collection('products');
            collection.insert(products, function(err, result) {
              productIds = _(result).pluck('_id');
              cb();
            });
          },
          function() {
            collection = db.collection('tradelines');
            for(var i in tradelines) {
              tradelines[i].product = productIds[i];
              tradelines[i].seller = sellerId;
            }
            collection.insert(tradelines, function() {
              db.close();
              console.log('Tradelines and Products reset');
              callback();
            });
          }
        ]);
      }
    );
  });
};

exports.createStripeToken = function(cb) {
  stripe.tokens.create({
    card: {
      number: '4242424242424242',
      exp_month: 12,
      exp_year: 2019,
      cvc: '123'
    }
  }, function(err, token) {
    cb(err, token);
  });
};

var api = {
  login: function(username, password, cb) {
    request({
      'method': 'POST',
      'url': 'http://localhost:' + port + '/api/v1/account/login',
      'form': {
        'username': username,
        'password': password
      },
      'json': true
    }, function (error, response, body) {
      if (error) {
        cb(error);
      } else {
        response.statusCode.should.be.equal(200);
        body.huntKey.should.be.a.String;
        cb(null, body);
      }
    });
  },
  clients: {
    list: function (huntKey, cb) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/admin/clients',
        'headers': {'huntKey': huntKey},
        json: true
      }, cb);
    },

    get: function (huntKey, id, cb) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/admin/clients/' + id,
        'headers': {'huntKey': huntKey},
        json: true
      }, cb);
    },

    del: function (huntKey, id, cb) {
      request({
        'method': 'DELETE',
        'url': 'http://localhost:' + port + '/api/v1/admin/clients/' + id,
        'headers': {'huntKey': huntKey},
        json: true
      }, cb);
    }
  },
  tradelines: {
    list: function (huntKey, cb) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/tradelines',
        'headers': {'huntKey': huntKey},
        json: true
      }, cb);
    },

    archive: function (huntKey, id, cb) {
      request({
        'method': 'DELETE',
        'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + id,
        'headers': { 'huntKey': huntKey },
        'json': true
      }, cb);
    },

    get: function (huntKey, id, cb) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + id,
        'headers': { 'huntKey': huntKey },
        'json': true
      }, cb);
    }
  },
  cart: {
    addTradeline: function (huntKey, id, cb) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/cart/tradelines',
        'headers': {'huntKey': huntKey},
        form: {id: id},
        json: true
      }, cb);
    },

    deleteTradeline: function (huntKey, id, cb) {
      request({
        'method': 'DELETE',
        'url': 'http://localhost:' + port + '/api/v1/cart/tradelines/' + id,
        'headers': {'huntKey': huntKey},
        json: true
      }, cb);
    },

    getTradelines: function (huntKey, cb) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/cart/tradelines',
        'headers': {'huntKey': huntKey},
        json: true
      }, cb);
    },

    checkout: function (huntKey, options, cb) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/cart/checkout',
        'headers': {'huntKey': huntKey},
        'form': options,
        'json': true
      }, cb);
    }
  },
  verify: {
    ach: {
      create: function(huntKey, options, cb) {
        request({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/myself/billing/achAccount',
          'headers': {'huntKey': huntKey},
          'form': options,
          'json': true
        }, cb);
      },
      check: function(huntKey, options, cb) {
        request({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/myself/billing/achAccount/verify',
          'headers': {'huntKey': huntKey},
          'form': options,
          'json': true
        }, cb);
      },
      defaults: {
        bank: function() {
          return {
            accountNumber: '9900000000',
            routingNumber: '021000021',
            accountType: 'checking',
            meta: {
              test: true
            }
          };
        },
        payout: function() {
          return {
            'amount1': 1,
            'amount2': 1,
            'meta': {
              'test': true
            }
          };
        }
      }
    },
    phone: {
      send: function(huntKey, cb) {
        request({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/api/v1/verifyPhone',
          'headers': {'huntKey': huntKey},
          'json': true
        }, cb);
      },
      checkPin: function(huntKey, pin, cb) {
        request({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/verifyPhone',
          'headers': {'huntKey': huntKey},
          'form': {'pin' : pin},
          'json': true
        }, cb);
      }
    }
  },
  setCreditReport: function(huntKey, options, cb){
    request({
      'method': 'POST',
      'url': 'http://localhost:' + port + '/api/v1/myself/creditReport',
      'headers': {'huntKey': huntKey},
      'form': options,
      'json': true
    }, cb);
  },
  addBuyerFunds: function(huntKey, userId, options, cb) {
    options = options || {};
    request({
      'method': 'POST',
      'url': 'http://localhost:' + port + '/api/v1/admin/clients/balance/' + userId,
      'headers': {'huntKey': huntKey},
      'form': {
        'amount': options.amount || 1,
        'notes': options.notes || 'Have some cash!',
        'date': options.date || '2014-05-03',
        'paidBy': options.paidBy || 'Credit Card'
      },
      'json': true
    }, cb);
  }
};

_.extend(exports, api);