//https://oselot.atlassian.net/browse/ACR-61#
var csv = require("fast-csv"),
  ensureUserIsOwnerMiddleware = require('./../middleware.js').ensureOwner;

module.exports = exports = function(core){
  core.app.get('/api/v1/owner/clientsExample.csv', ensureUserIsOwnerMiddleware, function(request, response){
    console.log(__dirname+'/clientsExample.csv');
    response.sendfile(__dirname+'/clientsExample.csv');
  });

  core.app.get('/api/v1/owner/bulkImport', ensureUserIsOwnerMiddleware, function(request, response){
    response.send('ok?');
  });

  core.app.post('/api/v1/owner/bulkImport', ensureUserIsOwnerMiddleware, function(request, response){
    response.json(request.files);
  });
};