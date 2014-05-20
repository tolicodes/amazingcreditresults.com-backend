var request = require('request'),
  should = require('should'),
  port = process.env.PORT || 3000,
  ownerHuntKey,
  userIdwithVerifiedAccount,
  userIdwithouitVerifiedAccount;

describe('Unit test for user authorization by welcome link', function() {
  it('allows owner to authorize at first', function (done) {
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

  it('creates user without verified account');
  it('notifies this user by email message');

  it('creates user with verified account');
  it('notifies this user by email message');

});