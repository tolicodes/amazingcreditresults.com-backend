module.exports = exports = function (core) {
  var types = ['ownerUpload', 'stripeUpload', 'checkout', 'withdraw'];

  var TransactionSchema = new core.mongoose.Schema({
      'client': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      '_type': { type: Number, min: 0, max: 3, default: 0 },
      'amount': { type: Number, min: -100000, max: 100000, default: 0 },
      'notes': String,
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

  return core.mongoConnection.model('Transaction', TransactionSchema);
};
