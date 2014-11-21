var MongoClient = require('mongodb').MongoClient;
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
        console.log('Dropped collection: ' + collName);
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
