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
  it('owner can list products', function(done){
    request({
      'method':'GET',
      'url':'http://localhost:'+port+'/api/v1/owner/products',
      'headers': { 'huntKey':ownerHuntKey }
    }, function(error, response, body){
      if(error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(200);
        var bodyParsed = JSON.parse(body);
        Array.isArray(bodyParsed.data).should.be.true;
        bodyParsed.data.map(function(product){
          product.id.should.be.a.String;
          product.name.should.be.a.String;
          product.bank.should.be.a.String;
          product.type.should.be.a.String;

          [
            'MasterCard', 'Visa',
            'American Express', 'Discover'
          ].should.containEql(product.type);

          ['ncRating','bcRating','moRating'].map(function(r){
            ['None','Bronze', 'Silver', 'Gold'].should.containEql(product[r])
          });
          product.reportsToExperian.should.be.a.Boolean;
          product.reportsToEquifax.should.be.a.Boolean;
          product.reportsToTransunion.should.be.a.Boolean;
        });
        done();
      }
    });

  });
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

  it('owner can update product', function(done){
    request({
      'method':'PUT',
      'url':'http://localhost:'+port+'/api/v1/owner/products/'+productId,
      'headers': { 'huntKey':ownerHuntKey },
      'form' : {
        'name': '1SuperMega'+testId,
        'bank': '1SuperMegaBank'+testId,
        'type': 'Visa',
        'ncRating': 'Gold',
        'bcRating': 'Gold',
        'moRating': 'Gold',
        'reportsToExperian': true,
        'reportsToEquifax': true,
        'reportsToTransunion': true
      }
    }, function(error, response, body){
      if(error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(202);
        var bodyParsed = JSON.parse(body);
        bodyParsed.data.name.should.be.equal('1SuperMega'+testId);
        bodyParsed.data.bank.should.be.equal('1SuperMegaBank'+testId);
        bodyParsed.data.type.should.be.equal('Visa');
        bodyParsed.data.ncRating.should.be.equal('Gold');
        bodyParsed.data.bcRating.should.be.equal('Gold');
        bodyParsed.data.moRating.should.be.equal('Gold');
        bodyParsed.data.reportsToExperian.should.be.true;
        bodyParsed.data.reportsToEquifax.should.be.true;
        bodyParsed.data.reportsToTransunion.should.be.true;
        bodyParsed.data.id.should.be.equal(productId);

        request({
          'method':'GET',
          'url':'http://localhost:'+port+'/api/v1/owner/products/'+productId,
          'headers': { 'huntKey':ownerHuntKey }
          }, function(error1, response1, body){
            if(error1) {
              done(error1);
            } else {
              response1.statusCode.should.be.equal(200);
              var bodyParsed = JSON.parse(body);
              bodyParsed.data.name.should.be.equal('1SuperMega'+testId);
              bodyParsed.data.bank.should.be.equal('1SuperMegaBank'+testId);
              bodyParsed.data.type.should.be.equal('Visa');
              bodyParsed.data.ncRating.should.be.equal('Gold');
              bodyParsed.data.bcRating.should.be.equal('Gold');
              bodyParsed.data.moRating.should.be.equal('Gold');
              bodyParsed.data.reportsToExperian.should.be.true;
              bodyParsed.data.reportsToEquifax.should.be.true;
              bodyParsed.data.reportsToTransunion.should.be.true;
              bodyParsed.data.id.should.be.equal(productId);
              done();
            }
          }
        );
      }
    });

  });

  it('owner can delete product with no tradelines associated', function(done){
    request({
      'method':'DELETE',
      'url':'http://localhost:'+port+'/api/v1/owner/products/'+productId,
      'headers': { 'huntKey':ownerHuntKey }
    }, function(error, response, body){
      if(error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(202);
        var bodyParsed = JSON.parse(body);
        bodyParsed.status.should.be.equal('deleted');

        request({
          'method':'GET',
          'url':'http://localhost:'+port+'/api/v1/owner/products/'+productId,
          'headers': { 'huntKey':ownerHuntKey }
          }, function(error1, response1, body){
            if(error1) {
              done(error1);
            } else {
              response1.statusCode.should.be.equal(404);
              done();
            }
          }
        );
      }
    });
  });
});