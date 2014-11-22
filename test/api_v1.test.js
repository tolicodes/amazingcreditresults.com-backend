// Used to set MongoDB to amazing-test database
process.env.NODE_ENV = 'test';

var request = require('request'),
  url = require('url'),
  should = require('should'),
  fs = require('fs'),
  path = require('path'),
  backend = require('./../index.js'),
  helper = require('./test_helpers.js'),
  async = require('async'),
  _ = require('underscore'),
  port = 3001,
  testId = Math.floor(Math.random() * 10000),
  welcomeLink,
  ownerHuntKey,
  ownerHuntKey2,
  ownReq,
  buyerHuntKey,
  productId,
  userId,
  tradeLineId,
  sellerHuntKey,
  sellerId,
  huntKeys = [],
  bannedOwnerHuntKey = 'iaqtumioxrunxvyemsebsvcodytumioxrunxvyemsebsviaqcody',
  firstTradelineId,
  secondTradelineId,
  userInfo = {
    'email': 'unitTestUser' + testId + '@mail.ru',
    'name': {
      'givenName': 'John' + testId,
      'middleName': 'Teodor' + testId,
      'familyName': 'Doe' + testId,
      'title': 'Mr.',
      'suffix': 'III'
    },
    'street1' : '123 Street',
    'street2' : 'Apt 1',
    'phone' : '5551234567',
    'city': 'Brooklyn',
    'state': 'NY',
    'zip': '11201',
    'needQuestionnaire': true,
    'telefone': '555-339' + testId,
    'street1': 'Some Address',
  };
describe('init', function () {
  // ownerHuntKey used by many other tests
  function loginOwner(done) {
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
        ownerId = bodyParsed.id;
        ownReq = request.defaults({
          'headers': {'huntKey': ownerHuntKey},
          'json': true
        });
        done();
      }
    });
  }
  before(function (done) {
    backend.once('start', function (evnt) {
      if (evnt.type === 'webserver' || evnt.port === port) {
        backend.once('populated', function (evnt) {
          loginOwner(done);
        });
      } else {
        done(new Error('We are unable to start backend, sorry!'));
      }
    });
    backend.once('error', done);
    backend.startWebServer(port);
  });

  after(function (done) {
    backend.stop();
    helper.dropDB(function() {
      done();
    });
  });

  describe('Owner Client Management', function () {

    describe('Editing Clients', function() {


      beforeEach(function (done) {
        ownReq({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/admin/clients',
          'form': userInfo
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(201);
            userId = body.id;
            // Sanity check
            body.name.title.should.be.equal(userInfo.name.title);
            body.name.suffix.should.be.equal(userInfo.name.suffix);
            done();
          }
        });
      });

      afterEach(function(done) {
        ownReq({
          'method': 'DELETE',
          'url': 'http://localhost:' + port + '/api/v1/admin/clients/' + userId,
          'form': {}
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(202);
            done();
          }
        });
      });

      it('owner can modify user`s name', function (done) {
        // Modify user's info
        var modUser = helper.clone(userInfo);
        modUser.name.givenName = 'Jemima' + testId;
        modUser.name.middleName = 'Jackson' + testId;
        modUser.name.familyName = 'Koern' + testId;
        modUser.name.title = 'Ms.';
        modUser.name.suffix = 'Jr.';

        ownReq({
          'method': 'PUT',
          'url': 'http://localhost:' + port + '/api/v1/admin/clients/' + userId,
          'form': modUser,
        }, function (error, response, body) {
          response.statusCode.should.be.equal(202);
          body.name.givenName.should.be.equal(modUser.name.givenName);
          body.name.middleName.should.be.equal(modUser.name.middleName);
          body.name.familyName.should.be.equal(modUser.name.familyName);
          body.name.title.should.be.equal(modUser.name.title);
          body.name.suffix.should.be.equal(modUser.name.suffix);
          done();
        });
      });

      it('owner can modify user`s location', function (done) {
        // Modify user's info
        var modUser = helper.clone(userInfo);
        modUser.city = 'Orlando';
        modUser.state = 'Fl';
        modUser.zip = '13311';
        modUser.street1 = '456 Ave';
        modUser.street2 = 'Apt 4';
        // TODO can move this out later
        modUser.phone = '5550001111';

        ownReq({
          'method': 'PUT',
          'url': 'http://localhost:' + port + '/api/v1/admin/clients/' + userId,
          'form': modUser,
        }, function (error, response, body) {
          response.statusCode.should.be.equal(202);
          var modified = ['city', 'state', 'zip', 'street1', 'street2', 'phone'];
          modified.forEach(function(mod) {
            body[mod].should.be.equal(modUser[mod]);
          });
          done();
        });
      });

    });

    // Beware these tests are interdependent
    describe('Managing Buyer Account', function () {

      var userInfo = {
        'email': 'unitTestUser' + testId + '@mail.ru',
        'name': {
          'givenName': 'John' + testId,
          'middleName': 'Teodor' + testId,
          'familyName': 'Doe' + testId,
          'title': 'Mr.',
          'suffix': 'III'
        },
        'street1' : '123 Street',
        'street2' : 'Apt 1',
        'phone' : '5551234567',
        'city': 'Brooklyn',
        'state': 'NY',
        'zip': '11201',
        'needQuestionnaire': true,
        'telefone': '555-339' + testId,
        'street1': 'Some Address',
      };

      // Can't cleanup because other tests dependent on this
      before(function (done) {
        ownReq({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/admin/clients',
          'form': userInfo
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(201);
            userId = body.id;
            done();
          }
        });
      });

      it('creates user without verified account', function () {
        userId.should.be.a.String;
        userId.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
      });

      it('notifies this user by email message', function (done) {
        ownReq({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/admin/clients/welcome/' + userId,
          'form': { },
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(202);
            body.message.should.be.equal('sent');
            var params = url.parse(body.welcomeLink);
            ['http:', 'https:'].should.include(params.protocol);
            params.pathname.should.be.equal('/');
            params.hash.should.match(/^\#login\/[a-z]+$/);
            welcomeLink = (/^\#login\/([a-z]+)$/.exec(params.hash))[1];
            body.user.id.should.be.equal(userId);
            done();
          }
        });
      });

      it('can check if user needs to set password based on welcome link', function (done) {
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
      it('alerts unverified user if they try to log in with invalid password', function (done) {
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
            bodyParsed.errors[0].message.should.be.equal('Unable to authorize - wrong password!');
            done();
          }
        });
      });

      it('errors if trying to login with invalid welcome link', function (done) {
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
            bodyParsed.errors[0].message.should.be.equal('Unable to authorize - wrong welcome link!');
            done();
          }
        });
      });

      it('new user can set their password', function (done) {
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

      it('errors if try to set password without apiKey (welcome link)', function (done) {
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
            bodyParsed.errors[0].message.should.be.equal('Missed parameter - `apiKey`!');
            done();
          }
        });
      });

      it('errors if trying to set password with invalid welcome link', function (done) {
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
            bodyParsed.errors[0].message.should.be.equal('Wrong or outdated welcome link! Please, contact support for a new one!');
            done();
          }
        });
      });

      it('authorizes user if they log in with valid welcome link and password', function (done) {
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
            response.statusCode.should.be.equal(202);
            var bodyParsed = JSON.parse(body);
            bodyParsed.Code.should.be.equal(202);
            bodyParsed.Success.should.be.equal('Welcome!');
            bodyParsed.huntKey.should.be.a.String;
            buyerHuntKey = bodyParsed.huntKey;
            done();
          }
        });
      });

      it('can authorize new user via huntKey', function (done) {
        request({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/api/v1/myself',
          'headers': {'huntKey': buyerHuntKey},
          'json': true
        }, function (error, response, body) {
          response.statusCode.should.be.equal(200);
          body.id.should.be.equal(userId);
          done();
        });
      });

      it('no longer needs user to set password after they have done so', function (done) {
        request({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/api/v1/buyer/needToSetPassword/' + welcomeLink,
          'headers': { },
          'json': true
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(200);
            body.needToSetPassword.should.be.false;
            done();
          }
        });
      });

    });
  });

  // TODO Is this in scope? 
  xdescribe('Owner can upload CSV file with clients', function () {
    //todo - with clustering this test behaves strange
    var ownerHuntKey1;
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
          ownerHuntKey1 = bodyParsed.huntKey;
          done();
        }
      });
    });

    it('works', function (done) {

      var r = request({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/owner/bulkImport',
          'headers': {'huntKey': ownerHuntKey1}
        }, done
      );


      var form = r.form();
      //form.append('huntKey', ownerHuntKey);
      form.append('myCsv', fs.createReadStream(path.join(__dirname, 'clientsExample.csv')));

      r.once('finish', function () {
        // done(); //strange, do not works???
      });

    });
  });

  // Beware these tests are interdependent
  describe('Other Owners Managment', function () {
    it('can create new owner', function (done) {
      ownReq({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/admin/owners',
        'form': {
          'username': 'owner' + testId + '@example.org',
          'password': 'test123',
          name: {
              givenName: 'John',
              familyName: 'Doe',
              middleName: ''
          }
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(201);
          done();
        }
      });
    });

    it('can login as newly created owner', function (done) {
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
            bodyParsed.huntKey.should.be.a.String;
            ownerHuntKey2 = bodyParsed.huntKey;
            done();
          }
        });
    });

    it('has valid info for new owner', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/myself',
        'headers': {'huntKey': ownerHuntKey2},
        'json': true
      }, function (error, response, body) {
        response.statusCode.should.be.equal(200);
        body.id.should.be.a.String;
        body.id.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
        body.huntKey.should.be.equal(ownerHuntKey2);
        body.email.should.be.equal('owner' + testId + '@example.org');
        body.roles.owner.should.be.true;
        body.profile.should.be.an.Object;
        body.name.givenName.should.be.equal('John');
        body.name.familyName.should.be.equal('Doe');
        done();
      });
    });
  });

  describe('Owner Login', function () {
    it('returns 200 && `huntKey` for correct password via application/x-www-form-urlencoded', function (done) {
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
          huntKeys.push(bodyParsed.huntKey);
          done();
        }
      });
    });

    it('returns 200 && `huntKey` for correct password via application/json', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/owner/login',
        'json': {
          'username': 'owner@example.org',
          'password': 'test123'
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          var bodyParsed = body;
          bodyParsed.Code.should.be.equal(200);
          bodyParsed.huntKey.should.be.a.String;
          huntKeys.push(bodyParsed.huntKey);
          done();
        }
      });
    });

    it('returned valid huntKeys', function () {
      Array.isArray(huntKeys).should.be.true;
      huntKeys.length.should.be.equal(2);
      huntKeys[0].should.be.equal(huntKeys[1]);
    });

    it('returns 403 && message for wrong password', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/owner/login',
        'json': {
          'username': 'owner@example.org',
          'password': 'someWrongPassword'
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(403);
          var bodyParsed = body;
          bodyParsed.status.should.be.equal('Error');
          bodyParsed.errors[0].code.should.be.equal(403);
          bodyParsed.errors[0].message.should.be.equal('Invalid username or password. Please try again using correct username and password.');
          should.not.exist(bodyParsed.huntKey);
          done();
        }
      });
    });

    it('returns 400 && message for absent username or password', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/owner/login',
        'json': {
          'notAusername': 'owner@example.org',
          'notAPassword': 'someWrongPassword'
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(400);
          var bodyParsed = body;
          Array.isArray(bodyParsed.errors).should.be.true;
          bodyParsed.errors.should.containEql(
            {
              'code': 400,
              'message': 'Username is not provided!',
              'field': 'username'
            });

          bodyParsed.errors.should.containEql(
            {
              'code': 400,
              'message': 'Password is not provided!',
              'field': 'password'
            });

          should.not.exist(bodyParsed.huntKey);
          done();
        }
      });
    });
  });

  function testingCallback(error, response, body, done) {
    if (error) {
      done(error);
    } else {
      response.statusCode.should.be.equal(200);
      var bodyParsed = JSON.parse(body);
      bodyParsed.id.should.be.a.String;
      bodyParsed.id.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
      bodyParsed.huntKey.should.be.equal(huntKeys[0]);
      bodyParsed.email.should.be.a.equal('owner@example.org');
      bodyParsed.roles.owner.should.be.true;
      bodyParsed.profile.should.be.an.Object;
//    bodyParsed.profile.needQuestionnaire.should.exist;
      bodyParsed.gravatar.should.be.a.equal('https://secure.gravatar.com/avatar/b5fca0fa34000c908d46313ed1d737e0.jpg?s=80&d=wavatar&r=g');
      bodyParsed.gravatar30.should.be.a.equal('https://secure.gravatar.com/avatar/b5fca0fa34000c908d46313ed1d737e0.jpg?s=30&d=wavatar&r=g');
      bodyParsed.gravatar50.should.be.a.equal('https://secure.gravatar.com/avatar/b5fca0fa34000c908d46313ed1d737e0.jpg?s=50&d=wavatar&r=g');
      bodyParsed.gravatar80.should.be.a.equal('https://secure.gravatar.com/avatar/b5fca0fa34000c908d46313ed1d737e0.jpg?s=80&d=wavatar&r=g');
      bodyParsed.gravatar100.should.be.a.equal('https://secure.gravatar.com/avatar/b5fca0fa34000c908d46313ed1d737e0.jpg?s=100&d=wavatar&r=g');
      done();
    }
  }

  describe('/api/v1/myself works for owner', function () {

    describe('Using huntKey as query parameter', function () {
      it('works with `huntKey` as `GET` parameter', function (done) {
        request({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/api/v1/myself?huntKey=' + huntKeys[0]
        }, function (error, response, body) {
          testingCallback(error, response, body, done);
        });
      });
    });

    describe('Using huntKey as form field', function () {
      it('works with `huntKey` as `POST` form parameter', function (done) {
        request({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/auth/myself',
          'form': {'huntKey': huntKeys[0]}
        }, function (error, response, body) {
          testingCallback(error, response, body, done);
        });
      });

      it('works with `huntKey` as `PUT` form parameter', function (done) {
        request({
          'method': 'PUT',
          'url': 'http://localhost:' + port + '/auth/myself',
          'form': {'huntKey': huntKeys[0]}
        }, function (error, response, body) {
          testingCallback(error, response, body, done);
        });
      });

      it('works with `huntKey` as `DELETE` form parameter', function (done) {
        request({
          'method': 'DELETE',
          'url': 'http://localhost:' + port + '/auth/myself',
          'form': {'huntKey': huntKeys[0]}
        }, function (error, response, body) {
          testingCallback(error, response, body, done);
        });
      });
    });

    describe('Using huntKey as header', function () {
      it('works with `huntKey` as custom header for GET response', function (done) {
        request({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/auth/myself',
          'headers': {'huntKey': huntKeys[0]}
        }, function (error, response, body) {
          testingCallback(error, response, body, done);
        });
      });

      it('works with `huntKey` as custom header for POST response', function (done) {
        request({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/auth/myself',
          'headers': {'huntKey': huntKeys[0]}
        }, function (error, response, body) {
          testingCallback(error, response, body, done);
        });
      });

      it('works with `huntKey` as custom header for PUT response', function (done) {
        request({
          'method': 'PUT',
          'url': 'http://localhost:' + port + '/auth/myself',
          'headers': {'huntKey': huntKeys[0]}
        }, function (error, response, body) {
          testingCallback(error, response, body, done);
        });
      });

      it('works with `huntKey` as custom header for DELETE response', function (done) {
        request({
          'method': 'DELETE',
          'url': 'http://localhost:' + port + '/auth/myself',
          'headers': {'huntKey': huntKeys[0]}
        }, function (error, response, body) {
          testingCallback(error, response, body, done);
        });
      });
    });
  });

  describe('Owner Product Management', function () {
    // Create a test product 
    beforeEach(function (done) {
      ownReq({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/owner/products',
        'form': {
          'name': 'SuperMega' + testId,
          'bank': 'SuperMegaBank' + testId,
          'type': 'MasterCard',
          'ncRating': 'None',
          'bcRating': 'Bronze',
          'moRating': 'Silver',
          'reportsToExperian': false,
          'reportsToEquifax': false,
          'reportsToTransunion': false
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(201);
          productId = body.id;
          done();
        }
      });
    });

    // Reset the products
    afterEach(function(done) {
      helper.dropCollection('products', function() {
        done();
      });
    });

    it('can create new product', function (done) {
      ownReq({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/owner/products',
        'form': {
          'name': 'SuperMega' + testId,
          'bank': 'SuperMegaBank' + testId,
          'type': 'MasterCard',
          'ncRating': 'None',
          'bcRating': 'Bronze',
          'moRating': 'Silver',
          'reportsToExperian': false,
          'reportsToEquifax': true,
          'reportsToTransunion': false
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(201);
          body.name.should.be.equal('SuperMega' + testId);
          body.bank.should.be.equal('SuperMegaBank' + testId);
          body.type.should.be.equal('MasterCard');
          body.ncRating.should.be.equal('None');
          body.bcRating.should.be.equal('Bronze');
          body.moRating.should.be.equal('Silver');
          body.reportsToExperian.should.be.false;
          body.reportsToEquifax.should.be.true;
          body.reportsToTransunion.should.be.false;
          done();
        }
      });
    });

    it('can list products', function (done) {
      ownReq({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/owner/products',
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          Array.isArray(body.data).should.be.true;
          body.data.map(function (product) {
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
          });
          done();
        }
      });

    });

    it('can list one product', function (done) {
      ownReq({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/owner/products/' + productId,
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          //console.log(body);
          body.id.should.be.equal(productId);
          body.name.should.be.equal('SuperMega' + testId);
          body.bank.should.be.equal('SuperMegaBank' + testId);
          body.type.should.be.equal('MasterCard');
          done();
        }
      });
    });

    it('can update product', function (done) {
      ownReq({
        'method': 'PUT',
        'url': 'http://localhost:' + port + '/api/v1/owner/products/' + productId,
        'form': {
          'name': '1SuperMega' + testId,
          'bank': '1SuperMegaBank' + testId,
          'type': 'Visa',
          'ncRating': 'Gold',
          'bcRating': 'Gold',
          'moRating': 'Gold',
          'reportsToExperian': true,
          'reportsToEquifax': true,
          'reportsToTransunion': true
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(202);
          body.name.should.be.equal('1SuperMega' + testId);
          body.bank.should.be.equal('1SuperMegaBank' + testId);
          body.type.should.be.equal('Visa');
          body.ncRating.should.be.equal('Gold');
          body.bcRating.should.be.equal('Gold');
          body.moRating.should.be.equal('Gold');
          body.reportsToExperian.should.be.true;
          body.reportsToEquifax.should.be.true;
          body.reportsToTransunion.should.be.true;
          body.id.should.be.equal(productId);

          ownReq({
              'method': 'GET',
              'url': 'http://localhost:' + port + '/api/v1/owner/products/' + productId,
            }, function (error1, response1, body) {
              if (error1) {
                done(error1);
              } else {
                response1.statusCode.should.be.equal(200);
                body.name.should.be.equal('1SuperMega' + testId);
                body.bank.should.be.equal('1SuperMegaBank' + testId);
                body.type.should.be.equal('Visa');
                body.ncRating.should.be.equal('Gold');
                body.bcRating.should.be.equal('Gold');
                body.moRating.should.be.equal('Gold');
                body.reportsToExperian.should.be.true;
                body.reportsToEquifax.should.be.true;
                body.reportsToTransunion.should.be.true;
                body.id.should.be.equal(productId);
                done();
              }
            }
          );
        }
      });

    });

    describe('Deletion', function() {
      // Login, create product, create tradeline
      before(function (done) {
        async.series([
          // Create a product & get productId
          function(callback) {
            ownReq({
              'method': 'POST',
              'url': 'http://localhost:' + port + '/api/v1/owner/products',
              'form': {
                'name': 'SuperMega' + testId,
                'bank': 'SuperMegaBank' + testId,
                'type': 'MasterCard',
                'ncRating': 'None',
                'bcRating': 'Bronze',
                'moRating': 'Silver',
                'reportsToExperian': false,
                'reportsToEquifax': false,
                'reportsToTransunion': false
              }
            }, function (error, response, body) {
              if (error) {
                done(error);
              } else {
                response.statusCode.should.be.equal(201);
                body.name.should.be.equal('SuperMega' + testId);
                body.bank.should.be.equal('SuperMegaBank' + testId);
                body.type.should.be.equal('MasterCard');
                productId = body.id;
                callback();
              }
            });
          },
          // Create a tradeline, get tradelineId
          function() {
            ownReq({
              'method': 'POST',
              'url': 'http://localhost:' + port + '/api/v1/owner/tradelines',
              'form': {
                'product': productId,
                'seller': ownerId,
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
                tradeLineId = body.id;
                done();
              }
            });              
          }]);
      });

      it('can delete product with no tradelines associated', function (done) {
        ownReq({
          'method': 'DELETE',
          'url': 'http://localhost:' + port + '/api/v1/owner/products/' + productId,
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(202);
            body.status.should.be.equal('deleted');

            ownReq({
                'method': 'GET',
                'url': 'http://localhost:' + port + '/api/v1/owner/products/' + productId,
              }, function (error1, response1, body) {
                if (error1) {
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

      it('cannot delete product with tradelines associated', function (done) {
        ownReq({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines',
          'form': {
            'product': productId,
            'seller': ownerId,
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
           ownReq({
              'method': 'DELETE',
              'url': 'http://localhost:' + port + '/api/v1/owner/products/' + productId,
           }, function (error, response, body) {
              if (error) {
                done(error);
              } else {
                response.statusCode.should.be.equal(400);
                body.status.should.be.equal('Error');
                body.errors[0].message.should.be.equal('Product with this ID is used by Tradelines!');
                done();
              }
           });
         }
        });
      });
    });

  });

  describe('Owner Tradeline Management', function () {
    // Login, create product, create tradeline
    before(function (done) {
      async.series([
        // Create a product & get productId
        function(callback) {
          ownReq({
            'method': 'POST',
            'url': 'http://localhost:' + port + '/api/v1/owner/products',
            'form': {
              'name': 'SuperMega' + testId,
              'bank': 'SuperMegaBank' + testId,
              'type': 'MasterCard',
              'ncRating': 'None',
              'bcRating': 'Bronze',
              'moRating': 'Silver',
              'reportsToExperian': false,
              'reportsToEquifax': false,
              'reportsToTransunion': false
            }
          }, function (error, response, body) {
            if (error) {
              done(error);
            } else {
              response.statusCode.should.be.equal(201);
              body.name.should.be.equal('SuperMega' + testId);
              body.bank.should.be.equal('SuperMegaBank' + testId);
              body.type.should.be.equal('MasterCard');
              productId = body.id;
              callback();
            }
          });
        },
        // Create a tradeline, get tradelineId
        function() {
          ownReq({
            'method': 'POST',
            'url': 'http://localhost:' + port + '/api/v1/owner/tradelines',
            'form': {
              'product': productId,
              'seller': ownerId,
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
              tradeLineId = body.id;
              done();
            }
          });              
        }]);
    });

    it('cannot create tradeline with invalid product', function (done) {
      ownReq({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/owner/tradelines',
        'form': {
          'name': 'TestTradeline' + testId,
          'product': '5366506291e1e82b0f4be503', //non existant, but valid id
          'seller': ownerId,
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
        //console.log(response);
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(400);
          body.status.should.be.equal('Error');
          body.errors.should.be.an.Array;
          body.errors.length.should.be.equal(1);
          body.errors[0].message.should.be.equal('Unable to find corresponding Product!');
          body.errors[0].field.should.be.equal('product');
          body.errors[0].value.should.be.equal('5366506291e1e82b0f4be503');
          done();
        }
      });
    });
    
    it('owner cannot create tradeline with invalid seller', function (done) {
      ownReq({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/owner/tradelines',
        'form': {
          'name': 'TestTradeline' + testId,
          'product': productId,
          'seller': '5366506291e1e82b0f4be503', //non existant, but valid id
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
          body.status.should.be.equal('Error');
          body.errors.should.be.an.Array;
          body.errors.length.should.be.equal(1);
          body.errors[0].message.should.be.equal('Unable to find corresponding Seller among the Users!');
          body.errors[0].field.should.be.equal('seller');
          body.errors[0].value.should.be.equal('5366506291e1e82b0f4be503');
          done();
        }
      });
    });

    it('can create tradeline with valid product and seller', function (done) {
      ownReq({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/owner/tradelines',
        'form': {
          'product': productId,
          'seller': ownerId,
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
          tradeLineId = body.id;
          done();
        }
      });
    });

    it('can list tradelines', function (done) {
      ownReq({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/owner/tradelines',
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          Array.isArray(body.data).should.be.true;
          body.data.length.should.be.above(1);
          body.data.map(function (tradeline) {
            tradeline.id.should.be.a.String;
            tradeline.id.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
            tradeline.totalAus.should.be.below(16);
            if (tradeline.usedAus) {
              tradeline.usedAus.should.be.below(16);
            }
            if (tradeline.creditLimit) {
              tradeline.creditLimit.should.be.below(1000000);
            }
            if (tradeline.currentBalance) {
              tradeline.currentBalance.should.be.below(1000000);
            }
            tradeline.cost.should.be.a.Number;
            tradeline.price.should.be.a.Number;
            tradeline.notes.should.be.a.String;
            tradeline.seller.should.be.a.String;
            tradeline.seller.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
            tradeline.dateOpen.should.be.a.Date;
            // TODO investigate why this works when test run in isolation but 
            // not when all tests are run - turns productId to null for some tradelines
            //tradeline.product.id.should.be.a.String;
            //tradeline.product.id.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
            ['ncRating', 'bcRating', 'moRating'].map(function (r) {
              ['None', 'Bronze', 'Silver', 'Gold'].should.containEql(tradeline[r])
            });
          });
          done()
        }
      });

    });
    it('owner can list one tradeline', function (done) {
      ownReq({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradeLineId,
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          body.id.should.be.equal(tradeLineId);
          body.product.id.should.be.equal(productId);
          body.seller.should.be.equal(ownerId);
          body.totalAus.should.be.equal(10);
          body.usedAus.should.be.equal(5);
          body.price.should.be.equal(1100);
          body.creditLimit.should.be.equal(10000);
          body.cashLimit.should.be.equal(10000);
          body.currentBalance.should.be.equal(1000);
          body.ncRating.should.be.equal('Silver');
          body.bcRating.should.be.equal('Silver');
          body.moRating.should.be.equal('Silver');
          body.cost.should.be.equal(1000);
          body.notes.should.be.equal('Some notes');
          done();
        }
      });
    });

    it('owner can update tradeline', function (done) {
      ownReq({
        'method': 'PUT',
        'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradeLineId,
        'form': {
          'product': productId,
          'seller': ownerId,
          'totalAus': 11,
          'usedAus': 6,
          'price': 1099,
          'creditLimit': 9999,
          'cashLimit': 9999,
          'currentBalance': 9999,
          'ncRating': 'None',
          'bcRating': 'Bronze',
          'moRating': 'Gold',
          'cost': 999,
          'notes': 'Some notes111'
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(202);
          body.product.should.be.equal(productId);
          body.seller.should.be.equal(ownerId);
          body.totalAus.should.be.equal(11);
          body.usedAus.should.be.equal(6);
          body.price.should.be.equal(1099);
          body.creditLimit.should.be.equal(9999);
          body.cashLimit.should.be.equal(9999);
          body.currentBalance.should.be.equal(9999);
          body.ncRating.should.be.equal('None');
          body.bcRating.should.be.equal('Bronze');
          body.moRating.should.be.equal('Gold');
          body.cost.should.be.equal(999);
          body.notes.should.be.equal('Some notes111');

          ownReq({
            'method': 'GET',
            'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradeLineId,
          }, function (error, response, body) {
            if (error) {
              done(error);
            } else {
              response.statusCode.should.be.equal(200);
              body.totalAus.should.be.equal(11);
              body.usedAus.should.be.equal(6);
              body.price.should.be.equal(1099);
              body.creditLimit.should.be.equal(9999);
              body.cashLimit.should.be.equal(9999);
              body.currentBalance.should.be.equal(9999);
              body.ncRating.should.be.equal('None');
              body.bcRating.should.be.equal('Bronze');
              body.moRating.should.be.equal('Gold');
              body.cost.should.be.equal(999);
              body.notes.should.be.equal('Some notes111');
              done();
            }
          });
        }
      });
    });

    /*
     * TODO? Toly says no longer needed
    describe('Tradeline Change Approval', function(done) {
      it('can approve tradeline');
      it('can deny tradeline');
    });
    */

    describe('Archiving', function(done) {
      it('owner can archive active tradeline', function (done) {
        helpers.tradelines.archive(ownerHuntKey, tradeLineId,
        function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(202);
            body.status.should.be.equal('Tradeline archived');

            helpers.tradelines.get(ownerHuntKey, tradeLineId,
            function (err, response1, body1) {
              if (err) {
                done(err);
              } else {
                response1.statusCode.should.be.equal(200);
                body1.id.should.be.equal(tradeLineId);
                body1.active.should.be.false;
                done();
              }
            });
          }
        });
      });

      it('owner cannot archive invalid tradeline', function(done) {
        var invalidId = '547006878128698dbc0e2151'; // valid MongoId, but not in the DB
        helpers.tradelines.archive(ownerHuntKey, invalidId,
        function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(404);
            body.status.should.be.equal('Error');
            body.errors[0].message.should.be.equal('Tradeline not found');
            done();
          }
        });

      });
    });
  });

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
          response.statusCode.should.be.equal(202);
          var bodyParsed = JSON.parse(body);
          bodyParsed.Code.should.be.equal(202);
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

    xit('seller cannot create tradeline with nonexistant product id', function (done) {
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
              productId = product.id;
            });
              
              // TODO FIX
              //[
              //  'MasterCard', 'Visa',
              //  'American Express', 'Discover'
              //].should.containEql(product.type);

            // TODO FIX
              //['ncRating', 'bcRating', 'moRating'].map(function (r) {
              //  ['None', 'Bronze', 'Silver', 'Gold'].should.containEql(product[r])
              //});

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
                  tradeLineId = bodyParsed.id;
                  done();
                }
              });

          }
        });
      });
      xit('works for POST response', function (done) {
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
            var bodyParsed = JSON.parse(body);
            //console.log(body);
            bodyParsed.data.product.id.should.be.equal(productId);
            //bodyParsed.data.seller.should.be.equal(sellerId);
            bodyParsed.data.totalAus.should.be.equal(10);
            //bodyParsed.data.usedAus.should.be.equal(5);
            bodyParsed.data.price.should.be.equal(1100);
            bodyParsed.data.creditLimit.should.be.equal(10000);
            //bodyParsed.data.cashLimit.should.be.equal(10000);
            //bodyParsed.data.currentBalance.should.be.equal(1000);
            //bodyParsed.data.ncRating.should.be.equal('Silver');
            //bodyParsed.data.bcRating.should.be.equal('Silver');
            //bodyParsed.data.moRating.should.be.equal('Silver');
            bodyParsed.data.cost.should.be.equal(1000);
            should.not.exist(bodyParsed.data.notes);
            bodyParsed.changes.should.be.an.Array;
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
//              tradeline.totalAus.should.be.below(16);
//              tradeline.usedAus.should.be.below(16);
//              tradeline.creditLimit.should.be.below(1000000);
//          tradeline.currentBalance.should.be.below(1000000);
              tradeline.cost.should.be.a.Number;
              tradeline.price.should.be.a.Number;
              should.not.exist(tradeline.notes);
              tradeline.seller.should.be.a.String;
              tradeline.seller.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
              //tradeline.seller.should.be.equal(sellerId);
              tradeline.dateOpen.should.be.a.Date;
              //tradeline.product.id.should.be.a.String;
              //tradeline.product.id.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
              //['ncRating', 'bcRating', 'moRating'].map(function (r) {
              //  ['None', 'Bronze', 'Silver', 'Gold'].should.containEql(tradeline[r])
              //});
            });
            done();
          }
        });
      });

      xit('seller can update tradeline', function (done) {
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

            request({
              'method': 'GET',
              'url': 'http://localhost:' + port + '/api/v1/seller/tradelines/' + tradeLineId,
              'headers': {'huntKey': sellerHuntKey}
            }, function (error, response, body) {
              if (error) {
                done(error);
              } else {
                response.statusCode.should.be.equal(200);
                var bodyParsed = JSON.parse(body);
//              console.log(bodyParsed);
                bodyParsed.data.product.id.should.be.equal(productId);
                bodyParsed.data.seller.should.be.equal(sellerId);
                bodyParsed.data.totalAus.should.be.equal(10);
                bodyParsed.data.usedAus.should.be.equal(5);
                bodyParsed.data.price.should.be.equal(1100);
                bodyParsed.data.creditLimit.should.be.equal(10000);
                bodyParsed.data.cashLimit.should.be.equal(10000);
                bodyParsed.data.currentBalance.should.be.equal(1000);
                bodyParsed.data.ncRating.should.be.equal('Silver');
                bodyParsed.data.bcRating.should.be.equal('Silver');
                bodyParsed.data.moRating.should.be.equal('Silver');
                bodyParsed.data.cost.should.be.equal(1000);
                should.not.exist(bodyParsed.data.notes);
                bodyParsed.changes.should.be.an.Array;
                var changes = bodyParsed.changes[0];
                changes.totalAus.should.be.equal(11);
                changes.usedAus.should.be.equal(6);
                changes.price.should.be.equal(1099);
                changes.creditLimit.should.be.equal(9999);
                changes.cashLimit.should.be.equal(9999);
                changes.currentBalance.should.be.equal(9999);
                changes.ncRating.should.be.equal('None');
                changes.bcRating.should.be.equal('Bronze');
                changes.moRating.should.be.equal('Gold');
                changes.cost.should.be.equal(999);
                changes.status.should.be.equal('pending');
                changes.issuer.should.be.equal(bodyParsed.data.seller);
                done();
              }
            });
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
            //console.log(bodyParsed);
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

  describe('Using huntKey as header for BANNED owner', function () {
    it('alerts user their account has been deactivated', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/myself',
        'headers': {'huntKey': bannedOwnerHuntKey}
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(403);
          var bodyParsed = JSON.parse(body);
          bodyParsed.status.should.be.equal('Error');
          bodyParsed.errors.should.be.an.Array;
          bodyParsed.errors.length.should.be.equal(1);
          bodyParsed.errors.should.containEql(
            {
              'code': 403,
              'message': 'Access denied! your account has been deactivated!'
            });

          done();
        }
      });
    });
  });

  describe('Owner Seller Management', function () {
    it('can create new seller', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/admin/clients',
        'headers': {'huntKey': ownerHuntKey},
        'form': {
          'email': 'unitTestSeller' + testId + '@mail.ru',
          'name': {
            'givenName': 'John' + testId,
            'middleName': 'Teodor' + testId,
            'familyName': 'Doe' + testId,
            'title': 'Mr.'
          },
          'needQuestionnaire': true,
          'phone': '555-339' + testId,
          'street1': 'Some Address',
          'roles': {
            'seller': true,
            'buyer': false
          }
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(201);
          var bodyParsed = JSON.parse(body);
          bodyParsed.id.should.be.a.String;
          bodyParsed.id.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);

          sellerId = bodyParsed.id;

          bodyParsed.email.should.be.equal('unitTestSeller' + testId + '@mail.ru');
          bodyParsed.name.givenName.should.be.equal('John' + testId);
          bodyParsed.name.middleName.should.be.equal('Teodor' + testId);
          bodyParsed.name.familyName.should.be.equal('Doe' + testId);
          bodyParsed.name.title.should.be.equal('Mr.');
          bodyParsed.phone.should.be.equal('555-339' + testId);
          bodyParsed.street1.should.be.equal('Some Address');
          bodyParsed.email.should.be.equal('unitTestSeller' + testId + '@mail.ru');
          bodyParsed.root.should.be.a.false;
          bodyParsed.roles.seller.should.be.true;
          bodyParsed.roles.buyer.should.be.false;
          sellerHuntKey = bodyParsed.huntKey;
//and we can get this client
          request({
            'method': 'GET',
            'url': 'http://localhost:' + port + '/api/v1/admin/clients/' + sellerId,
            'headers': {'huntKey': ownerHuntKey}
          }, function (error, response, body1) {
            if (error) {
              done(error);
            } else {
              response.statusCode.should.be.equal(200);
              var bodyParsed1 = JSON.parse(body1);
              bodyParsed1.data.id.should.be.equal(sellerId);
              done();
            }
          });
        }
      });
    });

    /*
    describe('seller do things', function () {
      xit('seller logins', function (done) {
        request({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/api/v1/myself',
          'headers': {'huntKey': sellerHuntKey}
        }, function (error, response, body) {
          response.statusCode.should.be.equal(200);
          var bodyParsed = JSON.parse(body);
          bodyParsed.id.should.be.equal(sellerId);
          done();
        });
      });
      it('seller creates tradeline1');
      it('seller updates tradeline1');
      it('seller creates tradeline2');
      it('seller updates tradeline2');

    });
    */
  });

  describe('Buyer Cart Management', function () {
      var cartBuyerHuntKey;
      // Login the buyer
      before(function(done) {
        request({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/buyer/login',
          'headers': { },
          'form': {
            // Strangely, the api key isn't actually the api key field, it's the 
            // welcome link field
            // The api key field in the DB is actually the huntKey
            'apiKey': 'a84e44544afb66dedba5a',
            'password': 'test123'
          },
          'json': true
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(202);
            body.Code.should.be.equal(202);
            body.Success.should.be.equal('Welcome!');
            body.huntKey.should.be.a.String;
            cartBuyerHuntKey = body.huntKey;
            done();
          }
        });
      });

      afterEach(function(done) {
        helper.resetBuyer(function() {
          done();
        });
      });

      describe('adding tradelines', function () {
        it('can add a tradeline to a cart', function (done) {
          async.waterfall([
            function (cb) {
              helpers.tradelines.list(cartBuyerHuntKey, function (error, response, body) {
                body.data.should.be.instanceof(Array);
                body.data.length.should.be.above(0);
                cb(error, body.data[0]);
              });
            },
            function (tradeline, cb) {
              helpers.cart.addTradeline(cartBuyerHuntKey, tradeline.id, function (error, response, body) {
                body.status.should.be.equal('Ok');
                response.statusCode.should.be.equal(202);
                cb(error, response);
              });
            }
          ], function (error, response) {
            if (error) {
              done(error);
            }
            response.statusCode.should.be.equal(202);
            done();
          });
        });

        it("cannot add the same tradeline twice", function (done) {
          async.waterfall([
            function (cb) {
              helpers.tradelines.list(cartBuyerHuntKey, function (error, response, body) {
                cb(error, body.data[0]);
              });
            },
            function (tradeline, cb) {
              helpers.cart.addTradeline(cartBuyerHuntKey, tradeline.id, function (error) {
                cb(error, tradeline);
              });
            },
            function (tradeline, cb) {
              helpers.cart.addTradeline(cartBuyerHuntKey, tradeline.id, function (error) {
                cb(error, tradeline);
              });
            },
            function (tradeline, cb) {
              helpers.cart.addTradeline(cartBuyerHuntKey, tradeline.id, function (error) {
                cb(error);
              });
            },
            function (cb) {
              helpers.cart.getTradelines(cartBuyerHuntKey, function (error, response, body) {
                cb(error, body);
              });
            }
          ], function (error, body) {
            body.data.length.should.be.equal(1);
            done(error)
          });
        });

        it("fails if tradeline id not provided", function (done) {
          helpers.cart.addTradeline(cartBuyerHuntKey, null, function (error, response) {
            response.statusCode.should.be.equal(400);
            done(error);
          });
        });
      });

      describe("list tradelines", function () {
        it('should be able to list tradelines', function (done) {
          async.waterfall([
            function (cb) {
              helpers.tradelines.list(cartBuyerHuntKey, function (error, response, body) {
                cb(error, body.data[0]);
              });
            },
            function (tradeline, cb) {
              helpers.cart.addTradeline(cartBuyerHuntKey, tradeline.id, function (error) {
                cb(error);
              });
            },
            function (cb) {
              helpers.cart.getTradelines(cartBuyerHuntKey, function (error, response, body) {
                response.statusCode.should.be.equal(200);
                cb(error, body);
              });
            }
          ], function (error, body) {
            body.data.should.be.an.Array;
            body.itemsInCart.should.be.an.Integer;
            body.data.length.should.be.equal(1);
            done(error)
          });
        });
      });

      describe("removing a tradeline from the cart", function () {
        it("can remove a tradeline", function (done) {
          async.waterfall([
            function (cb) {
              helpers.tradelines.list(cartBuyerHuntKey, function (error, response, body) {
                var tradeline = body.data[0];
                cb(error, tradeline);
              });
            },
            function (tradeline, cb) {
              helpers.cart.addTradeline(cartBuyerHuntKey, tradeline.id, function (error) {
                cb(error, tradeline);
              });
            },
            function (tradeline, cb) {
              helpers.cart.getTradelines(cartBuyerHuntKey, function (error, respoonse, body) {
                body.data.length.should.be.equal(1);
                cb(error, tradeline);
              });
            },
            function (tradeline, cb) {
              helpers.cart.deleteTradeline(cartBuyerHuntKey, tradeline.id, function (error, response) {
                response.statusCode.should.be.equal(202);
                cb(error);
              });
            },
            function (cb) {
              helpers.cart.getTradelines(cartBuyerHuntKey, function (error, response, body) {
                cb(error, body);
              });
            }
          ], function (error, body) {
            body.data.length.should.be.equal(0);
            done(error);
          });
        });
      });

      // TODO write more tests for this
      describe('checkout', function () {
        it('should work', function(done){
          request({
            'method': 'POST',
            'url': 'http://localhost:' + port + '/api/v1/cart/checkout',
            'headers': {'huntKey': cartBuyerHuntKey},
            'json': true
          }, function (error, response, body) {
            if(error) {
              done(error);
            } else {
              response.statusCode.should.be.equal(201);
              body.status.should.be.equal('Ok');
              body.transactionId.should.be.a.String;
              var newTransactionId = body.transactionId;
              request({
                'method': 'GET',
                'url': 'http://localhost:' + port + '/api/v1/account',
                'headers': {'huntKey': cartBuyerHuntKey},
                'json': true
              }, function(error, response, body){
                //console.log(body);
                  if(error) {
                    done(error);
                  } else {
                    response.statusCode.should.be.equal(200);
                    var transactionFound1 = false;
                    body.data.transactions.map(function(tr){
                      if (tr.id == newTransactionId) {
                        transactionFound1 = true
                      }
                    });
                    transactionFound1.should.be.true;
                    done();
                  }
              });

            }
          });
        });
      });
  });

  describe('Issue balance adjustment for buyer', function () {
    // Can't cleanup because other tests dependent on this
    before(function (done) {
      ownReq({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/admin/clients',
        'form': userInfo,
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(201);
          userId = body.id;
          done();
        }
      });
    });

    it('Owner can increase buyer funds', function (done) {
      ownReq({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/admin/clients/balance/' + userId,
        'form': {'amount': 1, 'notes': 'Merry Christmas, fuck you!', date: '2014-05-03', paidBy: 'Credit Card'},
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(202);
          body.status.should.be.equal('Ok');
          done();
        }
      });
    });

    it('Owner can check that he uploaded the funds', function (done) {
      ownReq({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/admin/clients/' + userId,
        'form': {'amount': 1, 'notes': 'Merry Christmas, fuck you!'},
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          body.transactions.should.be.an.Array;
          body.transactions.length.should.be.above(0);
          var transactionFound = false;
          body.transactions.map(function (t) {
            if (t.amount == 1 && t.type == 'ownerUpload' && t.date == 'Sat May 03 2014' && t.paidBy == 'Credit Card') {
              transactionFound = true;
            }
          });
          transactionFound.should.be.true;
          done();
        }
      });
    });
  });

  describe('Seller creates two tradelines and made revisions for them, and Owner rejects first one, and approves second one', function () {
    var tradelineId1,
      tradelineId2,
      productId,
      sellerHuntKey;

    before(function (done) {
//getting huntKey for seller of Grace Doe
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/buyer/login',
        'json': true,
        'form': {
          'apiKey': 'a4544afb66dedba584e4a',
          'password': 'test123'
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(202);
          response.body.Success.should.be.equal('Welcome!');
          sellerHuntKey = body.huntKey;
          done();
        }
      });
    });


    describe('preparing...', function () {
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

      it('seller can see the list of products avaible', function (done) {
        request({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/api/v1/seller/products',
          'headers': {'huntKey': sellerHuntKey}
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(200);
            var bodyParsed = JSON.parse(body);
            bodyParsed.data.should.be.an.Array;
            productId = bodyParsed.data[0].id;
            done();
          }
        });
      });

      it('Seller creates 2 tradelines', function (done) {
        async.parallel({
          'tr1': function (cb) {
            request({
              'method': 'POST',
              'url': 'http://localhost:' + port + '/api/v1/seller/tradelines',
              'json': true,
              'body': {
                'totalAus': 15,
                'creditLimit': 0,
                'cashLimit': 0,
                'balance': 100,
                'cost': 1000,
                'price': 1100,
                'product': productId,
                'ncRating': 'None',
                'bcRating': 'Bronze',
                'moRating': 'Silver'
              },
              'headers': {'huntKey': sellerHuntKey}
            }, function (error, response, body) {
              if (error) {
                cb(error);
              } else {
                response.statusCode.should.be.equal(201);
                tradelineId1 = body.data.id;
                cb(null);
              }
            });
          },
          'tr2': function (cb) {
            request({
              'method': 'POST',
              'url': 'http://localhost:' + port + '/api/v1/seller/tradelines',
              'json': true,
              'body': {
                'totalAus': 15,
                'creditLimit': 0,
                'cashLimit': 0,
                'balance': 100,
                'cost': 1000,
                'price': 1200,
                'product': productId,
                'ncRating': 'None',
                'bcRating': 'Bronze',
                'moRating': 'Silver'
              },
              'headers': {'huntKey': sellerHuntKey}
            }, function (error, response, body) {
              if (error) {
                cb(error);
              } else {
                response.statusCode.should.be.equal(201);
                tradelineId2 = body.data.id;
                cb(null);
              }
            });
          }
        }, function (error, obj) {
          done(error);
        });
      });

      it('Seller creates new revisions for each of tradelines', function (done) {
        async.parallel({
          'tr1': function (cb) {
            request({
              'method': 'PUT',
              'url': 'http://localhost:' + port + '/api/v1/seller/tradelines/' + tradelineId1,
              'json': true,
              'body': {
                'totalAus': 14,
                'cost': 1000,
                'price': 1100,
                'product': productId,
                'moRating': 'Gold'
              },
              'headers': {'huntKey': sellerHuntKey}
            }, function (error, response, body) {
              if (error) {
                cb(error);
              } else {
                response.statusCode.should.be.equal(202);
                cb(null);
              }
            });
          },
          'tr2': function (cb) {
            request({
              'method': 'PUT',
              'url': 'http://localhost:' + port + '/api/v1/seller/tradelines/' + tradelineId2,
              'json': true,
              'body': {
                'totalAus': 14,
                'cost': 1000,
                'price': 1100,
                'product': productId,
                'moRating': 'Gold'
              },
              'headers': {'huntKey': sellerHuntKey}
            }, function (error, response, body) {
              if (error) {
                cb(error);
              } else {
                response.statusCode.should.be.equal(202);
                cb(null);
              }
            });
          }
        }, function (error, obj) {
          done(error);
        });

      });
    });
    xdescribe('Owner rejects first tradeline', function () {
      var changesId;
      //'owner can see current tradeline revision amont this tradeline revisions',
      before(function (done) {
        ownReq({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradelineId1,
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(200);
            body.data.id.should.be.equal(tradelineId1);
            body.changes.should.be.an.Array;
            body.changes.length.should.be.equal(1);
            var c = body.changes[0];
            c.issuer.id.should.be.equal(body.data.seller.id);
            c.moRating.should.be.equal('Gold');
            changesId = c.id;
            done();
          }
        });
      });
      it('owner can reject first tradeline changes', function (done) {
        ownReq({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradelineId1 + '/changeset/' + changesId + '/deny',
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            //response.statusCode.should.be.equal(200);
            //console.log(body);
            body.status.should.be.equal('deny');
            done()
          }
        });
      });
      //'owner actually rejects first tradeline changes'
      after(function (done) {
        ownReq({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradelineId1,
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(200);
            body.data.id.should.be.equal(tradelineId1);
            body.data.moRating.should.be.equal('Silver');
            body.changes.should.be.an.Array;
            body.changes.length.should.be.equal(1);
            var c = body.changes[0];
            c.issuer.id.should.be.equal(body.data.seller.id);
            c.moRating.should.be.equal('Gold');
            changesId = c.id;
            done();
          }
        });
      });
    });

    xdescribe('Owner accepts second tradeline', function () {
      var changesId;
      //'owner can see current tradeline revision amont this tradeline revisions',
      before(function (done) {
        ownReq({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradelineId2,
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(200);
            body.data.id.should.be.equal(tradelineId2);
            body.changes.should.be.an.Array;
            body.changes.length.should.be.equal(1);
            var c = body.changes[0];
            c.issuer.id.should.be.equal(body.data.seller.id);
            c.moRating.should.be.equal('Gold');
            changesId = c.id;
            done();
          }
        });
      });

      it('Owner can accept second tradeline changes', function (done) {
        ownReq({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradelineId2 + '/changeset/' + changesId + '/approve',
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(200);
            body.status.should.be.equal('approve');
            done()
          }
        });
      });
//'owner actually accepts second tradeline changes',
      after(function (done) {
        ownReq({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradelineId2,
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(200);
            body.data.id.should.be.equal(tradelineId2);
            body.data.moRating.should.be.equal('Gold');
            body.changes.should.be.an.Array;
            body.changes.length.should.be.equal(1);
            var c = body.changes[0];
            c.issuer.id.should.be.equal(body.data.seller.id);
            c.moRating.should.be.equal('Gold');
            changesId = c.id;
            done();
          }
        });
      });
    });
  });


  describe('Owner editing clients', function () {
    it('can delete a client', function (done) {
      async.waterfall([
        function (cb) {
          helpers.clients.list(ownerHuntKey, function (error, response, body) {
            cb(error, findWithRole('buyer', body))
          });
        },
        function (buyer, cb) {
          helpers.clients.del(ownerHuntKey, buyer.id, function (error, response) {
            response.statusCode.should.be.equal(202);
            cb(error, buyer);
          });
        },
        function (buyer, cb) {
          helpers.clients.get(ownerHuntKey, buyer.id, function (error, response, body) {
            var buyer = body.data;
            cb(error, buyer);
          });
        }
      ], function (error, buyer) {
        buyer.isBanned.should.be.true;
        done(error);
      });
    });

    it("can't delete an owner", function (done) {
      async.waterfall([
        function (cb) {
          helpers.clients.list(ownerHuntKey, function (error, response, body) {
            cb(error, findWithRole('owner', body))
          });
        },
        function (buyer, cb) {
          helpers.clients.del(ownerHuntKey, buyer.id, function (error, response) {
            cb(error, response);
          });
        }
      ], function (error, response) {
        response.statusCode.should.be.equal(400);
        done(error);
      });
    });

    function findWithRole(role, body) {
      return _.find(body.data, function (user) {
        return user.roles[role];
      });
    }
  });

});


var helpers = {
  clients: {
    list: function (huntKey, cb) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/admin/clients',
        'headers': {'huntKey': huntKey},
        json: true
      }, cb);
    },

    get: function (huntKey, id, cb) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/admin/clients/' + id,
        'headers': {'huntKey': huntKey},
        json: true
      }, cb);
    },

    del: function (huntKey, id, cb) {
      request({
        'method': 'DELETE',
        'url': 'http://localhost:' + port + '/api/v1/admin/clients/' + id,
        'headers': {'huntKey': huntKey},
        json: true
      }, cb);
    }
  },
  tradelines: {
    list: function (huntKey, cb) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/tradelines',
        'headers': {'huntKey': huntKey},
        json: true
      }, cb);
    },

    archive: function (huntKey, id, cb) {
      request({
          'method': 'DELETE',
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + id,
          'headers': { 'huntKey': huntKey },
          'json': true
        }, cb);
    },

    get: function (huntKey, id, cb) {
      request({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + id,
          'headers': { 'huntKey': huntKey },
          'json': true
        }, cb);
    }
  },
  cart: {
    addTradeline: function (huntKey, id, cb) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/cart/tradelines',
        'headers': {'huntKey': huntKey},
        form: {id: id},
        json: true
      }, cb);
    },

    deleteTradeline: function (huntKey, id, cb) {
      request({
        'method': 'DELETE',
        'url': 'http://localhost:' + port + '/api/v1/cart/tradelines/' + id,
        'headers': {'huntKey': huntKey},
        json: true
      }, cb);
    },

    getTradelines: function (huntKey, cb) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/cart/tradelines',
        'headers': {'huntKey': huntKey},
        json: true
      }, cb);
    }
  }
};
