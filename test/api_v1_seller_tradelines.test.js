var request = require('request'),
  should = require('should'),
  testId = Math.floor(Math.random()*10000),
  port = process.env.PORT || 3000;

//dev seller has unchangable `huntKey`, restored on every backend start


describe('Seller editing his/her tradelines', function () {
  var sellerId,
    sellerHuntKey,
    tradelineId;

  before(function (done) {
    request({
      'method': 'POST',
      'url': 'http://localhost:' + port + '/api/v1/buyer/login',
      'form': {
        'apiKey': 'a4544afb66dedba584e4a', // do not change!
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


  it('seller is able to access /api/v1/myself at first to see, if it has proper huntKey', function (done) {
    request({
      'method': 'GET',
      'url': 'http://localhost:' + port + '/api/v1/myself',
      'headers': {'huntKey': sellerHuntKey}
    }, function (error, response, body) {
      if (error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(200);
        var bodyParsed = JSON.parse(body);
        bodyParsed.huntKey.should.be.equal(sellerHuntKey);
        bodyParsed.roles.seller.should.be.true;
        sellerId = bodyParsed.id;
        done();
      }
    });
  });

  it('seller cannot create tradeline with nonexistant product id', function (done) {
    request({
      'method': 'POST',
      'url': 'http://localhost:' + port + '/api/v1/seller/tradelines',
      'headers': {'huntKey': sellerHuntKey},
      'form':{
        'name':'TestTradeline'+testId,
        'product':'5366506291e1e82b0f4be503', //non existant, but valid id
        'seller': sellerId,
        'totalAus': 10,
        'usedAus': 5,
        'price': 1100,
        'creditLimit': 10000,
        'cashLimit': 10000,
        'currentBalance': 1000,
        'ncRating':'Silver',
        'bcRating':'Silver',
        'moRating':'Silver',
        'cost':1000,
        'notes':'Some notes'
      }
    }, function (error, response, body) {
      if (error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(400);
        var bodyParsed = JSON.parse(body);
        bodyParsed.status.should.be.equal('Error');
        bodyParsed.errors.should.be.an.Array;
        bodyParsed.errors.length.should.be.equal(1);
        bodyParsed.errors[0].code.should.be.equal(400);
        bodyParsed.errors[0].message.should.be.equal('Unable to find corresponding Product!');
        bodyParsed.errors[0].field.should.be.equal('product');
        bodyParsed.errors[0].value.should.be.equal('5366506291e1e82b0f4be503');
        done();
      }
    });
  });

  it('seller can create tradeline with existant product id');

  it('seller can list all his/her tradelines');

  it('seller can get one tradeline');

  it('seller can update one tradelines');

  it('seller can send to archive one tradeline');

});