var _ = require('underscore');

module.exports = exports = function(core) {
  var Schema = core.mongoose.Schema;
  var OrderSchema = new Schema({
    'orderTotal': {
      type: Number, 
      required: true
    },

    'transactions' : [{ type: Schema.Types.ObjectId, ref: 'Transaction' }],

    'timestamp': { type : Date, default: Date.now },

    'buyerId': {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    }
  }, {
    toObject: {
      getters: true,
      virtuals: true
    },
    toJSON: {
      getters: true,
      virtuals: true
    }
  });

  OrderSchema.index({
    buyerId: 1
  });

  // TODO
  OrderSchema.virtual('auPurchases')
    .get(function() {
      var auPurch = [];
      return auPurch;
    })
    .set(function(vals) {
    });

    // TODO
  OrderSchema.statics.filterByBuyerId = function(user, callback) {
    if (user && ((user.roles && user.roles.owner) || user.root)) {
      // TODO return buyer ID orders
    } else {
      callback(null, false); //non authorized user cannot list anything!
    }
  };

  // Buyer can only read their own orders, owner can see all
  OrderSchema.methods.canRead = function(user, callback) {
    if (user) {
      if ((user.roles && user.roles.owner) || user.root) {
        // return all orders
      } else if ((user.roles && user.roles.buyer)) {
        // return buyer's order
      }
    } else {
      callback(null, false); //non authorized user cannot list anything!
    }
  };

  return core.mongoConnection.model('Order', OrderSchema);
};
