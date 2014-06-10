var request = require('request'),
  should = require('should'),
  testId = Math.floor(Math.random() * 10000),
  port = process.env.PORT || 3000;

describe('Seller editing his/her tradelines', function () {
  var sellerId,
    productId,
    sellerHuntKey,
    tradeLineId;

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
          'cost': 1000
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
          tradeLineId = bodyParsed.id;
          done();
        }
      });
    });

    it('returns proper data for GET one by id response', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/seller/tradelines/' + tradeLineId,
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
          should.not.exist(bodyParsed.notes);
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
            should.not.exist(tradeline.notes);
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

    it('seller can update tradeline', function (done) {
      request({
        'method': 'PUT',
        'url': 'http://localhost:' + port + '/api/v1/seller/tradelines/' + tradeLineId,
        'headers': { 'huntKey': sellerHuntKey },
        'form': {
          'product': productId,
          'totalAus': 11,
          'usedAus': 6,
          'price': 1099,
          'creditLimit': 9999,
          'cashLimit': 9999,
          'currentBalance': 9999,
          'ncRating': 'None',
          'bcRating': 'Bronze',
          'moRating': 'Gold',
          'cost': 999
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(202);
          var bodyParsed = JSON.parse(body);
//        bodyParsed.data.product.should.be.equal(productId);
//        bodyParsed.data.seller.should.be.equal(ownerId);
          bodyParsed.data.totalAus.should.be.equal(11);
          bodyParsed.data.usedAus.should.be.equal(6);
          bodyParsed.data.price.should.be.equal(1099);
          bodyParsed.data.creditLimit.should.be.equal(9999);
          bodyParsed.data.cashLimit.should.be.equal(9999);
          bodyParsed.data.currentBalance.should.be.equal(9999);
          bodyParsed.data.ncRating.should.be.equal('None');
          bodyParsed.data.bcRating.should.be.equal('Bronze');
          bodyParsed.data.moRating.should.be.equal('Gold');
          bodyParsed.data.cost.should.be.equal(999);
          done();
        }
      });
    });


    it('seller can delete (set `active` to false) tradeline', function (done) {
      request({
        'method': 'DELETE',
        'url': 'http://localhost:' + port + '/api/v1/seller/tradelines/' + tradeLineId,
        'headers': { 'huntKey': sellerHuntKey }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(202);
          var bodyParsed = JSON.parse(body);
          bodyParsed.status.should.be.equal('Tradeline archived');

          request({
            'method': 'GET',
            'url': 'http://localhost:' + port + '/api/v1/seller/tradelines/' + tradeLineId,
            'headers': { 'huntKey': sellerHuntKey }
          }, function (err, response1, body1) {
            if (err) {
              done(error);
            } else {
              response1.statusCode.should.be.equal(200);
              var bodyParsed = JSON.parse(body1);
              bodyParsed.data.id.should.be.equal(tradeLineId);
              bodyParsed.data.active.should.be.false;
              done();
            }
          });
        }
      });
    });
  });
});