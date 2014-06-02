var request = require('request'),
  should = require('should'),
  testId = Math.floor(Math.random() * 10000),
  port = process.env.PORT || 3000;

describe('Seller editing his/her tradelines', function () {
  var sellerId,
    productId,
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
      'form': {
        'name': 'TestTradeline' + testId,
        'product': '5366506291e1e82b0f4be503', //non existant, but valid id
        'seller': sellerId,
        'totalAus': 10,
        'usedAus': 5,
        'price': 1100,
        'creditLimit': 10000,
        'cashLimit': 10000,
        'currentBalance': 1000,
        'ncRating': 'Silver',
        'bcRating': 'Silver',
        'moRating': 'Silver',
        'cost': 1000,
        'notes': 'Some notes'
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

  describe('seller can create tradeline with existant product id', function () {
    before(function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/seller/products',
        'headers': {'huntKey': sellerHuntKey }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          var bodyParsed = JSON.parse(body);
          Array.isArray(bodyParsed.data).should.be.true;
          bodyParsed.data.map(function (product) {
            product.id.should.be.a.String;
            product.name.should.be.a.String;
            product.bank.should.be.a.String;
            product.type.should.be.a.String;

            [
              'MasterCard', 'Visa',
              'American Express', 'Discover'
            ].should.containEql(product.type);

            ['ncRating', 'bcRating', 'moRating'].map(function (r) {
              ['None', 'Bronze', 'Silver', 'Gold'].should.containEql(product[r])
            });
            product.reportsToExperian.should.be.a.Boolean;
            product.reportsToEquifax.should.be.a.Boolean;
            product.reportsToTransunion.should.be.a.Boolean;
            productId = product.id;
          });
          done()
        }
      });
    });
    it('works for POST response', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/seller/tradelines',
        'headers': {'huntKey': sellerHuntKey},
        'form': {
          'name': 'TestTradeline' + testId,
          'product': productId, //non existant, but valid id
          'seller': sellerId,
          'totalAus': 10,
          'usedAus': 5,
          'price': 1100,
          'creditLimit': 10000,
          'cashLimit': 10000,
          'currentBalance': 1000,
          'ncRating': 'Silver',
          'bcRating': 'Silver',
          'moRating': 'Silver',
          'cost': 1000,
          'notes': 'Some notes'
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(201);
          var bodyParsed = JSON.parse(body).data;
//          console.log(bodyParsed);
//          bodyParsed.product.should.be.equal(productId);
          bodyParsed.seller.should.be.equal(sellerId);
          bodyParsed.totalAus.should.be.equal(10);
          bodyParsed.usedAus.should.be.equal(5);
          bodyParsed.price.should.be.equal(1100);
          bodyParsed.creditLimit.should.be.equal(10000);
          bodyParsed.cashLimit.should.be.equal(10000);
          bodyParsed.currentBalance.should.be.equal(1000);
          bodyParsed.ncRating.should.be.equal('Silver');
          bodyParsed.bcRating.should.be.equal('Silver');
          bodyParsed.moRating.should.be.equal('Silver');
          bodyParsed.cost.should.be.equal(1000);
          bodyParsed.notes.should.be.equal('Some notes');
          tradelineId = bodyParsed.id;
          done();
        }
      });
    });

    it('returns proper data for GET one by id response', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/seller/tradelines/' + tradelineId,
        'headers': {'huntKey': sellerHuntKey}
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          var bodyParsed = JSON.parse(body).data;
          bodyParsed.product.id.should.be.equal(productId);
          bodyParsed.seller.should.be.equal(sellerId);
          bodyParsed.totalAus.should.be.equal(10);
          bodyParsed.usedAus.should.be.equal(5);
          bodyParsed.price.should.be.equal(1100);
          bodyParsed.creditLimit.should.be.equal(10000);
          bodyParsed.cashLimit.should.be.equal(10000);
          bodyParsed.currentBalance.should.be.equal(1000);
          bodyParsed.ncRating.should.be.equal('Silver');
          bodyParsed.bcRating.should.be.equal('Silver');
          bodyParsed.moRating.should.be.equal('Silver');
          bodyParsed.cost.should.be.equal(1000);
          bodyParsed.notes.should.be.equal('Some notes');
          done();
        }
      });
    });

    it('returns proper data for GET response', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/seller/tradelines',
        'headers': {'huntKey': sellerHuntKey}
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          var bodyParsed = JSON.parse(body);
          Array.isArray(bodyParsed.data).should.be.true;
          bodyParsed.data.length.should.be.above(0);
          bodyParsed.data.map(function (tradeline) {
            tradeline.id.should.be.a.String;
            tradeline.id.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
            tradeline.totalAus.should.be.below(16);
            tradeline.usedAus.should.be.below(16);
            tradeline.creditLimit.should.be.below(1000000);
//          tradeline.currentBalance.should.be.below(1000000);
            tradeline.cost.should.be.a.Number;
            tradeline.price.should.be.a.Number;
            tradeline.notes.should.be.a.String;
            tradeline.seller.should.be.a.String;
            tradeline.seller.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
            tradeline.seller.should.be.equal(sellerId);
            tradeline.dateOpen.should.be.a.Date;
            tradeline.product.id.should.be.a.String;
            tradeline.product.id.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
            ['ncRating', 'bcRating', 'moRating'].map(function (r) {
              ['None', 'Bronze', 'Silver', 'Gold'].should.containEql(tradeline[r])
            });
          });
          done();
        }
      });
    });

    it('seller can update one tradelines');

    it('seller can send to archive one tradeline');
  });
});