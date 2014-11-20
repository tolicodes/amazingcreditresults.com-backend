var _ = require('underscore');

module.exports = exports = function(core) {
  var ProductSchema = new core.mongoose.Schema({
    'name': {
      type: String,
      required: true
    },
    'bank': {
      type: String,
      required: true
    },
    'type': {
      type: String,
      require: true
    },

    'reportsToExperian': {
      type: Boolean, default: false
    },
    'reportsToEquifax': {
      type: Boolean, default: false
    },
    'reportsToTransunion': {
      type: Boolean, default: false
    },

    'ncRating': {
      type: String, 
      default: 'None'
    },
    'bcRating': {
      type: String, 
      default: 'None'
    },
    'moRating': {
      type: String, 
      default: 'None'
    },

    'improvingShortCreditHistory': {
      type: String, 
      default: 'None'
    },
    'improvingBadCreditScore': {
      type: String, 
      default: 'None'
    },
    'improvingMaxedOutCredit': {
      type: String, 
      default: 'None'
    },

    'notes': String,
    
    'totalAus': {
      type: Number,
      min: 0,
      max: 15
    },

    'owner': {
      type: core.mongoose.Schema.Types.ObjectId,
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

  ProductSchema.index({
    name: 1 //todo - more indexes? depends on workflow...
  });

  ProductSchema.virtual('reportsTo')
    .get(function() {
      var reportsTo = [];

      _(['Equifax', 'Transunion', 'Experian']).each(function(agency) {
        if (this['reportsTo' + agency]) {
          reportsTo.push(agency);
        }
      }, this);

      return reportsTo;
    })
    .set(function(vals) {
      _(['Equifax', 'Transunion', 'Experian']).each(function(agency) {
        this['reportsTo' + agency] = vals.indexOf(agency) !== -1;
      }, this);
    });

  ProductSchema.pre('remove', function(next) {
    var t = this;
    core.model.TradeLine.count({
      'product': t._id
    }, function(error, tradeLinesFound) {
      if (error) {
        next(error);
      } else {
        if (tradeLinesFound === 0) {
          next();
        } else {
          next(new Error('Unable to remove this Product. It is used by ' + tradeLinesFound + ' tradelines!'));
        }
      }
    });
  });

  //HRW specific
  ProductSchema.statics.canCreate = function(user, callback) {
    if (user && (user.roles && user.roles.owner) || user.root) { //only authorized user can create new article
      callback(null, true, 'owner');
    } else {
      callback(null, false);
    }
  };

  ProductSchema.statics.listFilter = function(user, callback) {
    if (user) {
      if ((user.roles && user.roles.owner) || user.root) {
        callback(null, {}, [
          'id',
          'name',
          'bank',
          'type',
          'ncRating',
          'bcRating',
          'moRating',
          'improvingShortCreditHistory',
          'improvingBadCreditScore',
          'improvingMaxedOutCredit',
          'reportsToExperian',
          'reportsToEquifax',
          'reportsToTransunion',
          'notes'
        ]);
      } else {
        callback(null, {}, [
          'id',
          'name',
          'bank',
          'type',
          'ncRating',
          'bcRating',
          'moRating',
          'improvingShortCreditHistory',
          'improvingBadCreditScore',
          'improvingMaxedOutCredit',
          'reportsToExperian',
          'reportsToEquifax',
          'reportsToTransunion'
        ]);
      }
    } else {
      callback(null, false); //non authorized user cannot list anything!
    }
  };

  ProductSchema.methods.canRead = function(user, callback) {
    if (user) {
      if ((user.roles && user.roles.owner) || user.root) {
        callback(null, true, [
          'id',
          'name',
          'bank',
          'type',
          'ncRating',
          'bcRating',
          'moRating',
          'improvingShortCreditHistory',
          'improvingBadCreditScore',
          'improvingMaxedOutCredit',
          'reportsToExperian',
          'reportsToEquifax',
          'reportsToTransunion',
          'notes', 'owner'
        ], ['owner']);
      } else {
        callback(null, true, [
          'id',
          'name',
          'bank',
          'type',
          'ncRating',
          'bcRating',
          'moRating',
          'improvingShortCreditHistory',
          'improvingBadCreditScore',
          'improvingMaxedOutCredit',
          'reportsToExperian',
          'reportsToEquifax',
          'reportsToTransunion'
        ]);
      }
    } else {
      callback(null, false); //non authorized user cannot list anything!
    }
  };

  ProductSchema.methods.canUpdate = function(user, callback) {
    if (user && ((user.roles && user.roles.owner) || user.root)) {
      callback(null, true, [
        'name',
        'bank',
        'type',
        'ncRating',
        'bcRating',
        'moRating',
        'improvingShortCreditHistory',
        'improvingBadCreditScore',
        'improvingMaxedOutCredit',
        'reportsToExperian',
        'reportsToEquifax',
        'reportsToTransunion',
        'notes'
      ])
    } else {
      callback(null, false); //non authorized user cannot edit anything!
    }
  };

  ProductSchema.methods.canDelete = function(user, callback) {
    callback(null, (user && ((user.roles && user.roles.owner) || user.root)));
  };

  return core.mongoConnection.model('Product', ProductSchema);
};
