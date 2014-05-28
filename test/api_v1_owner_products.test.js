var request = require('request'),
  should = require('should'),
  port = process.env.PORT || 3000,
  testId = Math.floor(Math.random()*10000),
  ownerHuntKey,
  productId;

describe('/api/v1/owner/products test', function(){
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

  it('owner can create product', function(done){
    request({
      'method':'POST',
      'url':'http://localhost:'+port+'/api/v1/owner/products',
      'headers': { 'huntKey':ownerHuntKey },
      'form' : {
        'name': 'SuperMega'+testId,
        'bank': 'SuperMegaBank'+testId,
        'type': 'MasterCard',
        'ncRating': 'None',
        'bcRating': 'Bronze',
        'moRating': 'Silver',
        'reportsToExperian': false,
        'reportsToEquifax': false,
        'reportsToTransunion': false
      }
    }, function(error, response, body){
      if(error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(201);
        var bodyParsed = JSON.parse(body);
        bodyParsed.data.name.should.be.equal('SuperMega'+testId);
        bodyParsed.data.bank.should.be.equal('SuperMegaBank'+testId);
        bodyParsed.data.type.should.be.equal('MasterCard');
        bodyParsed.data.ncRating.should.be.equal('None');
        bodyParsed.data.bcRating.should.be.equal('Bronze');
        bodyParsed.data.moRating.should.be.equal('Silver');
        bodyParsed.data.reportsToExperian.should.be.false;
        bodyParsed.data.reportsToEquifax.should.be.false;
        bodyParsed.data.reportsToTransunion.should.be.false;
        productId = bodyParsed.data.id;
        done();
      }
    });
  });
  it('owner can list products');
  it('owner can list one product', function(done){
    request({
      'method':'GET',
      'url':'http://localhost:'+port+'/api/v1/owner/products/'+productId,
      'headers': { 'huntKey':ownerHuntKey }
    }, function(error, response, body){
      if(error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(200);
        var bodyParsed = JSON.parse(body);
        bodyParsed.data.id.should.be.equal(productId);
        bodyParsed.data.name.should.be.equal('SuperMega'+testId);
        bodyParsed.data.bank.should.be.equal('SuperMegaBank'+testId);
        bodyParsed.data.type.should.be.equal('MasterCard');
        bodyParsed.data.ncRating.should.be.equal('None');
        bodyParsed.data.bcRating.should.be.equal('Bronze');
        bodyParsed.data.moRating.should.be.equal('Silver');
        bodyParsed.data.reportsToExperian.should.be.false;
        bodyParsed.data.reportsToEquifax.should.be.false;
        bodyParsed.data.reportsToTransunion.should.be.false;
        done();
      }
    });
  });
  it('owner can update product');
  it('owner can delete product with now tradelines associated');
});