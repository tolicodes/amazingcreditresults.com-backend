var request = require('request'),
  should = require('should'),
  port = process.env.PORT || 3000,
  ownerHuntKey,
  tradeLineId;

describe('/api/v1/owner/tradelines test', function(){
  before(function(done){
    request({
      'method':'POST',
      'url':'http://localhost:'+port+'/api/v1/owner/login',
      'form' : {
        'username':'owner@example.org',
        'password':'test123'
      }
    }, function(error, response, body){
      if(error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(200);
        var bodyParsed = JSON.parse(body);
        bodyParsed.Code.should.be.equal(200);
        bodyParsed.huntKey.should.be.a.String;
        ownerHuntKey=bodyParsed.huntKey;
        done();
      }
    });
  });

  it('owner can create tradeline');
  it('owner can list tradelines');
  it('owner can list one tradeline');
  it('owner can update tradeline');
  it('owner can delete tradeline?');
});