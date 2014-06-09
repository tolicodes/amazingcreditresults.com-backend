//https://oselot.atlassian.net/browse/ACR-246

module.exports = exports = function (core) {
  var ranks = ['None', 'Bronze', 'Silver', 'Gold'],
    statuses = ['pending', 'approved', 'denied'];

  var TradeLineChangesSchema = new core.mongoose.Schema({
      'product': { type: core.mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      'seller': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      'totalAus': { type: Number, min: 0, max: 9999 },
      'usedAus': { type: Number, min: 0, max: 9999 },
      'statementDate': { type: Number, min: 0, max: 10 },
//      'dateOpen': {type: Date, default: Date.now()},
      'creditLimit': { type: Number, min: 0, max: 999999 },
      'cashLimit': { type: Number, min: 0, max: 999999 },
      'currentBalance': { type: Number, min: 0, max: 9999 },
      '_ncRating': { type: Number, min: 0, max: 3, default: 0 },
      '_bcRating': { type: Number, min: 0, max: 3, default: 0 },
      '_moRating': { type: Number, min: 0, max: 3, default: 0 },
      'cost': { type: Number, min: 0, max: 10000000},
      'price': { type: Number, min: 0, max: 10000000},
      'active': {type: Boolean, default: false},

//for versioning
      'tradeLine': { type: core.mongoose.Schema.Types.ObjectId, ref: 'TradeLine', required: true },
      'createdAt': {type: Date, default: Date.now()},
      'issuer': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      'reviewer': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
      '_status': { type: Number, min: 0, max: 2},
      'notes': String
    },
    {
      toObject: { getters: true, virtuals: true },
      toJSON: { getters: true, virtuals: true }
    }
  );


  TradeLineChangesSchema.index({
    tradeLine: 1
  });

  TradeLineChangesSchema.path('product').validate(function (value, respond) {
    return core.model.Product.findById(value, function (error, productFound) {
      if (error) {
        throw error;
      } else {
        respond(productFound ? true : false);
      }
    });
  }, 'Unable to find corresponding Product!');

  TradeLineChangesSchema.path('seller').validate(function (value, respond) {
    return core.model.User.findById(value, function (error, userFound) {
      if (error) {
        throw error;
      } else {
        respond(userFound ? true : false);
      }
    });
  }, 'Unable to find corresponding Seller among the Users!');

  TradeLineChangesSchema.path('tradeLine').validate(function (value, respond) {
    return core.model.TradeLine.findById(value, function (error, userFound) {
      if (error) {
        throw error;
      } else {
        respond(userFound ? true : false);
      }
    });
  }, 'Unable to find corresponding Tradeline!');

  TradeLineChangesSchema.path('issuer').validate(function (value, respond) {
    return core.model.User.findById(value, function (error, userFound) {
      if (error) {
        throw error;
      } else {
        respond(userFound ? true : false);
      }
    });
  }, 'Unable to find corresponding Issuer for this tradeLine among the Users!');

  TradeLineChangesSchema.path('reviewer').validate(function (value, respond) {
    return core.model.User.findById(value, function (error, userFound) {
      if (error) {
        throw error;
      } else {
        respond(userFound ? true : false);
      }
    });
  }, 'Unable to find corresponding Reviewer for this tradeLine among the Users!');


  TradeLineChangesSchema.virtual('ncRating')
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

  TradeLineChangesSchema.virtual('bcRating')
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

  TradeLineChangesSchema.virtual('moRating')
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

  TradeLineChangesSchema.virtual('availableAus')
    .get(function () {
      return (this.totalAus - this.usedAus);
    })
    .set(function (val) {
      return;
    });

  TradeLineChangesSchema.virtual('status')
    .get(function () {
      return statuses[this._status];
    })
    .set(function (val) {
      var i = statuses.indexOf(val);
      if (i === -1) {
        return;
      } else {
        this._status = i;
      }
    });


  function changeStatus(change, user, status, callback) {
    if (user && user.roles && user.roles.owner === true) {
      switch (status) {
        case 1:
          core.model.TradeLines.findById(change.tradeLine, function (error, TradeLineFound) {
            if (error) {
              callback(error);
            } else {
              if (TradeLineFound) {
                [
                  'product',
                  'seller',
                  'totalAus',
                  'usedAus',
                  'statementDate',
                  'creditLimit',
                  'cashLimit',
                  'currentBalance',
                  '_ncRating',
                  '_bcRating',
                  '_moRating',
                  'cost',
                  'price',
                  'active'
                ].map(function (field) {
                    TradeLineFound[field] = change[field];
                  });

                TradeLineFound.save(function (error1) {
                  if (error1) {
                    callback(error1);
                  } else {
                    change._status = 1;
                    change.reviewer = user.id;
                    change.save(function (error) {
                      callback(error);
                    });
                  }
                });
              } else {
                callback(new Error('Unable to find tradeLine'));
              }
            }
          });
          break;
        case 2:
          change._status = 2;
          change.reviewer = user.id;
          change.save(function (error) {
            callback(error);
          });
          break;
        default:
          callback(new Error('Wrong status - it have to be 1(`approved`) or 2(`denied`)'));
      }
    } else {
      callback(new Error('Unable to approve tradeLine on behalf of this user! User is not a Owner or wrong object'));
    }
  }

  TradeLineChangesSchema.methods.approve = function (user, callback) {
    changeStatus(this, user, 1, callback);
  };

  TradeLineChangesSchema.methods.deny = function (user, callback) {
    changeStatus(this, user, 2, callback);
  };

  return core.mongoConnection.model('TradeLineChanges', TradeLineChangesSchema);
};

