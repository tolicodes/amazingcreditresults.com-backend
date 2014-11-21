module.exports = exports = function (core) {
  var ranks = ['None', 'Bronze', 'Silver', 'Gold'],
    TradeLineSchema = new core.mongoose.Schema(
      {
        'product': { type: core.mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        'seller': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        'totalAus': { type: Number, min: 0, max: 9999 },
        'usedAus': { type: Number, min: 0, max: 9999 },
        'currentBalance': { type: Number, min: 0, max: 9999 },
        'currentAus': { type: Number, min: 0, max: 9999 },
        'statementDate': { type: Number, min: 0, max: 10 },
        'dateOpen': {type: Date, default: Date.now()},
        'cashLimit': { type: Number, min: 0, max: 999999 },
        'creditLimit': { type: Number, min: 0, max: 999999 },
        'cost': { type: Number, min: 0, max: 10000000},
        'price': { type: Number, min: 0, max: 10000000},
        'balance': { type: Number, min: 0, max: 10000000},
        'ncRating': { type: String, default: 'None' },
        'bcRating': { type: String, default: 'None' },
        'moRating': { type: String, default: 'None' },
        'notes': String,
        'tier': Number,
        'active': {type: Boolean, default: false},
        'buyers': [
          { type: core.mongoose.Schema.Types.ObjectId, ref: 'User', required: false}
        ]
      },
      {
        toObject: { getters: true, virtuals: true },
        toJSON: { getters: true, virtuals: true }
      }
    );
//todo - add parameters for length of credit history, credit score, debt to income ratio, etc. so we can extract more precisious the tradelines

  TradeLineSchema.index({
    product: 1,
    seller: 1
  });


  TradeLineSchema.path('product').validate(function (value, respond) {
    return core.model.Product.findById(value, function (error, productFound) {
      if (error) {
        throw error;
      } else {
        respond(productFound ? true : false);
      }
    });
  }, 'Unable to find corresponding Product!');

  TradeLineSchema.path('seller').validate(function (value, respond) {
    return core.model.User.findById(value, function (error, userFound) {
      if (error) {
        throw error;
      } else {
        respond(userFound ? true : false);
      }
    });
  }, 'Unable to find corresponding Seller among the Users!');

  return core.mongoConnection.model('TradeLine', TradeLineSchema);
};
