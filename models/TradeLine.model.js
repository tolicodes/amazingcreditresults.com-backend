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
  var ranks = ['None','Bronze', 'Silver', 'Gold'];

  var TradeLineSchema = new core.mongoose.Schema({
      'product': { type: core.mongoose.Schema.Types.ObjectId, ref: 'Product' },
      'seller': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User' },
      'totalAus': { type: Number, min: 0, max: 9999 },
      'usedAus': { type: Number, min: 0, max: 9999 },
      'creditLimit': { type: Number, min: 0, max: 999999 },
      'cashLimit': { type: Number, min: 0, max: 999999 },
      'balance': { type: Number, min: 0, max: 9999 },
      '_ncRating': { type: Number, min: 0, max: 2, default: 0 },
      '_bcRating': { type: Number, min: 0, max: 2, default: 0 },
      '_moRating': { type: Number, min: 0, max: 2, default: 0 },
      'cost': { type: Number, min: 0, max: 10000000},
      'notes': String
    },
    {
      toObject: { getters: true, virtuals: true },
      toJSON: { getters: true, virtuals: true }
    }
  );
//todo - add parameters for length of credit history, credit score, debt to income ratio, etc. so we can extract more precisious the tradelines

  TradeLineSchema.virtual('ncRating')
    .get(function () {
      return ranks[this._ncRating];
    })
    .set(function (val) {
      var i = ranks.indexOf(val);
      if (i === -1) {
        return;
      } else {
        this._ncRating = i;
      }
    });

  TradeLineSchema.virtual('bcRating')
    .get(function () {
      return ranks[this._bcRating];
    })
    .set(function (val) {
      var i = ranks.indexOf(val);
      if (i === -1) {
        return;
      } else {
        this._bcRating = i;
      }
    });

  TradeLineSchema.virtual('moRating')
    .get(function () {
      return ranks[this._moRating];
    })
    .set(function (val) {
      var i = ranks.indexOf(val);
      if (i === -1) {
        return;
      } else {
        this._moRating = i;
      }
    });

  TradeLineSchema.index({
    product: 1,
    seller: 1
//    _ncRating: 1,
//    _bcRating: 1,
//    _moRating: 1
  });

  TradeLineSchema.methods.toJSON = function () {
    return {
      'id': this._id,
      'totalAus': this.totalAus,
      'usedAus': this.usedAus,
      'creditLimit': this.creditLimit,
      'cashLimit': this.cashLimit,
      'balance': this.balance,
      'cost': this.cost,
      'notes': this.notes,
      'seller': this.seller,
      'product': {
        'id':this.product.id,
        'name':this.product.name,
        'bank':this.product.bank,
        'reportsToExperian':this.product.reportsToExperian,
        'reportsToEquifax':this.product.reportsToEquifax,
        'reportsToTransunion':this.product.reportsToTransunion,
        'ncRating': this.product.ncRating,
        'bcRating': this.product.bcRating,
        'moRating': this.product.moRating,
        'type': this.product.type,
      },
      'ncRating': this.ncRating,
      'bcRating': this.bcRating,
      'moRating': this.moRating,
    }
  };

  return core.mongoConnection.model('TradeLine', TradeLineSchema);
};
