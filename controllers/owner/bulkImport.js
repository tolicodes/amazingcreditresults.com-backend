//https://oselot.atlassian.net/browse/ACR-61#
var csv = require('fast-csv'),
  fs = require('fs'),
  multiPart = require('connect-multiparty')({
    'autoFields': false,
    'autoFiles': false
  }),
  ensureUserIsOwnerMiddleware = require('./../middleware.js').ensureOwner;

function formatUser(user) {
  return {
    'id': user.id,
    'email': user.email,
    'name': {
      'familyName': user.name.familyName, //http://schema.org/familyName
      'givenName': user.name.givenName, //http://schema.org/givenName
      'middleName': user.name.middleName //http://schema.org/middleName - at least the google oauth has this structure!
    },
    'title': user.profile ? (user.profile.title || 'Mr.') : 'Mr.',
    'telefone': user.profile ? (user.profile.telefone || '') : '',
    'street1': user.profile ? (user.profile.street1 || '') : '',
    'needQuestionnaire': user.profile ? user.profile.needQuestionnaire : true,
    'gravatar': user.gravatar,
    'gravatar30': user.gravatar30,
    'gravatar50': user.gravatar50,
    'gravatar80': user.gravatar80,
    'gravatar100': user.gravatar100,
    'online': user.online,
    'root': user.root,
    'roles': {
      'owner': user.roles ? user.roles.owner : false,
      'buyer': user.roles ? user.roles.buyer : false,
      'seller': user.roles ? user.roles.seller : false
    },
    'accountVerified': user.accountVerified
  };
}
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