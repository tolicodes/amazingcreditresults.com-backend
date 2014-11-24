var MongoClient = require('mongodb').MongoClient,
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
      'welcomeLink' : 'a84e44544afb66dedba5a',
      'email' : 'janedoe@example.org'
    },
    'name' : {
      'familyName' : 'Doe',
      'givenName' : 'Jane',
      'middleName' : 'Eleonor'
    },
    'apiKey' : 'abc2',
    'roles' : {
      'buyer' : true,
      'seller' : false,
      'owner' : null
    },
    'profile' : {
      'zip' : '11201',
      'state' : 'NY',
      'city' : 'Brooklyn',
      'phone' : '5551234567',
      'street2' : 'Apt 1',
      'street1' : '123 Street'
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
        callback();
      });
    });
  });

};

exports.findWithRole = function (role, body) {
  return _.find(body.data, function (user) {
    return user.roles[role];
  });
}
