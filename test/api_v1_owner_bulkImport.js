var request = require('request'),
  should = require('should'),
  path = require('path'),
  fs = require('fs'),
  port = process.env.PORT || 3000,
  testId = Math.floor(Math.random() * 10000),
  ownerHuntKey;

describe('Owner can upload CSV file with clients', function () {
  before(function (done) {
    request({
      'method': 'POST',
      'url': 'http://localhost:' + port + '/api/v1/owner/login',
      'form': {
        'username': 'owner@example.org',
        'password': 'test123'
      }
    }, function (error, response, body) {
      if (error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(200);
        var bodyParsed = JSON.parse(body);
        bodyParsed.Code.should.be.equal(200);
        bodyParsed.huntKey.should.be.a.String;
        ownerHuntKey = bodyParsed.huntKey;
        done();
      }
    });
  });

  it('works', function (done) {

    var r = request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/owner/bulkImport',
        'headers': {'huntKey': ownerHuntKey}
      }, function (err, response, body) {
        if (err) {
          done(err);
        } else {
          console.log('Upload successful!  Server responded with:', body);
          done();
        }
      }
    );


    var form = r.form();
    form.append('myCsv', fs.createReadStream(path.join(__dirname, 'clientsExample.csv')));
  });
});