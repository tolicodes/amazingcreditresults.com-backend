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
//todo: caching
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


      }


    } else {
      utilities.error(400, 'SSN code is not entered!', response);
    }
  });
};