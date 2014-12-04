var ensureRole = require('../../../lib/middleware.js').ensureRole;
var balanced = require('balanced-official');
var createError = require('../../../lib/utilities.js').createError;
var ACH = {
  verifyCreationRequest: function(body) {
    var errors = [];

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
    var errors = [];

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
    // Removed to allow user to create new ACH account
    if (!user.profile || !user.profile.achAccount) {
      errors.push(createError(
          'Must add ACH account before verifying.'
      ));
    }

    if (user.profile && user.profile.achAccount && user.profile.achAccount.verified === true) {
      errors.push(createError(
        'ACH account already verified!'
      ));
    }
    return (errors.length === 0) ? false : errors;
  }
};

module.exports = exports = function (core) {
  balanced.configure(core.config.balancedApiKey);

  var setBalanceAccount = function(userId, acctId, verifyId, cb) {
    core.model.User
      .findOneAndUpdate({
        _id: userId
      }, {
        'profile.achAccount' : {
          'id': acctId,
          'verifyId': verifyId,
          'verified': false
        }
      }, cb);
  };

  var setVerified = function(userId, cb) {
    core.model.User
      .findOneAndUpdate({
        _id: userId
      }, {
        'profile.achAccount.verified' : true
      }, cb);
  };

  core.app.post('/api/v1/myself/billing/achAccount', ensureRole('buyer'), function (request, response) {
    var internalError = function(err) {
      var status = 500;
      response.status(status).json({
        'status': 'Error',
        'errors': [{
          'code': status,
          'message': err
        }]
      });
    };
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

      console.log('CREATING BANK ACCOUNT WITH BALANCED');
      balanced.marketplace.bank_accounts.create(acct).then(function (bank_account) {
        console.log('DONE...CREATING BANK ACCOUNT VERIFICATION WITH BALANCED');
        bank_account.verify().then(function (verification) {
          console.log('DONE...UPDATING USER INFO');
          setBalanceAccount(request.user.id, bank_account.id, verification.id, function(err) {
            if (err) {
              internalError(err);
            } else {
              response.status(202).json({
                'status': 'ok',
                'account': bank_account.id,
                'verified': false
              });
            }
          });
        }, internalError);
      }, internalError);
    }
  });

  core.app.post('/api/v1/myself/billing/achAccount/verify', ensureRole('buyer'), function (request, response) {
    var internalError = function(err) {
      response.status(500).json({
        'status': 'Error',
        'errors': [{
          'code': 500,
          'message': err
        }]
      });
    };
    var errors = ACH.verifyCheckRequest(request.body, request.user);
    if (errors) {
      response.status(400).json({status: 'Error', errors: errors});
    } else {
      console.log('VERIFYING BANK ACCOUNT PAYOUTS WITH BALANCED');
      try {
        var uri = '/verifications/'+request.user.profile.achAccount.verifyId;

        balanced.get(uri).confirm(request.body.amount1, request.body.amount2).then(function () {
          console.log('DONE..UPDATING USER PROFILE');
          setVerified(request.user.id, function(){
            response.status(202).json({verificationSuccess: true});
          })
        }, function() {
          response.status(400).json({verificationSuccess: false});
        });
      } catch(err) {
        internalError(err);
      }

    }
  });
};
