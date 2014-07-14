var ensureBuyerOrOwner = require('../../lib/middleware.js').ensureBuyerOrOwner,
  DoSign = require('echosign');



module.exports = exports = function (core) {
  var userCredentials = core.config.echoSign.auth.userCredentials,
    applicationCredentials = core.config.echoSign.auth.applicationCredentials,
    doSign = new DoSign()
      .setUserCredentials(userCredentials.email, userCredentials.password, userCredentials.apiKey)
      .setApplicationCredentials(applicationCredentials.applicationId, applicationCredentials.applicationSecret)
    ;
  core.app.post('/api/v1/buyer/getAgreement', ensureBuyerOrOwner, function (request, response) {
    response.json({
      'user': request.user,
      'body': request.body
    });
  });

  core.app.post('/api/v1/buyer/signAgreement', ensureBuyerOrOwner, function (request, response) {
    response.json({
      'user': request.user,
      'body': request.body
    });
  });
};