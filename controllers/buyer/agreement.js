var ensureBuyerOrOwner = require('../../lib/middleware.js').ensureBuyerOrOwner;

module.exports = exports = function (core) {
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