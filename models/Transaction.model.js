// TODO create a presave that errors out if user cannot afford (negative) transaction
module.exports = exports = function (core) {

  var TransactionSchema = new core.mongoose.Schema({
      'client': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      'amount': { type: Number, min: -100000, max: 100000, default: 0, required: true  },
      'notes': String,
      'date': Date,
      'timestamp': {type: Date, default: Date.now() },
      'type': String,
      'fundingSource': String,
      'reason': String,
      'userCreated': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User' },
      'orderId': { type: core.mongoose.Schema.Types.ObjectId, ref: 'Order' }
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
    if (ret.date) {
      ret.date = ret.date.toDateString();
    }
  };

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
