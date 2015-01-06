var _ = require('underscore');

module.exports = exports = function(core) {
  var Schema = core.mongoose.Schema;

  var AuPurchaseSchema = new Schema({

    'tradeline': { type: Schema.Types.ObjectId, ref: 'TradeLine', required: true },

    'buyer': { type: Schema.Types.ObjectId, ref: 'User', required: true },
    'seller': { type: Schema.Types.ObjectId, ref: 'User', required: true },

    'order': { type: Schema.Types.ObjectId, ref: 'Order' },

    // soldFor: How much buyer paid (copy from the tradeLine, not link, because it could change)
    'soldFor': Number,

    //sellerPayout: How much the seller is owed (copy from tradeLine, not link, because it could change)
    'sellerPayout': Number,

    //dateAuAdded: Date the AU was added to buyer Credit Profile or null
    'dateAdded': Date,
    //dateAuRemoved: Date the AU was removed from Buyer Credit Profile or null
    'dateRemoved': Date,

    // TODO store status as an ENUM
    /*
     == Status ==
     To Be Added
     To Be Verified
     Verified As Added
     AU Removed
     To Be Refunded
     Refund Complete
     */
    'status': { type: String, default: 'To Be Added' }
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

  AuPurchaseSchema.index({
    tradeline: 1
  });

  return core.mongoConnection.model('AuPurchase', AuPurchaseSchema);
}
