module.exports = exports = function (core) {
  var ranks = ['None','Bronze', 'Silver', 'Gold'];

  var TradeLineSchema = new core.mongoose.Schema({
      'product': { type: core.mongoose.Schema.Types.ObjectId, ref: 'Product', required:true },
      'seller': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User', required:true },
      'totalAus': { type: Number, min: 0, max: 9999 },
      'usedAus': { type: Number, min: 0, max: 9999 },
      'statementDate': { type: Number, min: 0, max: 10 },
      'dateOpen': {type: Date, default: Date.now()},
      'creditLimit': { type: Number, min: 0, max: 999999 },
      'cashLimit': { type: Number, min: 0, max: 999999 },
      'currentBalance': { type: Number, min: 0, max: 9999 },
      '_ncRating': { type: Number, min: 0, max: 3, default: 0 },
      '_bcRating': { type: Number, min: 0, max: 3, default: 0 },
      '_moRating': { type: Number, min: 0, max: 3, default: 0 },
      'cost': { type: Number, min: 0, max: 10000000},
      'price': { type: Number, min: 0, max: 10000000},
      'notes': String,
      'active':{type: Boolean, default: false}
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
//    _ncRating: 1, //not sure - depends on workflow
//    _bcRating: 1,
//    _moRating: 1
  });


  TradeLineSchema.path('product').validate(function(value, respond) {
    return core.model.Product.findById(value, function(error, productFound){
      if(error) {
        throw error;
      } else {
        respond(productFound?true:false);
      }
    });
  }, 'Unable to find corresponding Product!');

  TradeLineSchema.path('seller').validate(function(value, respond) {
    return core.model.User.findById(value, function(error, userFound){
      if(error) {
        throw error;
      } else {
        respond(userFound?true:false);
      }
    });
  }, 'Unable to find corresponding Seller among the Users!');

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

  TradeLineSchema.virtual('availableAus')
    .get(function(){
      return (this.totalAus - this.usedAus);
    })
    .set(function(val){
      return;
    });

  TradeLineSchema.methods.toJSON = function () {
    return {
      'id': this._id,
      'active': this.active,
      'totalAus': this.totalAus,
      'usedAus': this.usedAus,
      'availableAus': this.availableAus,
      'creditLimit': this.creditLimit,
      'cashLimit': this.cashLimit,
      'currentBalance': this.currentBalance,
      'cost': this.cost,
      'price': this.price,
      'notes': this.notes,
      'seller': this.seller,
      'statementDate': this.statementDate,
      'dateOpen': this.dateOpen,
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
        'type': this.product.type
      },
      'ncRating': this.ncRating,
      'bcRating': this.bcRating,
      'moRating': this.moRating
    }
  };

  return core.mongoConnection.model('TradeLine', TradeLineSchema);
};
