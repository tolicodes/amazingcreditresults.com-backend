module.exports = exports = function (core) {
  var types = ['ownerUpload', 'stripeUpload', 'checkout', 'withdraw'];

  var TransactionSchema = new core.mongoose.Schema({
      'client': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      '_type': { type: Number, min: 0, max: 3, default: 0 },
      'amount': { type: Number, min: -100000, max: 100000, default: 0, required: true  },
      'notes': String,
      'date': Date,
      'paidBy': String,
      'timestamp': {type: Date, default: Date.now()}
    },
    {
      toObject: { getters: true, virtuals: true },
      toJSON: { getters: true, virtuals: true }
    });

  TransactionSchema.index({
    client: 1, //todo - more indexes? depends on workflow...
    timestamp: 1
  });

  TransactionSchema.path('client').validate(function (value, respond) {
    return core.model.User.findById(value, function (error, userFound) {
      if (error) {
        throw error;
      } else {
        respond(userFound ? true : false);
      }
    });
  }, 'Unable to find client!');

  TransactionSchema.options.toJSON.transform = function (doc, ret) {
    ret.date = ret.date.toDateString();
  };

  TransactionSchema.virtual('type')
    .get(function () {
      return types[this._type];
    })
    .set(function (val) {
      var i = types.indexOf(val);
      if (i === -1) {
        return;
      } else {
        this._type = i;
      }
    });

  TransactionSchema.post('save', function (doc) {
    core.model.Transaction.find({'client': doc.client}, function (error, transactionsFound) {
      if (error) {
        throw error;
      } else {
        var balance = 0;
        transactionsFound.map(function (t) {
          balance = balance + t.amount;
        });
        core.model.User.findById(doc.client, function (error, userFound) {
          if (error) {
            throw error;
          } else {
            if (userFound) {
              userFound.profile = userFound.profile || {};
              userFound.profile.balance = balance;
              userFound.save(function (error) {
                if (error) {
                  throw error;
                }
              });
            } else {
              throw new Error('Unable to find the reciever of transaction #' + doc.id);
            }
          }
        });
      }
    });
  });

  return core.mongoConnection.model('Transaction', TransactionSchema);
};
