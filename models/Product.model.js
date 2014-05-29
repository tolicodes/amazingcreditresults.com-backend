module.exports = exports = function (core) {
  var ranks = ['None','Bronze', 'Silver', 'Gold'],
    types = ['MasterCard', 'Visa', 'American Express', 'Discover'];

  var ProductSchema = new core.mongoose.Schema({
    'name': {type: String, required: true},
    'bank': {type: String, required: true},
    '_ncRating': { type: Number, min: 0, max: 3, default: 0 },
    '_bcRating': { type: Number, min: 0, max: 3, default: 0 },
    '_moRating': { type: Number, min: 0, max: 3, default: 0 },
    '_type': { type: Number, min: 0, max: 3, default: 0 },
    'reportsToExperian': Boolean,
    'reportsToEquifax': Boolean,
    'reportsToTransunion': Boolean,
    'notes': String,
    'maximumAus': { type: Number, min: 0, max: 15 }
  },
  {
    toObject: { getters: true, virtuals: true },
    toJSON: { getters: true, virtuals: true }
  });

  ProductSchema.index({
    name: 1 //todo - more indexes? depends on workflow...
  });

  ProductSchema.pre('remove', function(next){
    var t = this;
    core.model.TradeLine.count({'product':t._id}, function(error, tradeLinesFound){
      if(error) {
        next(error);
      } else {
        if(tradeLinesFound === 0){
          next();
        } else {
          next(new Error('Unable to remove this Product. It is used by '+tradeLinesFound+' tradelines!'));
        }
      }
    });
  });

  ProductSchema.virtual('ncRating')
    .get(function () {
      return ranks[this._ncRating];
    })
    .set(function (val) {
      var i = ranks.indexOf(val);
      if (i !== -1) {
        this._ncRating = i;
      }
    });

  ProductSchema.virtual('bcRating')
    .get(function () {
      return ranks[this._bcRating];
    })
    .set(function (val) {
      var i = ranks.indexOf(val);
      if (i !== -1) {
        this._bcRating = i;
      }
    });

  ProductSchema.virtual('moRating')
    .get(function () {
      return ranks[this._moRating];
    })
    .set(function (val) {
      var i = ranks.indexOf(val);
      if (i !== -1) {
        this._moRating = i;
      }
    });

  ProductSchema.virtual('type')
    .get(function () {
      return types[this._type];
    })
    .set(function (val) {
      var i = types.indexOf(val);
      if (i !== -1) {
        this._type = i;
      }
    });

  ProductSchema.methods.toJSON = function () {
    return {
      'id': this.id,
      'name': this.name,
      'bank': this.bank,

      'type': this.type,
      'ncRating': this.ncRating,
      'bcRating': this.bcRating,
      'moRating': this.moRating,
/*/
      '_ncRating': this._ncRating,
      '_bcRating': this._bcRating,
      '_moRating': this._moRating,

//*/
      'reportsToExperian': this.reportsToExperian,
      'reportsToEquifax': this.reportsToEquifax,
      'reportsToTransunion': this.reportsToTransunion
    }
  };

  return core.mongoConnection.model('Product', ProductSchema);
};