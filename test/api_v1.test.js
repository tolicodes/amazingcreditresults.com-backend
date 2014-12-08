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
  ownerId,
  ownReq,
  buyerHuntKey,
  productId,
  userId,
  tradeLineId,
  sellerHuntKey,
  sellerId,
  huntKeys = [],
  bannedOwnerHuntKey = 'iaqtumioxrunxvyemsebsvcodytumioxrunxvyemsebsviaqcody',
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
    'city': 'Brooklyn',
    'state': 'NY',
    'zip': '11201',
    'phone': '555-339-' + testId
  };

describe('AmazingCreditResults', function () {
  // ownerHuntKey used by many other tests
  function loginOwner(done) {
    helper.login('owner@example.org', 'test123', function(err, body) {
      ownerHuntKey = body.huntKey;
      ownerId = body.id;
      ownReq = request.defaults({
        'headers': {'huntKey': ownerHuntKey},
        'json': true
      });
      done();
    });
  }
  function loginBuyer(done) {
    helper.resetBuyer(function(err, user){
      buyerHuntKey = user.apiKey;
      done(err);
    });
  }
  before(function (done) {
    backend.once('start', function (evnt) {
      if (evnt.type === 'webserver' || evnt.port === port) {
        backend.once('populated', function () {
          async.parallel([
            function(cb) { loginBuyer(cb); },
            function(cb) { loginOwner(cb); }
          ], done);
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
    describe('Buyer', function () {

      describe('Editing Clients', function () {
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
            'form': modUser
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
            'form': modUser
          }, function (error, response, body) {
            response.statusCode.should.be.equal(202);
            var modified = ['city', 'state', 'zip', 'street1', 'street2', 'phone'];
            modified.forEach(function (mod) {
              body[mod].should.be.equal(modUser[mod]);
            });
            done();
          });
        });
      });

      describe('Issue balance adjustment for buyer', function () {
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

        it('Owner can increase buyer funds', function (done) {
          helper.addBuyerFunds(ownerHuntKey, userId, null, function (error, response, body) {
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
            'form': {
              'amount': 1,
              'notes': 'Merry Christmas, fuck you!'
            }
          }, function (error, response, body) {
            if (error) {
              done(error);
            } else {
              response.statusCode.should.be.equal(200);
              body.transactions.should.be.an.Array;
              body.transactions.length.should.be.above(0);
              var transactionFound = false;
              body.transactions.map(function (t) {
                if (t.amount == 1 && t.type == 'ownerUpload' && t.date == 'Sat May 03 2014') {
                  transactionFound = true;
                }
              });
              transactionFound.should.be.true;
              done();
            }
          });
        });
      });

      describe('Deletion', function() {
        it('can delete a buyer', function (done) {
          async.series([
            /*function (cb) {
             helper.clients.list(ownerHuntKey, function (error, response, body) {
             cb(error, helper.findWithRole('buyer', body))
             });
             },*/
            function (cb) {
              helper.clients.del(ownerHuntKey, userId, function (error, response) {
                response.statusCode.should.be.equal(202);
                cb(error);
              });
            },
            function (cb) {
              helper.clients.get(ownerHuntKey, userId, function (error, response, body) {
                body.data.isBanned.should.be.true;
                cb(error);
              });
            }
          ], function (error) {
            done(error);
          });
        });
      });
    });

    describe('Seller', function () {
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
              'headers': {'huntKey': ownerHuntKey},
              'json': true
            }, function (error, response, body1) {
              if (error) {
                done(error);
              } else {
                response.statusCode.should.be.equal(200);
                body1.data.id.should.be.equal(sellerId);
                done();
              }
            });
          }
        });
      });
    });

    // Beware these tests are interdependent
    describe('Other Owners', function () {
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
        }, function (error, response) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(201);
            done();
          }
        });
      });

      it('can login as newly created owner', function (done) {
        var username = 'owner' + testId + '@example.org';
        helper.login(username, 'test123', function(err, body) {
            ownerHuntKey2 = body.huntKey;
            done();
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
          body.name.givenName.should.be.equal('John');
          body.name.familyName.should.be.equal('Doe');
          done();
        });
      });

      it('cannot delete an owner', function (done) {
        async.waterfall([
          function (cb) {
            helper.clients.list(ownerHuntKey, function (error, response, body) {
              cb(error, helper.findWithRole('owner', body))
            });
          },
          function (owner, cb) {
            helper.clients.del(ownerHuntKey, owner.id, function (error, response) {
              cb(error, response);
            });
          }
        ], function (error, response) {
          response.statusCode.should.be.equal(400);
          done(error);
        });
      });
    });
  });
  // Beware these tests are interdependent
  describe('Managing Buyer Account', function () {

    // Reset testId
    testId = Math.floor(Math.random() * 10000);
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
      'telefone': '555-339' + testId
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
          userId.should.be.a.String;
          userId.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
          done();
        }
      });
    });

    describe('Setting Password', function() {
      it('notifies this user by email message', function (done) {
        ownReq({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/admin/clients/welcome/' + userId,
          'form': { }
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(202);
            body.message.should.be.equal('sent');
            var params = url.parse(body.welcomeLink);
            ['http:', 'https:'].should.include(params.protocol);
            params.pathname.should.match(/^\/welcome\/[a-z]+$/);
            welcomeLink = (/^\/welcome\/([a-z]+)$/.exec(params.pathname))[1];
            body.user.id.should.be.equal(userId);
            done();
          }
        });
      });

      it('can check if user needs to set password based on welcome link', function (done) {
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
            body.needToSetPassword.should.be.true;
            done();
          }
        });
      });

      //https://oselot.atlassian.net/browse/ACR-174
      it('alerts unverified user if they try to log in before password is set', function (done) {
        request({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/account/login',
          'headers': { },
          'form': {
            'username': userInfo.email,
            'password': 'fiflesAndFufles'
          },
          'json': true
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(403);
            body.errors[0].message.should.be.equal('Invalid username or password. Please try again using correct username and password.');
            done();
          }
        });
      });

      it('errors if trying to login with invalid welcome link', function (done) {
        request({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/account/login',
          'headers': { },
          'form': {
            'username': 'thisIsSomeStupidWelcomeLink1111',
            'password': 'fiflesAndFufles'
          },
          'json': true
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(403);
            body.errors[0].message.should.be.equal('Invalid username or password. Please try again using correct username and password.');
            done();
          }
        });
      });

      it('errors if try to set password without apiKey (welcome link)', function (done) {
        request({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/account/setPassword',
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
          'url': 'http://localhost:' + port + '/api/v1/account/setPassword',
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

      it('new user can set their password', function (done) {
        request({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/account/setPassword',
          'headers': { },
          'form': {
            'apiKey': welcomeLink,
            'password': 'fiflesAndFufles'
          },
          'json': true
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(201);
            body.Code.should.be.equal(201);
            body.Success.should.be.equal('Password is set!');
            done();
          }
        });
      });

      it('authorizes user if they log in with email and password', function (done) {
        helper.login(userInfo.email, 'fiflesAndFufles', function(err, body) {
          buyerHuntKey = body.huntKey;
          done();
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
    }); // END SET PASSWORD TESTS

    describe('Verify Phone', function() {
      var phoneNum = '3152727199';
      before(function(done) {
        helper.resetBuyer(function(err, user){
          buyerHuntKey = user.apiKey;
          done(err);
        }, { phoneVerified: false, phone: phoneNum});
      });

      it('will send verification if phone is not verified', function(done) {
        helper.verify.phone.send(buyerHuntKey, function(error, response, body) {
          response.statusCode.should.be.equal(202);
          body.status.should.be.equal('Ok');
          body.phoneVerified.should.be.false;
          body.message.should.be.equal('Phone of '+ phoneNum + ' will be verified!');
          done();
        });
      });

      it('will error if no pin provided', function(done) {
        helper.verify.phone.checkPin(buyerHuntKey, undefined, function(error, response, body) {
          response.statusCode.should.be.equal(400);
          body.status.should.be.equal('Error');
          body.errors[0].message.should.be.equal('Pin code is missing!');
          done();
        });
      });

      it('will error on incorrect pin', function(done) {
        var badPin = '133700';
        helper.verify.phone.checkPin(buyerHuntKey, badPin, function(error, response, body) {
          response.statusCode.should.be.equal(400);
          body.status.should.be.equal('Error');
          body.errors[0].message.should.be.equal('Invalid verification code, please try again');
          done();
        });
      });

      it('can confirm correct pin', function(done) {
        var goodPin = '000000';
        helper.verify.phone.checkPin(buyerHuntKey, goodPin, function(error, response, body) {
          response.statusCode.should.be.equal(202);
          body.status.should.be.equal('Ok');
          body.phoneVerified.should.be.true;
          body.message.should.be.equal('Phone of '+ phoneNum + ' is verified');
          done();
        });
      });

      it('can check if phone is verified', function(done) {
        async.series([
          function(cb) {
            helper.resetBuyer(cb, { phoneVerified: true, phone: phoneNum});
          },
          function() {
            helper.verify.phone.send(buyerHuntKey, function(error, response, body) {
              response.statusCode.should.be.equal(200);
              body.status.should.be.equal('Ok');
              body.phoneVerified.should.be.true;
              body.message.should.be.equal('Phone of '+ phoneNum + ' is verified!');
              done();
            });
          }
        ]);
      });
    });

    describe('Resetting Password', function() {
      after(function(done) {
        helper.resetBuyer(done);
      });

      it('cannot reset password without providing username', function(done) {
        request({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/account/resetPassword/',
          'headers': {},
          'form': {},
          'json': true
        }, function (error, response, body) {
          response.statusCode.should.be.equal(400);
          body.status.should.be.equal('Error');
          body.errors[0].message.should.be.equal('Username required to reset password!');
          done();
        });
      });

      it('can reset buyer password', function(done) {
        async.waterfall([
          function(cb) {
            helper.resetBuyer(cb);
          },
          function(user, cb) {
            request({
              'method': 'POST',
              'url': 'http://localhost:' + port + '/api/v1/account/resetPassword/',
              'headers': { },
              'form': {
                'username' : user.keychain.email,
                'debug' : 'true' // Used to return welcomeLink
              },
              'json': true
            }, function (error, response, body) {
              var params, newLink;
              response.statusCode.should.be.equal(202);
              body.message.should.be.equal('Reset email sent');

              params = url.parse(body.welcomeLink);
              ['http:', 'https:'].should.include(params.protocol);
              params.pathname.should.match(/^\/password\/[a-z]+$/);

              // Parse welcome link
              newLink = (/^\/password\/([a-z]+)$/.exec(params.pathname))[1];
              newLink.should.not.equal(user.keychain.welcomeLink);
              cb(error, newLink, user.keychain.email);
            });
          },
          function(welcomeLink, email, cb) {
            var newPass = 'test456';
            request({
              'method': 'POST',
              'url': 'http://localhost:' + port + '/api/v1/account/setPassword/',
              'headers': { },
              'form': {
                'apiKey' : welcomeLink,
                'password' : newPass
              },
              'json': true
            }, function (error, response, body) {
              response.statusCode.should.be.equal(201);
              body.Success.should.equal('Password is set!');
              cb(error, email, newPass);
            });
          }
        ], function(err, email, newPass) {
          helper.login(email, newPass, function(err) {
            done(err);
          });
        });

      });
    });

    describe('Using /api/v1/myself', function () {
      var buyerUser;
      beforeEach(function(done){
        helper.resetBuyer(function(err, user){
          buyerHuntKey = user.apiKey;
          buyerUser = user;
          done();
        });
      });

      it('works with GET', function (done) {
        request({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/api/v1/myself',
          'headers': {'huntKey': buyerHuntKey},
          'json': true
        }, function (error, response, body) {
          response.statusCode.should.be.equal(200);
          body.huntKey.should.be.equal(buyerHuntKey);
          body.name.givenName.should.be.equal(buyerUser.name.givenName);
          done();
        });
      });

      describe('PUT', function () {
        var myInfo, newInfo = {
          'zip': '13413',
          'phone': '4321122121',
          'city': 'New Hartford',
          'name': {
            'givenName' : 'George',
            'middleName': 'Dubya'
          },
          'ssn': '555-555-5555'
        };

        it('cannot update name, address of evs verified user', function(done) {
          async.series([
            function(cb) {
              helper.resetBuyer(cb, { phoneVerified: false, evsVerified: true });
            }],
            function() {
              myInfo = helper.clone(newInfo);
              request({
                'method': 'PUT',
                'url': 'http://localhost:' + port + '/api/v1/myself',
                'headers': {'huntKey': buyerHuntKey},
                'form': myInfo,
                'json': true
              }, function (error, response, body) {
                response.statusCode.should.be.equal(400);
                body.errors[0].message.should.equal('Cannot modify these fields after EVS Verification');
                done();
              });
            }
          );
        });

        it('can update phone of EVS verified user', function(done){
          async.series([
              function(cb) {
                helper.resetBuyer(cb, { phoneVerified: false, evsVerified: true });
              }],
              function() {
                myInfo = {
                  phone: '4310110112'
                };
                request({
                  'method': 'PUT',
                  'url': 'http://localhost:' + port + '/api/v1/myself',
                  'headers': {'huntKey': buyerHuntKey},
                  'form': myInfo,
                  'json': true
                }, function (error, response, body) {
                  response.statusCode.should.be.equal(202);
                  body.phone.should.be.equal(myInfo.phone);
                  body.phoneVerified.should.be.equal(false);
                  body.evsVerified.should.be.equal(true);
                  done();
                });
              }
          );
        });

        it('will reset verification when changing phone number of phone verified user', function(done) {
          async.series([
                function(cb) {
                  helper.resetBuyer(cb, { phoneVerified: true, evsVerified: false });
                }],
              function() {
                myInfo = helper.clone(newInfo);
                request({
                  'method': 'PUT',
                  'url': 'http://localhost:' + port + '/api/v1/myself',
                  'headers': {'huntKey': buyerHuntKey},
                  'form': myInfo,
                  'json': true
                }, function (error, response, body) {
                  response.statusCode.should.be.equal(202);
                  body.phone.should.be.equal(myInfo.phone);
                  body.phoneVerified.should.be.equal(false);
                  body.evsVerified.should.be.equal(false);
                  body.ssn.should.be.equal(myInfo.ssn.slice(-4));
                  done();
                });
              }
          );
        });

        it('can update name, phone, address of unverified user', function(done) {
          async.series([
            function(cb) {
              helper.resetBuyer(cb, { phoneVerified: false, evsVerified: false });
            }],
            function() {
              request({
                'method': 'PUT',
                'url': 'http://localhost:' + port + '/api/v1/myself',
                'headers': {'huntKey': buyerHuntKey},
                'form' : newInfo,
                'json': true
              }, function (error, response, body) {
                response.statusCode.should.be.equal(202);
                body.name.givenName.should.equal(newInfo.name.givenName);
                body.name.middleName.should.equal(newInfo.name.middleName);
                body.name.familyName.should.equal('Doe'); // Shouldn't erase original info
                body.zip.should.equal(newInfo.zip.toString());
                body.phone.should.equal(newInfo.phone.toString());
                body.city.should.equal(newInfo.city);
                body.phoneVerified.should.equal(false);
                body.evsVerified.should.equal(false);
                done(error);
              });
            }
          );
        });

      });

    });

    describe('Verify ACH Account', function() {
      var bankInfo = helper.verify.ach.defaults.bank();

      before(function(done){
        helper.resetBuyer(function(err, user){
          buyerHuntKey = user.apiKey;
          done();
        });
      });


      describe('Invalid Requests', function() {
        describe('Creating Validation', function() {
          // Reset Info
          beforeEach(function(){
            bankInfo = helper.verify.ach.defaults.bank();
          });

          it('requires an account number', function(done){
            delete bankInfo.accountNumber;
            helper.verify.ach.create(buyerHuntKey, bankInfo, function(error, response, body){
              response.statusCode.should.be.equal(400);
              body.errors[0].message.should.equal('Account Number is not provided!');
              body.errors[0].field.should.equal('accountNumber');
              done();
            });
          });

          it('requires an account type', function(done){
            delete bankInfo.accountType;
            helper.verify.ach.create(buyerHuntKey, bankInfo, function(error, response, body){
              response.statusCode.should.be.equal(400);
              body.errors[0].message.should.equal('Account type must be `checking` or `savings`!');
              body.errors[0].field.should.equal('accountType');
              done();
            });
          });

          it('requires a valid account type', function(done){
            bankInfo.accountType = 'fakeType';
            helper.verify.ach.create(buyerHuntKey, bankInfo, function(error, response, body){
              response.statusCode.should.be.equal(400);
              body.errors[0].message.should.equal('Account type must be `checking` or `savings`!');
              body.errors[0].field.should.equal('accountType');
              done();
            });
          });

          it('requires a routing number', function(done){
            delete bankInfo.routingNumber;
            helper.verify.ach.create(buyerHuntKey, bankInfo, function(error, response, body){
              response.statusCode.should.be.equal(400);
              body.errors[0].message.should.equal('Routing Number is not provided!');
              body.errors[0].field.should.equal('routingNumber');
              done();
            });
          });
        });

        describe('Confirming Payouts', function() {
          var payoutInfo;
          beforeEach(function(){
            payoutInfo = helper.verify.ach.defaults.payout();
          });

          it('requires amounts in API request', function(done) {
            delete payoutInfo.amount1;
            delete payoutInfo.amount2;
            helper.verify.ach.check(buyerHuntKey, payoutInfo, function(error, response, body) {
              response.statusCode.should.be.equal(400);
              body.errors[0].message.should.equal('Amount1 is missing!');
              body.errors[1].message.should.equal('Amount2 is missing!');
              done();
            });
          });

          it('requires user has already set up ACH account', function(done) {
            helper.verify.ach.check(buyerHuntKey, payoutInfo, function(error, response, body) {
              response.statusCode.should.be.equal(400);
              body.errors[0].message.should.equal('Must add ACH account before verifying.');
              done();
            });
          });

          it('errors if user already validated ACH account', function(done) {
            async.series([
                function(cb) {
                  helper.resetBuyer(cb, {achAccount: {id: '123b3c2x', 'verified': true}})
                },
                function() {
                  helper.verify.ach.check(buyerHuntKey, payoutInfo, function(error, response, body) {
                    response.statusCode.should.be.equal(400);
                    body.errors[0].message.should.equal('ACH account already verified!');
                    done();
                  });
                }
            ]);
          });
        });

      });

      // This test is slow, but should be run for completeness
      // TODO move into separate file
      xdescribe('Valid Request', function() {

        it('can create verification', function(done){
          var bank = helper.verify.ach.defaults.bank();
          this.timeout(60000);
          helper.verify.ach.create(buyerHuntKey, bank, function(error, response, body) {
            response.statusCode.should.be.equal(202);
            body.status.should.equal('ok');
            body.account.should.be.String;
            body.verified.should.equal(false);

            request({
              'method': 'GET',
              'url': 'http://localhost:' + port + '/api/v1/myself',
              'headers': {'huntKey': buyerHuntKey},
              'json': true
            }, function (error, response, body) {
              response.statusCode.should.be.equal(200);
              body.achAccount.id.should.be.String;
              body.achAccount.verifyId.should.be.String;
              body.achAccount.verified.should.equal(false);
              done();
            });
          });
        });

        // Requires previous test run first
        it('returns false if wrong amounts', function(done) {
          var payout = helper.verify.ach.defaults.payout();
          payout.amount2 = 25;
          this.timeout(60000);
          helper.verify.ach.check(buyerHuntKey, payout, function(error, response, body){
            response.statusCode.should.be.equal(400);
            body.verificationSuccess.should.equal(false);
            done();
          });
        });

        // Requires previous test run first
        it('can verify account', function(done) {
          var payout = helper.verify.ach.defaults.payout();
          this.timeout(60000);
          helper.verify.ach.check(buyerHuntKey, payout, function(error, response, body){
            response.statusCode.should.be.equal(202);
            body.verificationSuccess.should.equal(true);
            request({
              'method': 'GET',
              'url': 'http://localhost:' + port + '/api/v1/myself',
              'headers': {'huntKey': buyerHuntKey},
              'json': true
            }, function (error, response, body) {
              response.statusCode.should.be.equal(200);
              body.achAccount.verified.should.equal(true);
              body.achAccount.customerId.should.be.String;
              done();
            });
          });
        });
      });
    });

    describe('Setting Credit Report Login', function(){
      var login;
      var defaultInfo = function() {
        return {
          'site': 'creditchecktotal.com',
          'username': 'fastbuyer123',
          'password': 'sup3rs3cure'
        };
      };
      beforeEach(function(){
        login = defaultInfo();
      });
      describe('Invalid Request', function(){
        it('requires a site', function(done){
          delete login.site;
          helper.setCreditReport(buyerHuntKey, login, function(err, response, body){
            response.statusCode.should.equal(400);
            body.errors[0].field.should.equal('site');
            done();
          });
        });
        it('requires a username', function(done){
          delete login.username;
          helper.setCreditReport(buyerHuntKey, login, function(err, response, body){
            response.statusCode.should.equal(400);
            body.errors[0].field.should.equal('username');
            done();
          });
        });
        it('requires a password', function(done){
          delete login.password;
          helper.setCreditReport(buyerHuntKey, login, function(err, response, body){
            response.statusCode.should.equal(400);
            body.errors[0].field.should.equal('password');
            done();
          });
        });
      });
      it('sets credit login', function(done){
        helper.setCreditReport(buyerHuntKey, login, function(err, response) {
          response.statusCode.should.equal(202);
          request({
            'method': 'GET',
            'url': 'http://localhost:' + port + '/api/v1/myself',
            'headers': {'huntKey': buyerHuntKey},
            'json': true
          }, function(error, response, body) {
            response.statusCode.should.equal(200);
            body.creditReportLogin.username.should.equal(login.username);
            body.creditReportLogin.site.should.equal(login.site);
            body.creditReportLogin.password.should.be.String;
            body.creditReportLogin.password.should.not.equal(login.password);
            done();
          });
        });

      });
    });
  });

  // TODO Is this in scope? 
  xdescribe('Owner can upload CSV file with clients', function () {
    //todo - with clustering this test behaves strange
    var ownerHuntKey1;
    before(function (done) {
      helper.login('owner@example.org', 'test123', function(err, body) {
          ownerHuntKey1 = body.huntKey;
          done();
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

  describe('Managing Owner Account', function() {
    describe('Login', function () {
      it('returns 200 && `huntKey` for correct password via application/x-www-form-urlencoded', function (done) {
        request({
          'method': 'POST',
          'url': 'http://localhost:' + port + '/api/v1/account/login',
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
          'url': 'http://localhost:' + port + '/api/v1/account/login',
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
          'url': 'http://localhost:' + port + '/api/v1/account/login',
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
          'url': 'http://localhost:' + port + '/api/v1/account/login',
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
    });

    describe('Resetting Password', function() {
      var testOwner;
      beforeEach(function(done) {
        helper.resetOwner(function(err, user) {
          testOwner = user;
          console.log('Created test user!');
          done(err);
        });
      });

      it('can reset owner password', function(done) {
        async.waterfall([
          function(cb) {
            request({
              'method': 'POST',
              'url': 'http://localhost:' + port + '/api/v1/account/resetPassword/',
              'headers': { },
              'form': {
                'username' : testOwner.keychain.email,
                'debug' : 'true' // Used to return welcomeLink
              },
              'json': true
            }, function (error, response, body) {
              var params, newLink;
              response.statusCode.should.be.equal(202);
              body.message.should.be.equal('Reset email sent');

              params = url.parse(body.welcomeLink);
              ['http:', 'https:'].should.include(params.protocol);
              params.pathname.should.match(/^\/password\/[a-z]+$/);

              // Parse welcome link
              newLink = (/^\/password\/([a-z]+)$/.exec(params.pathname))[1];
              newLink.should.not.equal(testOwner.keychain.welcomeLink);
              cb(error, newLink);
            });
          },
          function(welcomeLink, cb) {
            var newPass = 'test456';
            request({
              'method': 'POST',
              'url': 'http://localhost:' + port + '/api/v1/account/setPassword/',
              'headers': { },
              'form': {
                'apiKey' : welcomeLink,
                'password' : newPass
              },
              'json': true
            }, function (error, response, body) {
              response.statusCode.should.be.equal(201);
              body.Success.should.equal('Password is set!');
              cb(error, newPass);
            });
          }
        ], function(error, newPass) {
          request({
            'method': 'POST',
            'url': 'http://localhost:' + port + '/api/v1/account/login',
            'headers': { },
            'form': {
              'username' : testOwner.keychain.email,
              'password': newPass
            },
            'json': true
          }, function (error, response) {
            response.statusCode.should.be.equal(200);
            done();
          });
        });

      });
    });

    describe('Using /api/v1/myself', function () {

      describe('GET', function () {
        it('works with `huntKey` as `GET` parameter', function (done) {
          request({
            'method': 'GET',
            'url': 'http://localhost:' + port + '/api/v1/myself?huntKey=' + huntKeys[0]
          }, function (error, response, body) {
            testingCallback(error, response, body, done);
          });
        });
        it('works with `huntKey` as custom header for GET response', function (done) {
          request({
            'method': 'GET',
            'url': 'http://localhost:' + port + '/api/v1/myself',
            'headers': {'huntKey': huntKeys[0]}
          }, function (error, response, body) {
            testingCallback(error, response, body, done);
          });
        });
      });

      describe('PUT', function () {
        it('updates name, address of a user', function(done) {
          var newInfo = {
            'zip': 13413,
            'city': 'New Hartford',
            'name': {
              'givenName' : 'George',
              'middleName': 'Dubya'
            },
            'ssn': '111-222-3322'
          };
          request({
            'method': 'PUT',
            'url': 'http://localhost:' + port + '/api/v1/myself',
            'headers': {'huntKey': huntKeys[0]},
            'form' : newInfo,
            'json': true
          }, function (error, response, body) {
            response.statusCode.should.be.equal(202);
            body.name.givenName.should.equal(newInfo.name.givenName);
            body.name.middleName.should.equal(newInfo.name.middleName);
            body.name.familyName.should.equal('Zorg'); // Shouldn't erase original info
            body.zip.should.equal(newInfo.zip.toString());
            body.city.should.equal(newInfo.city);
            body.ssn.length.should.equal(4);
            done();
          });
        });

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



  describe('Product Management', function () {
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
    // NOTE: This fucks up the tradelines created at the beginning
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
        'url': 'http://localhost:' + port + '/api/v1/owner/products'
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
        'url': 'http://localhost:' + port + '/api/v1/owner/products/' + productId
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
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
              'url': 'http://localhost:' + port + '/api/v1/owner/products/' + productId
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
          'url': 'http://localhost:' + port + '/api/v1/owner/products/' + productId
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(202);
            body.status.should.be.equal('deleted');

            ownReq({
                'method': 'GET',
                'url': 'http://localhost:' + port + '/api/v1/owner/products/' + productId
              }, function (error1, response1) {
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
        }, function (error) {
          if (error) {
            done(error);
          } else {
           ownReq({
              'method': 'DELETE',
              'url': 'http://localhost:' + port + '/api/v1/owner/products/' + productId
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

  describe('Tradeline Management', function () {
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

    describe('Creating', function() {
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
    });

    it('can list all tradelines', function (done) {
      ownReq({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/owner/tradelines'
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          //console.log(body.data);
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
            if (tradeline.notes) {
              tradeline.notes.should.be.a.String;
            }
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
    it('can list one tradeline', function (done) {
      ownReq({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradeLineId
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

    it('can update tradeline', function (done) {
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
            'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradeLineId
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

    describe('Archiving', function() {
      it('owner can archive active tradeline', function (done) {
        helper.tradelines.archive(ownerHuntKey, tradeLineId,
        function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(202);
            body.status.should.be.equal('Tradeline archived');

            helper.tradelines.get(ownerHuntKey, tradeLineId,
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
        helper.tradelines.archive(ownerHuntKey, invalidId,
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

  // DEPRECATED
  xdescribe('Seller editing his/her tradelines', function () {
    var sellerId,
      productId,
      sellerHuntKey,
      tradeLineId;

    before(function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/account/login',
        'form': {
          'username': 'gracedoe@example.org', // do not change!
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


    xit('seller is able to access /api/v1/myself at first to see, if it has proper huntKey', function (done) {
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

    // ============= SELLER: Edit Tradelines (DEPRECATED) ===============
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



  describe('Buyer Cart Management', function () {
      var cartBuyerHuntKey;
      // Login the buyer
      before(function(done) {
        async.parallel([
          function(cb) {
            helper.login('jamesdoe@example.org', 'test123', function(err, body) {
              cartBuyerHuntKey = body.huntKey;
              cb();
            });
          },
          function(cb) {
            helper.resetProductsAndTradelines(function() {
              cb();
            });
          }
        ], function(err) {
          done(err);
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
              helper.tradelines.list(cartBuyerHuntKey, function (error, response, body) {
                body.data.should.be.instanceof(Array);
                body.data.length.should.be.above(0);
                cb(error, body.data[0]);
              });
            },
            function (tradeline, cb) {
              helper.cart.addTradeline(cartBuyerHuntKey, tradeline.id, function (error, response, body) {
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

        it('cannot add the same tradeline twice', function (done) {
          async.waterfall([
            function (cb) {
              helper.tradelines.list(cartBuyerHuntKey, function (error, response, body) {
                cb(error, body.data[0]);
              });
            },
            function (tradeline, cb) {
              helper.cart.addTradeline(cartBuyerHuntKey, tradeline.id, function (error) {
                cb(error, tradeline);
              });
            },
            function (tradeline, cb) {
              helper.cart.addTradeline(cartBuyerHuntKey, tradeline.id, function (error) {
                cb(error, tradeline);
              });
            },
            function (tradeline, cb) {
              helper.cart.addTradeline(cartBuyerHuntKey, tradeline.id, function (error) {
                cb(error);
              });
            },
            function (cb) {
              helper.cart.getTradelines(cartBuyerHuntKey, function (error, response, body) {
                cb(error, body);
              });
            }
          ], function (error, body) {
            body.data.length.should.be.equal(1);
            done(error)
          });
        });

        it('fails if tradeline id not provided', function (done) {
          helper.cart.addTradeline(cartBuyerHuntKey, null, function (error, response) {
            response.statusCode.should.be.equal(400);
            done(error);
          });
        });
      });

      it('should be able to list tradelines', function (done) {
          async.waterfall([
            function (cb) {
              helper.tradelines.list(cartBuyerHuntKey, function (error, response, body) {
                cb(error, body.data[0]);
              });
            },
            function (tradeline, cb) {
              helper.cart.addTradeline(cartBuyerHuntKey, tradeline.id, function (error) {
                cb(error);
              });
            },
            function (cb) {
              helper.cart.getTradelines(cartBuyerHuntKey, function (error, response, body) {
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

      it('can remove a tradeline from the cart', function (done) {
          async.waterfall([
            function (cb) {
              helper.tradelines.list(cartBuyerHuntKey, function (error, response, body) {
                var tradeline = body.data[0];
                cb(error, tradeline);
              });
            },
            function (tradeline, cb) {
              helper.cart.addTradeline(cartBuyerHuntKey, tradeline.id, function (error) {
                cb(error, tradeline);
              });
            },
            function (tradeline, cb) {
              helper.cart.getTradelines(cartBuyerHuntKey, function (error, respoonse, body) {
                body.data.length.should.be.equal(1);
                cb(error, tradeline);
              });
            },
            function (tradeline, cb) {
              helper.cart.deleteTradeline(cartBuyerHuntKey, tradeline.id, function (error, response) {
                response.statusCode.should.be.equal(202);
                cb(error);
              });
            },
            function (cb) {
              helper.cart.getTradelines(cartBuyerHuntKey, function (error, response, body) {
                cb(error, body);
              });
            }
          ], function (error, body) {
            body.data.length.should.be.equal(0);
            done(error);
          });
        });

      describe('Checkout', function () {
        function prepareCart(huntKey, cb) {
          huntKey = huntKey || cartBuyerHuntKey;
          var tradelineId;
          async.series([
            function (cb) {
              helper.tradelines.list(huntKey, function (error, response, body) {
                body.data.should.be.Array;
                tradelineId = body.data[0].id;
                cb(error);
              });
            },
            function (cb) {
              helper.cart.addTradeline(huntKey, tradelineId, function (error, response) {
                response.statusCode.should.be.equal(202);
                cb(error);
              });
            }
          ], cb);
        }
        var userId;
        // Give James Doe a clean slate
        beforeEach(function(done) {
          helper.resetBuyer(function(error, user) {
            userId = user._id;
            done();
          });
        });

        describe('Invalid Request', function() {
          it('should error if user unverified', function(done){
            var buyerHuntKey;
            async.series([
              // Login as unverified user
              function (cb) {
                helper.login('janedoe@example.org', 'test123', function(error, body){
                  buyerHuntKey = body.huntKey;
                  cb(error);
                });
              },
              function (cb) {
                prepareCart(buyerHuntKey, cb);
              },
              function () {
                helper.cart.checkout(buyerHuntKey, null, function (error, response, body) {
                  if(error) {
                    done(error);
                  } else {
                    console.log(body);
                    response.statusCode.should.be.equal(400);
                    body.status.should.be.equal('Error');
                    body.errors[0].message.should.be.equal('SSN, First Name, Last Name, or DOB not verified');
                    done();
                  }
                });
              }
            ], function (error, response) {
              response.statusCode.should.be.equal(400);
              done(error);
            });
          });

          it('should error if cart empty', function(done){
            helper.cart.checkout(cartBuyerHuntKey, null, function (error, response, body) {
              if(error) {
                done(error);
              }
              response.statusCode.should.be.equal(400);
              body.status.should.be.equal('Error');
              body.errors[0].message.should.be.equal('Your cart is empty, please add at least one tradeline before checkout');
              done();
            });
          });

          // TODO fix Flickering Test
          it('should error if user adds tradeline with no available AUs', function(done) {
            async.waterfall([
              // Read in tradelines
              function (cb) {
                helper.tradelines.list(cartBuyerHuntKey, function (error, response, body) {
                  cb(error, body.data);
                });
              },
              // Add 2 tradelines, one with available AU, one with no avail AU
              function (tradelines, cb) {
                async.parallel([
                      function (c) {
                        helper.cart.addTradeline(cartBuyerHuntKey, tradelines[0].id, function (error) {
                          c(error);
                        });
                      },
                      function (c) {
                        helper.cart.addTradeline(cartBuyerHuntKey, tradelines[2].id, function (error) {
                          c(error);
                        });
                      }
                    ],
                    function(error){
                      cb(error);
                    });
              },
              // Try to checkout
              function(cb) {
                helper.cart.checkout(cartBuyerHuntKey, null, function (error, response, body) {
                  if(error) {
                    done(error);
                  } else {
                    cb(null, body);
                  }
                });
              }
            ], function (error, body) {
              body.status.should.be.equal('Error');
              body.errors.length.should.be.equal(1);
              body.errors[0].message.should.be.equal('Trade line in your cart "'+ body.errors[0].name +'" no longer available.');
              done();
            });
          });

          describe('Payment', function() {
            it('should error if insufficient funds and no payment type specified', function(done){
              prepareCart(cartBuyerHuntKey, function () {
                helper.cart.checkout(cartBuyerHuntKey, null, function (error, response, body) {
                  if(error) {
                    done(error);
                  } else {
                    response.statusCode.should.be.equal(400);
                    body.status.should.be.equal('Error');
                    body.errors[0].message.should.be.equal('Please specify an ACH account or credit card for payment');
                    done();
                  }
                });
              });
            });

            it('should error if account credit specified for payment higher than in user`s account', function(done) {
              prepareCart(cartBuyerHuntKey, function () {
                async.series([
                  function (cb) {
                    helper.addBuyerFunds(ownerHuntKey, userId, {amount: 1000}, function (error, response, body) {
                      response.statusCode.should.be.equal(202);
                      body.status.should.be.equal('Ok');
                      cb(error);
                    });
                  },
                  function () {
                    var req = {
                      amtAccountCredit: 1001
                    };
                    helper.cart.checkout(cartBuyerHuntKey, req, function (error, response, body) {
                      response.statusCode.should.equal(400);
                      body.errors[0].message.should.be.equal('Account credit specified is higher than what is available to your account');
                      done();
                    });
                  }
                ]);
              });
            });

            it('should error if both credit card and ACH specified', function(done) {
              prepareCart(cartBuyerHuntKey, function () {
                var req = {
                  useAchAccount: true,
                  creditCardToken: 'BQokikJOvBiI2HlWgH4olfQ2' // fake token
                };
                helper.cart.checkout(cartBuyerHuntKey, req, function (error, response, body) {
                  response.statusCode.should.equal(400);
                  body.errors[0].message.should.be.equal('Please only choose one payment method, credit card or ACH account');
                  done();
                });
              });
            });

            it('should error if ACH specified for payment not verified', function(done) {
              helper.resetBuyer(function () {
                prepareCart(cartBuyerHuntKey, function () {
                  var req = {
                    useAchAccount: true
                  };
                  helper.cart.checkout(cartBuyerHuntKey, req, function (error, response, body) {
                    response.statusCode.should.equal(402);
                    body.errors[0].message.should.be.equal('ACH Account not verified');
                    done();
                  });
                });
              }, {achAccount: {id: '213j1klj21312jkl', verified: false}});
            });
          });
        });

        describe('Valid Request', function() {
          function confirmCheckout(huntKey, buyerId, checkoutBody, cb) {
            console.log(checkoutBody);
            checkoutBody.status.should.be.equal('Ok');
            checkoutBody.orderId.should.be.a.String;
            checkoutBody.orderTransactionId.should.be.a.String;
            var newTransactionId = checkoutBody.orderTransactionId;
            async.parallel([
              function (cc) {
                request({
                  'method': 'GET',
                  'url': 'http://localhost:' + port + '/api/v1/myself/transactions',
                  'headers': {'huntKey': huntKey},
                  'json': true
                }, function (error, response, body) {
                  response.statusCode.should.be.equal(200);
                  var orderTransactionFound = false,
                      chargeTransactionFound = false;
                  body.data.transactions.map(function (tr) {
                    if (tr.id === checkoutBody.orderTransactionId) {
                      orderTransactionFound = true;
                    } else if (checkoutBody.chargeTransactionId && tr.id === checkoutBody.chargeTransactionId) {
                      chargeTransactionFound = true;
                    }
                  });
                  orderTransactionFound.should.be.true;
                  if (checkoutBody.chargeTransactionId) {
                    chargeTransactionFound.should.be.true;
                  }
                  cc(error);
                });
              },
              function (cc) {
                request({
                  'method': 'GET',
                  'url': 'http://localhost:' + port + '/api/v1/orders',
                  'headers': {'huntKey': huntKey},
                  'json': true
                }, function (error, response, body) {
                  console.log(body);
                  response.statusCode.should.equal(200);
                  var order = body.orders[0];
                  order.orderTotal.should.equal(1000);
                  order.id.should.equal(checkoutBody.orderId);
                  cc(error);
                });
              }
            ], function () {
              cb();
            });
          }

          beforeEach(function(done) {
            helper.resetProductsAndTradelines(function() {
              done();
            });
          });

          it('should be able to checkout using just account credit', function(done){
            async.series([
              function (cb) {
                helper.addBuyerFunds(ownerHuntKey, userId, {amount: 1000}, function (error, response, body) {
                  response.statusCode.should.be.equal(202);
                  body.status.should.be.equal('Ok');
                  cb(error);
                });
              },
              function (cb) {
                prepareCart(cartBuyerHuntKey, cb);
              },
              function () {
                var req = {
                  'amtAccountCredit': 1000
                };
                helper.cart.checkout(cartBuyerHuntKey, req, function (error, response, body) {
                  if (error) {
                    done(error);
                  } else {
                    response.statusCode.should.be.equal(201);
                    confirmCheckout(cartBuyerHuntKey, userId, body, done);
                  }
                });
              }
            ]);
          });

          it('should be able to checkout using ACH', function(done) {
            this.timeout(60000);
            async.series([
              function(cb) {
                // reset buyer with ACH account verified
                helper.resetBuyer(cb,
                // Balanced Test Account
                { 'achAccount': {
                    'id': 'BA5AUJx0PRR6VqPVodgzY2Ri',
                    'customerId': 'CU5AEYKzLp70b2MxBSHWUkrC',
                    'verified': true
                }});
              },
              function(cb) {
                prepareCart(cartBuyerHuntKey, cb);
              },
              function() {
                var req = {
                  'useAchAccount': true
                };
                helper.cart.checkout(cartBuyerHuntKey, req, function (error, response, body) {
                  response.statusCode.should.be.equal(201);
                  body.chargeTransactionId.should.be.a.String;
                  confirmCheckout(cartBuyerHuntKey, userId, body, done);
                });
              }]
            );
          });
        });

      });
  });


  // DEPRECATED
  xdescribe('Seller creates two tradelines and made revisions for them, and Owner rejects first one, and approves second one', function () {
    var tradelineId1,
      tradelineId2,
      productId,
      sellerHuntKey;

    before(function (done) {
//getting huntKey for seller of Grace Doe
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/api/v1/account/login',
        'json': true,
        'form': {
          'username': 'gracedoe@example.org',
          'password': 'test123'
        }
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
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
        }, function (error) {
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
            }, function (error, response) {
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
            }, function (error, response) {
              if (error) {
                cb(error);
              } else {
                response.statusCode.should.be.equal(202);
                cb(null);
              }
            });
          }
        }, function (error) {
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
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradelineId1
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
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradelineId1 + '/changeset/' + changesId + '/deny'
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
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradelineId1
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
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradelineId2
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
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradelineId2 + '/changeset/' + changesId + '/approve'
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
          'url': 'http://localhost:' + port + '/api/v1/owner/tradelines/' + tradelineId2
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


  // TODO
  xdescribe('Order Management', function () {
    it('owner can see all orders', function(done) {
        ownReq({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/api/v1/orders/'
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(200);
            body.orders.should.be.an.Array;
            done();
          }
        });
    });
  });

});