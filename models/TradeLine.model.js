/*

 TRADELINE
 id
 card_id
 seller_id
 total_aus
 used_aus
 credit_limit
 cash_limit
 balance
 nc_rating
 bc_rating
 mo_rating
 cost
 price

 */

module.exports = exports = function (core) {
  var TradeLineSchema = new core.mongoose.Schema({
    'product': { type: core.mongoose.Schema.Types.ObjectId, ref: 'Product' },
    'seller': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User' },
    'totalAus': { type: Number, min: 0, max: 9999 },
    'usedAus': { type: Number, min: 0, max: 9999 },
    'creditLimit': { type: Number, min: 0, max: 9999 },
    'cashLimit': { type: Number, min: 0, max: 9999 },
    'balance': { type: Number, min: 0, max: 9999 },
    'ncRating': { type: Number, min: 0, max: 2 },
    'bcRating': { type: Number, min: 0, max: 2 },
    'moRating': { type: Number, min: 0, max: 2 },
    'cost': { type: Number, min: 0, max: 10000000},
    'notes': String
  });
//todo - add parameters for length of credit history, credit score, debt to income ratio, etc. so we can extract more precisious the tradelines

  TradeLineSchema.index({
    product: 1,
    seller: 1
//    ncRating: 1,
//    bcRating: 1,
//    moRating: 1
  });
  return core.mongoConnection.model('TradeLine', TradeLineSchema);
};
