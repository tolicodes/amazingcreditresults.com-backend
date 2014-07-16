var ensureBuyerOrSeller = require('../../../lib/middleware.js').ensureBuyerOrOwner;
//https://github.com/getprove/prove-api/


module.exports = exports = function (core) {
  var getprove = require('getprove')(core.config.getProveApiKey);

  core.app.get('/api/v1/verifyPhone', ensureBuyerOrSeller, function (request, response) {
    if (request.user.profile && request.user.profile.phoneVerified) {
      response.status(200);
      response.json({'status': 'Ok', 'phoneVerified': true, 'message': 'Phone of ' + request.user.profile.phone + ' is verified!'});
    } else {
      request.user.profile.phone = request.user.profile.phone || '3478829902'; //todo - remove from production!!!
      getprove.verify.create({ tel: request.user.profile.phone }, function (error, verify) {
        if (error) {
          throw error;
        } else {
          request.user.profile.phoneVerificationId = verify.id;
          request.user.save(function (error) {
            if (error) {
              throw error;
            } else {
              response.status(202);
              response.json({'status': 'Ok', 'phoneVerified': false, 'message': 'Phone of ' + request.user.profile.phone + ' will be verified!'});
            }
          });
        }
      });
    }
  });

  core.app.post('/api/v1/verifyPhone', ensureBuyerOrSeller, function (request, response) {
    if (request.body.pin) {
      getprove.verify.pin(request.user.profile.phoneVerificationId, request.body.pin, function (err, verify) {
        if (err) {
          throw err;
        } else {
          if (verify.verified) {
            delete request.user.profile.phoneVerificationId;
            request.user.profile.phoneVerified = true;
            request.user.save(function (error) {
              if (error) {
                throw error;
              } else {
                response.status(202);
                response.json({'status': 'Ok', 'phoneVerified': true, 'message': 'Phone of ' + request.user.profile.phone + ' is verified'});
              }
            });
          } else {
            response.status(400);
            response.json({
              'status': 'Error',
              'errors': [
                {
                  'code': 400,
                  'message': 'Pin code is invalid!',
                  'field': 'pin'
                }
              ]
            });
          }
        }
      });
    } else {
      response.status(400);
      response.json({
        'status': 'Error',
        'errors': [
          {
            'code': 400,
            'message': 'Pin code is missed!',
            'field': 'pin'
          }
        ]
      });
    }
  });
};