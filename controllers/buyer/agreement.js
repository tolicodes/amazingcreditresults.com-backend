var ensureBuyerOrOwner = require('../../lib/middleware.js').ensureBuyerOrOwner,
  DoSign = require('echosign'),
  os = require('os'),
  wkhtmltopdf = require('wkhtmltopdf');


module.exports = exports = function (core) {
  var userCredentials = core.config.echoSign.auth.userCredentials,
    applicationCredentials = core.config.echoSign.auth.applicationCredentials,
    doSign = new DoSign()
      .setUserCredentials(userCredentials.email, userCredentials.password, userCredentials.apiKey)
      .setApplicationCredentials(applicationCredentials.applicationId, applicationCredentials.applicationSecret);

  core.app.post('/api/v1/buyer/getAgreement', ensureBuyerOrOwner, function (request, response) {
    var docName = 'agreement_' + request.user.name.givenName + '_' + request.user.name.familyName,
      transientDocumentId;

    core.async.waterfall(
      [
        function (cb) {
          core.app.render('agreements/checkoutAgreement', {
            'layout': false,
            'user': request.user,
            'date': new Date()
          }, cb);
        },
        function (agreementInHtml, cb) {
          wkhtmltopdf(agreementInHtml, { output: os.tmpdir() + '/' + docName + '.pdf' }, function (error) {
            console.log('Agreement saved in ' + os.tmpdir() + '/' + docName + '.pdf');
            cb(error);
          });
        },
        function (cb) {
          doSign.uploadTransientDocument(os.tmpdir() + '/' + docName + '.pdf', cb);
        },
        function (id, cb) {
          transientDocumentId = id;
          doSign.doRequest({
            'json': {
              'documentCreationInfo': {
                'signatureType': 'ESIGN',
                'formFieldLayerTemplates': [
                  {
//                    'libraryDocumentId': 'string',
                    'transientDocumentId': transientDocumentId,
//                    'libraryDocumentName': 'string',
//                    'documentURL': {
//                      'name': 'string',
//                      'url': 'string',
//                      'mimeType': 'string'
//                    }
                  }
                ],
//                'callbackInfo': 'string', //where to upload signed document?
//                'securityOptions': {
//                  'passwordProtection': 'string',
//                  'kbaProtection': 'string',
//                  'webIdentityProtection': 'string',
//                  'protectOpen': 'boolean',
//                  'internalPassword': 'string',
//                  'externalPassword': 'string',
//                  'openPassword': 'string'
//                },
                'recipients': [
                  {
//                    'fax': 'string',
                    'email': request.user.email,
                    'role': 'SIGNER'
                  }
                ],
//                'daysUntilSigningDeadline': 'Integer',
//                'locale': 'string',
//                'ccs': [
//                  'string'
//                ],
//                'vaultingInfo': {
//                  'enabled': 'boolean'
//                },
//                'signatureFlow': 'string',
//                'message': 'string',
//                'mergeFieldInfo': [
//                  {
//                    'defaultValue': 'string',
//                    'fieldName': 'string'
//                  }
//                ],
//                'fileInfos': [
//                  {
//                    'libraryDocumentId': 'string',
//                    'transientDocumentId': 'string',
//                    'libraryDocumentName': 'string',
//                    'documentURL': {
//                      'name': 'string',
//                      'url': 'string',
//                      'mimeType': 'string'
//                    }
//                  }
//                ],
//                'reminderFrequency': 'string',
//                'name': 'string'
//              },
//                'options': {
//                  'noChrome': 'boolean',
//                  'authoringRequested': 'boolean',
//                  'autoLoginUser': 'boolean'
//                }
              }
            }
          }, function (error, response, body) {
            if (error) {
              cb(error)
            } else {
              if (response.statusCode >= 400) {
                cb(new Error('Error - ' + response.statusCode + ' ' + body.code + ' ' + body.message));
              } else {
                cb(null, body);
              }
            }
          });
        }
      ],
      function (error, echoSignResponse) {
        if (error) {
          throw error;
        } else {
          response.json({
            'transientDocumentId': transientDocumentId,
            'user': request.user,
            'echoSignResponse': echoSignResponse //todo - save it into profile?
          });
        }
      }
    );
  });

  core.app.put('/api/v1/buyer/signAgreement', ensureBuyerOrOwner, function (request, response) {
    response.json({
      'user': request.user,
      'body': request.body
    });
  });
};