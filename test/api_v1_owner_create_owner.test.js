var request = require('request'),
  should = require('should'),
  port = process.env.PORT || 3000,
  testId = Math.floor(Math.random() * 10000),
  ownerHuntKey1,
  ownerHuntKey2;

describe('Owners can create other owner', function () {
  it('performs Owners login', function (done) {
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
        ownerHuntKey1 = bodyParsed.huntKey;
        done();
      }
    });
  });

  it('returns correct response for POST /api/v1/admin/createOwner', function (done) {
    request({
      'method': 'POST',
      'url': 'http://localhost:' + port + '/api/v1/admin/createOwner',
      'headers': {'huntKey': ownerHuntKey1},
      'form': {
        'username': 'owner' + testId + '@example.org',
        'password': 'test123'
      }
    }, function (error, response, body) {
      if (error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(201);
        var bodyParsed = JSON.parse(body);
        done();
      }
    });
  });

  it('performs Owners login on behalf of newly created owner', function (done) {
    request({
      'method': 'POST',
      'url': 'http://localhost:' + port + '/api/v1/owner/login',
      'form': {
        'username': 'owner' + testId + '@example.org',
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
        ownerHuntKey2 = bodyParsed.huntKey;
        done();
      }
    });
  });

  it('created realy created new Owner', function (done) {
    request({
      'method': 'GET',
      'url': 'http://localhost:' + port + '/api/v1/myself',
      'headers': {'huntKey': ownerHuntKey2}
    }, function (error, response, body) {
      response.statusCode.should.be.equal(200);
      var bodyParsed = JSON.parse(body);
      bodyParsed.id.should.be.a.String;
      bodyParsed.id.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
      bodyParsed.huntKey.should.be.equal(ownerHuntKey2);
      bodyParsed.email.should.be.a.equal('owner' + testId + '@example.org');
      bodyParsed.roles.owner.should.be.true;
      bodyParsed.profile.should.be.an.Object;
      done();
    });
  });

});