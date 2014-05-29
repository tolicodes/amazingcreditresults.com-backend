var request = require('request'),
  should = require('should'),
  port = process.env.PORT || 3000,
  testId = Math.floor(Math.random()*10000),
  ownerHuntKey,
  ownerId,
  productId,
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
        ownerId = bodyParsed.id;
        done();
      }
    });
  });

  it('owner can\'t create tradeline with non existant product', function(done){
    request({
      'method':'POST',
      'url':'http://localhost:'+port+'/api/v1/owner/tradelines',
      'headers': { 'huntKey':ownerHuntKey },
      'form': {
        'name':'TestTradeline'+testId,
        'product':'5366506291e1e82b0f4be503', //non existant, but valid id
        'seller': ownerId,
        'totalAus': 10,
        'usedAus': 5,
        'price':1100,
        'creditLimit':10000,
        'cashLimit':10000,
        'currentBalance':10000,
        'ncRating':'Silver',
        'bcRating':'Silver',
        'moRating':'Silver',
        'cost':1000,
        'notes':'Some notes'
      }
    }, function(error, response, body){
      if(error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(500);
        console.log(body);
        done();
      }
    });
  });

  it('owner can\'t create tradeline with non existant seller');

  it('owner can list tradelines');
  it('owner can list one tradeline');
  it('owner can update tradeline');
  it('owner can delete tradeline?');
});