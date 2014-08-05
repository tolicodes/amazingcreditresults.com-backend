var ensureBuyerOrSeller = require('../../../lib/middleware.js').ensureBuyerOrSeller,
  xml2js = require('xml2js'),
  curl = require('request'),
  utilities = require('./../../../lib/utilities.js');


module.exports = exports = function (core) {
  core.app.post('/api/v1/verifyssn', ensureBuyerOrSeller, function (request, response) {
    if (request.user.profile && request.user.profile.ssn) {
      if (request.user.profile.ssnVerified) {
        utilities.error(400, 'SSN code is already verified!', response);
      } else {
        var retryAfterMs = (24 * 60 * 60 * 1000 / 3),  //3 times per day
          retryAfter = Date.now() - (request.user.profile.ssnVerificationTry) ? (request.user.profile.ssnVerificationTry.getTime()) : (Date.now());
        if (retryAfter < retryAfterMs) {
//perform verification
          var builder = new xml2js.Builder(),
            content = builder.buildObject({
              'PlatformRequest': {
                'Credentials': {
                  'Username': core.config.evs.username,
                  'Password': core.config.evs.password
                },
                'CustomerReference': request.user.id,
                'Identity': {
                  'Ssn': request.user.profile.ssn
                }
              }
            });
          curl({
            'method': 'POST',
            'url': 'https://identiflo.everification.net/WebServices/Integrated/Main/V200/SSNLookup',
            'body': content
          }, function (error, response, body) {
            if (error) {
              throw error;
            } else {
//if names matches, we verify account
            }
          });
        } else {
//rate limit
          response.status(400);
          response.json({
            'status': 'error',
            'errors': [
              {
                'code': 400,
                'message': 'SSN verification rate limited'
              }
            ],
            'retryAfter': retryAfter
          });
        }
      }
    } else {
      utilities.error(400, 'SSN code is not entered!', response);
    }
  });
};