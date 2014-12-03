var ensureRole = require('../../../lib/middleware.js').ensureRole;
var balanced = require('balanced-official');

var ACH = {
  verifyCreationRequest: function(body) {
    var errors = [];
    var createError = function(msg, field) {
      return {
        'code' : 400,
        'message': msg,
        'field': field
      };
    };
    if (!body.accountNumber) {
      errors.push(createError(
        'Account Number is not provided!',
        'accountNumber'
      ));
    }
    if (!body.routingNumber) {
      errors.push(createError(
        'Routing Number is not provided!',
        'routingNumber'
      ));
    }
    if (!body.accountType || (['checking', 'savings'].indexOf(body.accountType) === -1)) {
      errors.push(createError(
        'Account type must be `checking` or `savings`!',
        'accountType'
      ));
    }
    return (errors.length === 0) ? false : errors;
  },
  verifyCheckRequest: function(body, user) {
    errors = [];
    if (!body.amount1) {
      errors.push(createError(
        'Amount1 is missing!',
        'amount1'
      ));
    }
    if (!body.amount2) {
      errors.push(createError(
        'Amount2 is missing!',
        'amount2'
      ));
    }
    if (!user.achAccount) {
      errors.push(createError(
        'Must add ACH account before verifying.',
        'achAccount'
      ));
    } else if (user.achAccount.verified === true) {
      errors.push(createError(
        'ACH account already verified!',
        'achAccount'
      ));
    }
    return (errors.length === 0) ? false : errors;
  }
}

module.exports = exports = function (core) {
  balanced.configure(core.config.balancedApiKey);

  var setBalanceAccount = function(userId, acctId, cb) {
    core.model.User
      .findOneAndUpdate({
        _id: userId
      }, {
        'profile.achAccount' : {
          'id': acctId,
          'verified': false
        }
      }, function(err, user) {
        cb(err, user);
      });
  };

  core.app.post('/api/v1/myself/billing/achAccount', ensureRole('buyer'), function (request, response) {
    var errors = ACH.verifyCreationRequest(request.body);
    if (errors) {
      response.status(400).json({status: 'Error', errors: errors});
    } else {
      var acct = {
        'account_number': request.body.accountNumber,
        'account_type': request.body.accountType,
        'name': request.user.name.givenName + ' ' + request.user.name.familyName,
        'routing_number': request.body.routingNumber
      };
      if (request.body.meta) {
        acct.meta = request.body.meta;
      }
      // TODO implement with balanced
      // Add account number to buyer profile
      // Set verify to false

      balanced.marketplace.bank_accounts.create(acct).then(function (bank_account) {
        var acctId = bank_account.id;
        bank_account.verify().then(function () {
          setBalanceAccount(request.user.id, bank_account.id, function(err) {
            if (err) {
              response.status(500).json({
                'status': 'error',
                'errors': [{
                  'code': 500,
                  'message': err
                }]
              });
            } else {
              response.status(202).json({
                'status': 'ok',
                'account': bank_account.id,
                'verified': false
              });
            }
          });
        });
      }, function(err) {
        response.status(500).json(err);
      });
    }
  });

  core.app.post('/api/v1/myself/billing/achAccount/verify', ensureRole('buyer'), function (request, response) {
    var errors = verifyCheckRequest(request.body, request.user);
    if (errors) {
      response.status(400).json({status: 'Error', errors: errors});
    } else {
      balanced.get('/verifications/'+request.user.achAccount.id).then(function (bank_account) {
        // TODO implement
      });
      response.status(403).json('Endpoint in progress');
    }
  });
}
