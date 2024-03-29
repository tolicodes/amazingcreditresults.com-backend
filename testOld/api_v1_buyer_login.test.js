var request = require('request'),
  url = require('url'),
  should = require('should'),
  port = process.env.PORT || 3000,
  testId = Math.floor(Math.random() * 10000),
  ownerHuntKey,
  buyerHuntKey,
  userId;

describe('Unit test for user authorization by welcome link', function () {
  before(function (done) {
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

  describe('owner is creating user without verified account, that we will use for tests', function () {
    before(function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/admin/clients',
        'headers': {'huntKey': ownerHuntKey},
        'form': {
          'email': 'unitTestUser' + testId + '@mail.ru',
          'name': {
            'givenName': 'John' + testId,
            'middleName': 'Teodor' + testId,
            'familyName': 'Doe' + testId
          },
          'needQuestionnaire': true,
          'telefone': '555-339' + testId,
          'street1': 'Some Address',
          'title': 'Mr.'
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          var bodyParsed = JSON.parse(body);
          console.log(bodyParsed);
          response.statusCode.should.be.equal(201);
          userId = bodyParsed.id;
          done();
        }
      });
    });

    it('creates user without verified account', function () {
      userId.should.be.a.String;
      userId.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
    });

    it('notifies this user by email message', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/admin/clients/welcome/' + userId,
        'form': { },
        'headers': {'huntKey': ownerHuntKey}
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(202);
          var bodyParsed = JSON.parse(body);
          bodyParsed.message.should.be.equal('sent');
          var params = url.parse(bodyParsed.welcomeLink);
          ['http:', 'https:'].should.include(params.protocol);
          params.pathname.should.be.equal('/');
          params.hash.should.match(/^\#login\/[a-z]+$/);
          welcomeLink = (/^\#login\/([a-z]+)$/.exec(params.hash))[1];
          bodyParsed.user.id.should.be.equal(userId);
          done();
        }
      });
    });

    it('makes this user to have correct response on /api/v1/api/v1/buyer/needToSetPassword/:welcomeLink', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/buyer/needToSetPassword/' + welcomeLink,
        'headers': { }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          var bodyParsed = JSON.parse(body);
          bodyParsed.needToSetPassword.should.be.true;
          done();
        }
      });
    });
//https://oselot.atlassian.net/browse/ACR-174
    it('makes this user to have the correct response for failing to login via /api/v1/buyer/login', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/buyer/login',
        'headers': { },
        'form': {
          'apiKey': welcomeLink,
          'password': 'fiflesAndFufles'
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(403);
          var bodyParsed = JSON.parse(body);
          done();
        }
      });
    });

    it('makes this user to have the correct response for failing to login via /api/v1/buyer/login', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/buyer/login',
        'headers': { },
        'form': {
          'apiKey': 'thisIsSomeStupidWelcomeLink1111',
          'password': 'fiflesAndFufles'
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(403);
          var bodyParsed = JSON.parse(body);
          done();
        }
      });
    });


    it('makes this user to have the correct response for setting password via /api/v1/buyer/setPassword', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/buyer/setPassword',
        'headers': { },
        'form': {
          'apiKey': welcomeLink,
          'password': 'fiflesAndFufles'
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(201);
          var bodyParsed = JSON.parse(body);
          bodyParsed.Code.should.be.equal(201);
          bodyParsed.Success.should.be.equal('Password is set!');
          done();
        }
      });
    });

    it('makes this user to have the correct response for failing to set password via /api/v1/buyer/setPassword', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/buyer/setPassword',
        'headers': { },
        'form': {
          'notApiKey': welcomeLink,
          'password': 'fiflesAndFufles'
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(400);
          var bodyParsed = JSON.parse(body);
          done();
        }
      });
    });

    it('makes this user to have the correct response for failing to set password via /api/v1/buyer/setPassword', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/buyer/setPassword',
        'headers': { },
        'form': {
          'apiKey': 'thisIsSomeStupidWelcomeLink1111',
          'password': 'fiflesAndFufles'
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(400);
          var bodyParsed = JSON.parse(body);
          done();
        }
      });
    });


    it('makes this user to have correct response for authorizing via /api/v1/buyer/login', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/buyer/login',
        'headers': { },
        'form': {
          'apiKey': welcomeLink,
          'password': 'fiflesAndFufles'
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(201);
          var bodyParsed = JSON.parse(body);
          bodyParsed.Code.should.be.equal(201);
          bodyParsed.Success.should.be.equal('Welcome!');
          bodyParsed.huntKey.should.be.a.String;
          buyerHuntKey = bodyParsed.huntKey;
          done();
        }
      });
    });

    it('actually authorizes user via header based sessions', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/myself',
        'headers': {'huntKey': buyerHuntKey}
      }, function (error, response, body) {
        response.statusCode.should.be.equal(200);
        var bodyParsed = JSON.parse(body);
        bodyParsed.id.should.be.equal(userId);
        done();
      });
    });

    it('makes this user to have correct response on /api/v1/api/v1/buyer/needToSetPassword/:welcomeLink', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/buyer/needToSetPassword/' + welcomeLink,
        'headers': { }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          var bodyParsed = JSON.parse(body);
          bodyParsed.needToSetPassword.should.be.false;
          done();
        }
      });
    });

  });
});