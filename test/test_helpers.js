var MongoClient = require('mongodb').MongoClient,
    async = require('async'),
    fs = require('fs'),
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
      throw Error('Collection '+ collName + 'not found!');
    } else {
      collection.drop(function(err) {
        db.close();
        if (err) {
          throw new Error(err);
        }
        // You made it!
        //console.log('Dropped collection: ' + collName);
        callback();
      });
    }
  });
}

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
}

exports.resetBuyer = function(callback) {
  var buyer = {
    'keychain' : {
      'welcomeLink': 'a84e44544afb66dedba6a',
      'email': 'jamesdoe@example.org',
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
      'evsVerified': true,
      'phoneVerified': true,
      'street1' : '125 Street',
      'street2' : 'Apt 3',
      'phone' : '5551239567',
      'city': 'Brooklyn',
      'state': 'NY',
      'zip': '11201'
    },
    'accountVerified' : true,
    'root' : false,
    'password' : '6ccc4a48bf6701c1d824c08276dc182b159425686f4d048d3c7abe342e83b24beb4d015a451a6a4d5ef283a6299e418367ae90cbf0ad8df06e3c24259c82129f',
    'salt' : 'fbf897be7250e952aa13ef0d1ae1c3c71b52102b64c24f7bc8a1c70ed0de482edb81680be6dc28f95c450c9677d5d8412389a736b812052edac8632c7422f808'
  };

  MongoClient.connect(url, function(err, db) {
    var collection = db.collection('users');
    collection.remove({ 'apiKey' : buyer.apiKey }, function(err, result) {
      collection.insert([buyer], function(err, result) {
        db.close();
        callback(result[0]);
      });
    });
  });

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
    async.parallel([
        function(cb) {
          fs.readFile('data/tradelines.json', function(err, data) {
            tradelines = JSON.parse(data).data;
            cb();
          });
        },
        function(cb) {
          fs.readFile('data/products.json', function(err, data) {
            products = JSON.parse(data).data;
            cb();
          });
        },
        function(cb) {
          exports.dropCollection('tradelines', cb);
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
          function(cb) {
            collection = db.collection('tradelines');
            for(var i in tradelines) {
              tradelines[i].product = productIds[i];
              tradelines[i].seller = sellerId;
            }
            collection.insert(tradelines, function(err, result) {
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
