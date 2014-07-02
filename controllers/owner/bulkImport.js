//https://oselot.atlassian.net/browse/ACR-61#
var csv = require('fast-csv'),
  fs = require('fs'),
  multiPart = require('connect-multiparty')({
    'autoFields': false,
    'autoFiles': false
  }),
  ensureUserIsOwnerMiddleware = require('./../../lib/middleware.js').ensureOwner,
  formatUser = require('./../formatter.js').formatUserForOwner;

module.exports = exports = function (core) {
  core.app.get('/api/v1/owner/clientsExample.csv', ensureUserIsOwnerMiddleware, function (request, response) {
    response.sendfile(__dirname + '/clientsExample.csv');
  });

  core.app.get('/owner/bulkImport', ensureUserIsOwnerMiddleware, function (request, response) {
    response.render('owner/bulkImport', {'title': 'Bulk import of clients'});
  });

  core.app.get('/api/v1/owner/bulkImport', ensureUserIsOwnerMiddleware, function (request, response) {
    response.send('ok?');
  });

  core.app.post('/api/v1/owner/bulkImport', ensureUserIsOwnerMiddleware, multiPart, function (request, response) {
    if (request.files && request.files.myCsv) {
      var rs = fs.createReadStream(request.files.myCsv.path),
        data = [];

      var csvStream = csv({'objectMode': true, 'headers': true, 'ignoreEmpty': true})
        .on('record', function (client) {
          data.push(client);
        })
        .on('end', function () {
          core.async.map(data,
            function (user, cb) {
              core.model.User.findOneAndUpdate(
                { 'keychain.email': user.email },
                {
                  'name': {
                    'familyName': user.familyName || '',
                    'givenName': user.givenName || '',
                    'middleName': user.middleName || ''
                  },
                  'profile': {
                    'title': user.title,
                    'phone': user.phone,
                    'altPhone': user.altPhone,
                    'state': user.state,
                    'city': user.city,
                    'zip': user.zip,
                    'street1': user.street1,
                    'street2': user.street2
                  },
                  'apiKey': core.rack(),
                  'email': user.email,
                  'roles': {
                    'owner': null,
                    'seller': null,
                    'buyer': true
                  },
                  'accountVerified': false,
                  'root': false
                },
                {
                  'upsert': true
                },
                cb);
            },
            function (error, clientsCreated) {
              if (error) {
                throw error;
              } else {
                response.json({'data': clientsCreated.map(formatUser)});
              }
            });
        });

      rs.pipe(csvStream);
    } else {
      response.status(400);
      response.json({
        'status': 'Error',
        'errors': [
          {
            'code': 400,
            'message': 'File was not uploaded!'
          }
        ]
      });
    }
  });
};