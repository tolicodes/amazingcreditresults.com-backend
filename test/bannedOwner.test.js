var request = require('request'),
  should = require('should'),
  port = process.env.PORT || 3000,
  bannedOwnerHuntKey = 'iaqtumioxrunxvyemsebsvcodytumioxrunxvyemsebsviaqcody';

describe('Using huntKey as header for BANNED owner', function () {
  it('works with `huntKey` as custom header for GET response', function (done) {
    request({
      'method': 'GET',
      'url': 'http://localhost:' + port + '/api/v1/myself',
      'headers': {'huntKey': bannedOwnerHuntKey}
    }, function (error, response, body) {
      if (error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(403);
        var bodyParsed = JSON.parse(body);
        bodyParsed.status.should.be.equal('Error');
        bodyParsed.errors.should.be.an.Array;
        bodyParsed.errors.length.should.be.equal(1);
        bodyParsed.errors.should.containEql(
          {
            'code': 403,
            'message': 'Access denied! You user account is banned!'
          });

        done();
      }
    });
  });
});