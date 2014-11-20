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
  buyerHuntKey,
  productId,
  userId,
  tradeLineId,
  sellerHuntKey,
  sellerId,
  huntKeys = [],
  bannedOwnerHuntKey = 'iaqtumioxrunxvyemsebsvcodytumioxrunxvyemsebsviaqcody',
  firstTradelineId,
  secondTradelineId;

describe('init', function () {
  before(function (done) {
    backend.once('start', function (evnt) {
      if (evnt.type === 'webserver' || evnt.port === port) {
        done(null);
      } else {
        done(new Error('We are unable to start backend, sorry!'));
      }
    });
    backend.once('error', done);
    backend.startWebServer(port);
  });

  after(function (done) {
    backend.stop();
    done();
  });

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
      var userInfo = {
        'email': 'unitTestUser' + testId + '@mail.ru',
        'name': {
          'givenName': 'John' + testId,
          'middleName': 'Teodor' + testId,
          'familyName': 'Doe' + testId,
        },
        'title': 'Mr.',
        'suffix' : 'III',
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

      // TODO reset userInfo after each test
      before(function (done) {
        request({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/admin/clients',
          'headers': {'huntKey': ownerHuntKey},
          'form': userInfo
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            var bodyParsed = JSON.parse(body);
            //console.log('Created User: ');
            //console.log(bodyParsed);
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

      it('can modify user`s name', function (done) {
        // Modify user's info
        var modUser = helper.clone(userInfo);
        modUser.name.givenName = 'Jemima' + testId;
        modUser.name.middleName = 'Jackson' + testId;
        modUser.name.familyName = 'Koern' + testId;
        modUser.title = 'Ms.';
        modUser.suffix = 'Jr.';

        request({
          'method': 'PUT',
          'url': 'http://localhost:' + port + '/api/v1/admin/clients/' + userId,
          'form': modUser,
          'headers': {'huntKey': ownerHuntKey}
        }, function (error, response, body) {
          response.statusCode.should.be.equal(202);
          var bodyParsed = JSON.parse(body);
          console.log('return from PUT:');
          console.log(bodyParsed.name.title);
          bodyParsed.name.givenName.should.be.equal(modUser.name.givenName);
          bodyParsed.name.middleName.should.be.equal(modUser.name.middleName);
          bodyParsed.name.familyName.should.be.equal(modUser.name.familyName);
          bodyParsed.name.title.should.be.equal(modUser.title);
          bodyParsed.name.suffix.should.be.equal(modUser.suffix);
          done();
        });
      });

      it('can modify user`s location', function (done) {
        // Modify user's info
        var modUser = helper.clone(userInfo);
        modUser.city = 'Orlando';
        modUser.state = 'Fl';
        modUser.zip = '13311';
        modUser.street1 = '456 Ave';
        modUser.street2 = 'Apt 4';
        // TODO can move this out later
        modUser.phone = '5550001111';

        request({
          'method': 'PUT',
          'url': 'http://localhost:' + port + '/api/v1/admin/clients/' + userId,
          'form': modUser,
          'headers': {'huntKey': ownerHuntKey}
        }, function (error, response, body) {
          response.statusCode.should.be.equal(202);
          var bodyParsed = JSON.parse(body);
          var modified = ['city', 'state', 'zip', 'street1', 'street2', 'phone'];
          modified.forEach(function(mod) {
            bodyParsed[mod].should.be.equal(modUser[mod]);
          });

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

  describe('Owner can upload CSV file with clients', function () {
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

    it('returns correct response for POST /api/v1/admin/owners', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/admin/owners',
        'headers': {'huntKey': ownerHuntKey1},
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
          var bodyParsed = JSON.parse(body);
          done();
        }
      });
    });

    xit('performs Owners login on behalf of newly created owner', function (done) {
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

    xit('really created new Owner', function (done) {
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

  describe('/api/v1/owner/login API endpoint test', function () {
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

    it('returned the good huntKeys', function () {
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

  xdescribe('/api/v1/owner/products test', function () {
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
          request({
            'method': 'POST',
            'url': 'http://localhost:' + port + '/api/v1/owner/products',
            'headers': { 'huntKey': ownerHuntKey },
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
              var bodyParsed = JSON.parse(body);
              productId = bodyParsed.id;
              done();
            }
          });
        }
      });
    });

    // xit this to stop the main crash
    it('owner can create product', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/owner/products',
        'headers': { 'huntKey': ownerHuntKey },
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
          var bodyParsed = JSON.parse(body);
          bodyParsed.data.name.should.be.equal('SuperMega' + testId);
          bodyParsed.data.bank.should.be.equal('SuperMegaBank' + testId);
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
    it('owner can list products', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/owner/products',
        'headers': { 'huntKey': ownerHuntKey }
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
          });
          done();
        }
      });

    });

    it('owner can list one product', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/owner/products/' + productId,
        'headers': { 'huntKey': ownerHuntKey }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          //console.log(body);
          var bodyParsed = JSON.parse(body);
          bodyParsed.id.should.be.equal(productId);
          bodyParsed.name.should.be.equal('SuperMega' + testId);
          bodyParsed.bank.should.be.equal('SuperMegaBank' + testId);
          bodyParsed.type.should.be.equal('MasterCard');
          done();
        }
      });
    });

    xit('owner can update product', function (done) {
      request({
        'method': 'PUT',
        'url': 'http://localhost:' + port + '/api/v1/owner/products/' + productId,
        'headers': { 'huntKey': ownerHuntKey },
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
          var bodyParsed = JSON.parse(body);
          bodyParsed.data.name.should.be.equal('1SuperMega' + testId);
          bodyParsed.data.bank.should.be.equal('1SuperMegaBank' + testId);
          bodyParsed.data.type.should.be.equal('Visa');
          bodyParsed.data.ncRating.should.be.equal('Gold');
          bodyParsed.data.bcRating.should.be.equal('Gold');
          bodyParsed.data.moRating.should.be.equal('Gold');
          bodyParsed.data.reportsToExperian.should.be.true;
          bodyParsed.data.reportsToEquifax.should.be.true;
          bodyParsed.data.reportsToTransunion.should.be.true;
          bodyParsed.data.id.should.be.equal(productId);

          request({
              'method': 'GET',
              'url': 'http://localhost:' + port + '/api/v1/owner/products/' + productId,
              'headers': { 'huntKey': ownerHuntKey }
            }, function (error1, response1, body) {
              if (error1) {
                done(error1);
              } else {
                response1.statusCode.should.be.equal(200);
                var bodyParsed = JSON.parse(body);
                bodyParsed.data.name.should.be.equal('1SuperMega' + testId);
                bodyParsed.data.bank.should.be.equal('1SuperMegaBank' + testId);
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

    it('owner can delete product with no tradelines associated', function (done) {
      request({
        'method': 'DELETE',
        'url': 'http://localhost:' + port + '/api/v1/owner/products/' + productId,
        'headers': { 'huntKey': ownerHuntKey }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(202);
          var bodyParsed = JSON.parse(body);
          bodyParsed.status.should.be.equal('deleted');

          request({
              'method': 'GET',
              'url': 'http://localhost:' + port + '/api/v1/owner/products/' + productId,
              'headers': { 'huntKey': ownerHuntKey }
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
  });

  describe('/api/v1/owner/tradelines test', function () {
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
          ownerId = bodyParsed.id;

          request({
            'method': 'POST',
            'url': 'http://localhost:' + port + '/api/v1/owner/products',
            'headers': { 'huntKey': ownerHuntKey },
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
              var bodyParsed = JSON.parse(body);
              //console.log('-------------------------------------------------------------');
              //console.log(bodyParsed);
              bodyParsed.name.should.be.equal('SuperMega' + testId);
              bodyParsed.bank.should.be.equal('SuperMegaBank' + testId);
              bodyParsed.type.should.be.equal('MasterCard');
              // TODO FIX
              //bodyParsed.data.ncRating.should.be.equal('None');
              //bodyParsed.data.bcRating.should.be.equal('Bronze');
              //bodyParsed.data.moRating.should.be.equal('Silver');
              //bodyParsed.data.reportsToExperian.should.be.false;
              //bodyParsed.data.reportsToEquifax.should.be.false;
              //bodyParsed.data.reportsToTransunion.should.be.false;
              productId = bodyParsed.id;
              request({
                'method': 'POST',
                'url': 'http://localhost:' + port + '/api/v1/owner/tradelines',
                'headers': { 'huntKey': ownerHuntKey },
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
                  var bodyParsed = JSON.parse(body);
                  //console.log(bodyParsed);
                  tradeLineId = bodyParsed.id;
                  done();
                }
              });              
            }
          });
        }
      });
    });
//*/
    xit('owner can\'t create tradeline with non existant product', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/owner/tradelines',
        'headers': { 'huntKey': ownerHuntKey },
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
//*/
//*/
    xit('owner can\'t create tradeline with non existant seller', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/owner/tradelines',
        'headers': { 'huntKey': ownerHuntKey },
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
          var bodyParsed = JSON.parse(body);
          bodyParsed.status.should.be.equal('Error');
          bodyParsed.errors.should.be.an.Array;
          bodyParsed.errors.length.should.be.equal(1);
          bodyParsed.errors[0].code.should.be.equal(400);
          bodyParsed.errors[0].message.should.be.equal('Unable to find corresponding Seller among the Users!');
          bodyParsed.errors[0].field.should.be.equal('seller');
          bodyParsed.errors[0].value.should.be.equal('5366506291e1e82b0f4be503');
          done();
        }
      });
    });
//*/
    it('owner can create tradeline with existent product and seller', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/owner/tradelines',
        'headers': { 'huntKey': ownerHuntKey },
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
          var bodyParsed = JSON.parse(body);
          //console.log(bodyParsed);
          tradeLineId = bodyParsed.id;
          done();
        }
      });
    });

    it('owner can list tradelines', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/owner/tradelines',
        'headers': { 'huntKey': ownerHuntKey }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          var bodyParsed = JSON.parse(body);
          Array.isArray(bodyParsed.data).should.be.true;
          bodyParsed.data.length.should.be.above(1);
          bodyParsed.data.map(function (tradeline) {
            tradeline.id.should.be.a.String;
            tradeline.id.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
            tradeline.totalAus.should.be.below(16);
            if (tradeline.usedAus) {
              tradeline.usedAus.should.be.below(16);
            }
            if (tradeline.creditLimit) {
              tradeline.creditLimit.should.be.below(1000000);
            }
//          tradeline.currentBalance.should.be.below(1000000);
            tradeline.cost.should.be.a.Number;
            tradeline.price.should.be.a.Number;
//          tradeline.notes.should.be.a.String;
            //tradeline.seller.id.should.be.a.String;
            //tradeline.seller.id.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
            tradeline.dateOpen.should.be.a.Date;
            //tradeline.product.id.should.be.a.String;
            //tradeline.product.id.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
            //['ncRating', 'bcRating', 'moRating'].map(function (r) {
            //  ['None', 'Bronze', 'Silver', 'Gold'].should.containEql(tradeline[r])
            //});
          });
          done()
        }
      });

    });
    xit('owner can list one tradeline', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradeLineId,
        'headers': { 'huntKey': ownerHuntKey }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          var bodyParsed = JSON.parse(body);
          bodyParsed.data.id.should.be.equal(tradeLineId);
          /*/
           //Mongoose ORM acts strange
           + expected - actual

           +"5387a3837e6951ff1c28ed4e"
           -"S£~iQÿ\u001c(íN"


           bodyParsed.data.product.id.should.be.equal(productId);
           //*/
          bodyParsed.data.seller.id.should.be.equal(ownerId);
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
          bodyParsed.data.notes.should.be.equal('Some notes');
          done();
        }
      });
    });

    xit('owner can update tradeline', function (done) {
      request({
        'method': 'PUT',
        'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradeLineId,
        'headers': { 'huntKey': ownerHuntKey },
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
//        console.log(body);
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
          bodyParsed.data.notes.should.be.equal('Some notes111');

          request({
            'method': 'GET',
            'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradeLineId,
            'headers': { 'huntKey': ownerHuntKey }
          }, function (error, response, body) {
            if (error) {
              done(error);
            } else {
              response.statusCode.should.be.equal(200);
              var bodyParsed = JSON.parse(body);
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
              bodyParsed.data.notes.should.be.equal('Some notes111');
              bodyParsed.changes.should.be.an.Array;
              bodyParsed.changes.length.should.be.above(0);
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
              changes.notes.should.be.equal('Some notes111');
              done();
            }
          });
        }
      });
    });

    xit('owner can delete (set `active` to false) tradeline', function (done) {
      request({
        'method': 'DELETE',
        'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradeLineId,
        'headers': { 'huntKey': ownerHuntKey }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(202);
          var bodyParsed = JSON.parse(body);
          bodyParsed.status.should.be.equal('Tradeline archived');

          request({
            'method': 'GET',
            'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradeLineId,
            'headers': { 'huntKey': ownerHuntKey }
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
    it('works with `huntKey` as custom header for GET response', function (done) {
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

  describe('Owner creates new seller', function () {
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
          ownerHuntKey = bodyParsed.huntKey;
          done();
        }
      });
    });

    xit('creates new seller', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/admin/clients',
        'headers': {'huntKey': ownerHuntKey},
        'form': {
          'email': 'unitTestSeller' + testId + '@mail.ru',
          'name': {
            'givenName': 'John' + testId,
            'middleName': 'Teodor' + testId,
            'familyName': 'Doe' + testId
          },
          'needQuestionnaire': true,
          'phone': '555-339' + testId,
          'street1': 'Some Address',
          'title': 'Mr.',
          'role': 'seller'
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
          bodyParsed.title.should.be.equal('Mr.');
          bodyParsed.phone.should.be.equal('555-339' + testId);
          bodyParsed.street1.should.be.equal('Some Address');
          bodyParsed.email.should.be.equal('unitTestSeller' + testId + '@mail.ru');
          bodyParsed.root.should.be.a.false;
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

      describe('owner do things', function () {
        it('approves tradeline1');
        it('and tradeline1 is correct');
        it('denies tradeline2');
        it('and tradeline2 is correct');
      });
    });
  });

  describe('Buyer can use cart to', function () {
      describe('adding tradelines', function () {

        it('should be able to add a tradeline to a cart', function (done) {
          async.waterfall([
            function (cb) {
              helpers.getTradelines(function (error, response, body) {
                cb(error, body.data[0]);
              });
            },
            function (tradeline, cb) {
              helpers.cart.addTradeline(tradeline.id, function (error, response) {
                cb(error, response);
              });
            }
          ], function (error, response) {
            response.statusCode.should.be.equal(202);
            done(error);
          });
        });

        xit("doesn't add the same item twice", function (done) {
          async.waterfall([
            function (cb) {
              helpers.getTradelines(function (error, response, body) {
                cb(error, body.data[0]);
              });
            },
            function (tradeline, cb) {
              helpers.cart.addTradeline(tradeline.id, function (error) {
                cb(error, tradeline);
              });
            },
            function (tradeline, cb) {
              helpers.cart.addTradeline(tradeline.id, function (error) {
                cb(error, tradeline);
              });
            },
            function (tradeline, cb) {
              helpers.cart.addTradeline(tradeline.id, function (error) {
                cb(error);
              });
            },
            function (cb) {
              helpers.cart.getTradelines(function (error, response, body) {
                cb(error, body);
              });
            }
          ], function (error, body) {
            body.data.length.should.be.equal(1);
            done(error)
          });
        });

        it("returns 400 if there is no id", function (done) {
          helpers.cart.addTradeline(null, function (error, response) {
            response.statusCode.should.be.equal(400);
            done(error);
          });
        });
      });

      describe("list of tradelines", function () {
        it('should return list of tradelines', function (done) {
          helpers.cart.getTradelines(function (error, response, body) {
            response.statusCode.should.be.equal(200);
            body.data.should.be.an.Array;
            body.itemsInCart.should.be.an.Integer;
            done(error);
          });
        });
      });

      describe("deleting a tradeline", function () {
        xit("should be able to delete a tradeline", function (done) {
          async.waterfall([
            function (cb) {
              helpers.getTradelines(function (error, response, body) {
                var tradeline = body.data[0];
                cb(error, tradeline);
              });
            },
            function (tradeline, cb) {
              helpers.cart.addTradeline(tradeline.id, function (error) {
                cb(error, tradeline);
              });
            },
            function (tradeline, cb) {
              helpers.cart.getTradelines(function (error, respoonse, body) {
                body.data.length.should.be.equal(1);
                cb(error, tradeline);
              });
            },
            function (tradeline, cb) {
              helpers.cart.deleteTradeline(tradeline.id, function (error, response) {
                response.statusCode.should.be.equal(202);
                cb(error);
              });
            },
            function (cb) {
              helpers.cart.getTradelines(function (error, response, body) {
                cb(error, body);
              });
            }
          ], function (error, body) {
            body.data.length.should.be.equal(0);
            done(error);
          });
        });
      });

      describe('buyer can checkout', function () {
        xit('should work', function(done){
          request({
            'method': 'POST',
            'url': 'http://localhost:' + port + '/api/v1/cart/checkout',
            'headers': {'huntKey': buyerHuntKey},
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
                'headers': {'huntKey': buyerHuntKey},
                'json': true
              }, function(error, response, body){
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

  describe('Owner uploads funds to Buyer account', function () {
    it('Owner uploads the funds', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/admin/clients/balance/' + userId,
        'headers': {'huntKey': ownerHuntKey},
        'form': {'amount': 1, 'notes': 'Merry Christmas, fuck you!', date: '2014-05-03', paidBy: 'Credit Card'},
        'json': true
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

    xit('Owner can check that he uploaded the funds', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/admin/clients/' + userId,
        'headers': {'huntKey': ownerHuntKey},
        'form': {'amount': 1, 'notes': 'Merry Christmas, fuck you!'},
        'json': true
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
        request({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradelineId1,
          'json': true,
          'headers': {'huntKey': ownerHuntKey}
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
        request({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradelineId1 + '/changeset/' + changesId + '/deny',
          'json': true,
          'headers': {'huntKey': ownerHuntKey}
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
        request({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradelineId1,
          'json': true,
          'headers': {'huntKey': ownerHuntKey}
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
        request({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradelineId2,
          'json': true,
          'headers': {'huntKey': ownerHuntKey}
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
        request({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradelineId2 + '/changeset/' + changesId + '/approve',
          'json': true,
          'headers': {'huntKey': ownerHuntKey}
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
        request({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradelineId2,
          'json': true,
          'headers': {'huntKey': ownerHuntKey}
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
          helpers.clients.list(function (error, response, body) {
            cb(error, findWithRole('buyer', body))
          });
        },
        function (buyer, cb) {
          helpers.clients.del(buyer.id, function (error, response) {
            response.statusCode.should.be.equal(200);
            cb(error, buyer);
          });
        },
        function (buyer, cb) {
          helpers.clients.get(buyer.id, function (error, response, body) {
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
          helpers.clients.list(function (error, response, body) {
            cb(error, findWithRole('owner', body))
          });
        },
        function (buyer, cb) {
          helpers.clients.del(buyer.id, function (error, response) {
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
  getTradelines: function (cb) {
    request({
      'method': 'GET',
      'url': 'http://localhost:' + port + '/api/v1/tradelines',
      'headers': {'huntKey': buyerHuntKey},
      json: true
    }, cb);
  },

  clients: {
    list: function (cb) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/admin/clients',
        'headers': {'huntKey': ownerHuntKey},
        json: true
      }, cb);
    },

    get: function (id, cb) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/admin/clients/' + id,
        'headers': {'huntKey': ownerHuntKey},
        json: true
      }, cb);
    },

    del: function (id, cb) {
      request({
        'method': 'DELETE',
        'url': 'http://localhost:' + port + '/api/v1/admin/clients/' + id,
        'headers': {'huntKey': ownerHuntKey},
        json: true
      }, cb);
    }
  },
  cart: {
    addTradeline: function (id, cb) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/cart/tradelines',
        'headers': {'huntKey': buyerHuntKey},
        form: {id: id},
        json: true
      }, cb);
    },

    deleteTradeline: function (id, cb) {
      request({
        'method': 'DELETE',
        'url': 'http://localhost:' + port + '/api/v1/cart/tradelines/' + id,
        'headers': {'huntKey': buyerHuntKey},
        json: true
      }, cb);
    },

    getTradelines: function (cb) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/cart/tradelines',
        'headers': {'huntKey': buyerHuntKey},
        json: true
      }, cb);
    }
  }
};
