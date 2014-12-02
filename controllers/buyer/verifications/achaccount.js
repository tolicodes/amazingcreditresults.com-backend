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
  }
}

module.exports = exports = function (core) {
  balanced.configure(core.config.balancedApiKey);

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
        console.log('Bank account created: ' + acctId);
        bank_account.verify().then(function (verification) {
          console.log('Verifying!');
          response.status(202).json({'Status': 'pending'});
        });
      }, function(err) {
        response.status(500).json(err);
      });
    }
  });

  core.app.post('/api/v1/myself/billing/achAccount/verify', ensureRole('buyer'), function (request, response) {
    response.status(403).json('Endpoint in progress');
  });
}
