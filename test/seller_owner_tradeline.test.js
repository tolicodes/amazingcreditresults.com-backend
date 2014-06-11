var request = require('request'),
  should = require('should'),
  testId = Math.floor(Math.random() * 10000),
  port = process.env.PORT || 3000,
  ownerHuntKey,
  sellerHuntKey,
  sellerId,
  firstTradelineId,
  secondTradelineId;


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

  it('creates new seller', function (done) {
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
        'telefone': '555-339' + testId,
        'localAddress': 'Some Address',
        'title': 'Mr.',
        'roles': {
          'seller': true
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
        bodyParsed.title.should.be.equal('Mr.');
        bodyParsed.telefone.should.be.equal('555-339' + testId);
        bodyParsed.localAddress.should.be.equal('Some Address');
        bodyParsed.email.should.be.equal('unitTestSeller' + testId + '@mail.ru');
        bodyParsed.root.should.be.a.false;
        sellerHuntKey = bodyParsed.huntKey;
//and we can get this client
        request({
          'method': 'GET',
          'url': 'http://localhost:' + port + '/api/v1/admin/clients/' + sellerId,
          'headers': {'huntKey': ownerHuntKey}
        }, function (error, response, body) {
          if (error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(200);
            var bodyParsed = JSON.parse(body);
            bodyParsed.data.id.should.be.equal(sellerId);
            done();
          }
        });
      }
    });
  });

  describe('seller do things', function () {
    it('seller logins', function(done){
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


