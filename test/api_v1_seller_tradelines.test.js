var request = require('request'),
  should = require('should'),
  sellerWelcomeLink = 'a4544afb66dedba584e4a', // do not change!
  port = process.env.PORT || 3000;

//dev seller has unchangable `huntKey`, restored on every backend start


describe('Seller editing his/her tradelines', function () {
  var sellerId,
    sellerHuntKey,
    tradelineId;

  before(function(done){
    request({
      'method': 'POST',
      'url': 'http://localhost:' + port + '/api/v1/buyer/login',
      'form': {
        'apiKey': 'a4544afb66dedba584e4a',
        'password': 'test123'
      }
    }, function (error, response, body) {
      if (error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(201);
        var bodyParsed = JSON.parse(body);
        bodyParsed.Code.should.be.equal(201);
        bodyParsed.huntKey.should.be.a.String;
        sellerHuntKey = bodyParsed.huntKey;
        done();
      }
    });
  });


  it('seller is able to access /api/v1/myself at first to see, if it has proper huntKey', function(done){
    request({
      'method': 'GET',
      'url': 'http://localhost:' + port + '/api/v1/myself',
      'headers': {'huntKey': sellerHuntKey}
    }, function (error, response, body) {
      if(error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(200);
        var bodyParsed = JSON.parse(body);
        bodyParsed.huntKey.should.be.equal(sellerHuntKey);
        bodyParsed.roles.seller.should.be.true;
        done();
      }
    });
  });

  it('seller can create one tradeline');

  it('seller can list all his/her tradelines');

  it('seller can get one tradeline');

  it('seller can update one tradelines');

  it('seller can send to archive one tradeline');

});