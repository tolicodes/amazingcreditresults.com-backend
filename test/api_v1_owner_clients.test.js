var request = require('request'),
  url = require('url'),
  should = require('should'),
  port = process.env.PORT || 3000,
  testId = Math.floor(Math.random()*10000),
  huntKey,
  clientId;

function verifyClient(client){
    client.id.should.be.a.String;
    client.id.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
    client.email.should.be.a.String;
    client.name.should.be.an.Object;
    if(client.name.familyName){
      client.name.familyName.should.be.a.String;
    }
    if(client.name.givenName){
      client.name.givenName.should.be.a.String;
    }
    if(client.name.middleName){
      client.name.middleName.should.be.a.String;
    }
    client.gravatar.should.be.a.String;
    client.gravatar30.should.be.a.String;
    client.gravatar50.should.be.a.String;
    client.gravatar80.should.be.a.String;
    client.gravatar100.should.be.a.String;
    client.root.should.be.Boolean;
    client.accountVerified.should.be.a.Boolean;
    if(client.needQuestionnaire){
      //client.needQuestionnaire.should.be.true; //strange?
    }
    client.telefone.should.be.a.String;
    client.localAddress.should.be.a.String;
    client.title.should.be.a.String
};

describe('/api/v1/owner/clients API resource test', function(){
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
        huntKey = bodyParsed.huntKey;
        done();
      }
    });
  });

  it('creates new client', function(done){
    request({
      'method':'POST',
      'url':'http://localhost:'+port+'/api/v1/admin/clients',
      'headers': {'huntKey':huntKey},
      'form':{
        'email': 'unitTestUser'+testId+'@mail.ru',
        'givenName': 'John'+testId,
        'middleName': 'Teodor'+testId,
        'familyName': 'Doe'+testId,
        'needQuestionnaire': true,
        'telefone': '555-339'+testId,
        'localAddress': 'Some Address',
        'title': 'Mr.'
      }
    }, function(error, response, body){
      if(error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(201);
        var bodyParsed = JSON.parse(body);
        bodyParsed.id.should.be.a.String;
        bodyParsed.id.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);

        clientId = bodyParsed.id;

        bodyParsed.email.should.be.equal('unitTestUser'+testId+'@mail.ru');
        bodyParsed.name.givenName.should.be.equal('John'+testId);
        bodyParsed.name.middleName.should.be.equal('Teodor'+testId);
        bodyParsed.name.familyName.should.be.equal('Doe'+testId);
        bodyParsed.title.should.be.equal('Mr.');
        bodyParsed.telefone.should.be.equal('555-339'+testId);
        bodyParsed.localAddress.should.be.equal('Some Address');
        bodyParsed.email.should.be.equal('unitTestUser'+testId+'@mail.ru');
        bodyParsed.root.should.be.a.false;
//and we can get this client
        request({
          'method':'GET',
          'url':'http://localhost:'+port+'/api/v1/admin/clients/'+clientId,
          'headers': {'huntKey':huntKey}
        }, function(error, response, body){
          if(error) {
            done(error);
          } else {
            response.statusCode.should.be.equal(200);
            var bodyParsed = JSON.parse(body);
            verifyClient(bodyParsed.data);
            done();
          }
        });
      }
    });
  });

  it('get recently created client by id', function(done){
    request({
      'method':'GET',
      'url':'http://localhost:'+port+'/api/v1/admin/clients/'+clientId,
      'headers': {'huntKey':huntKey}
    }, function(error, response, body){
      if(error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(200);
        var bodyParsed = JSON.parse(body);
        verifyClient(bodyParsed.data);
        done();
      }
    });
  });

  it('lists all clients', function(done){
    request({
      'method':'GET',
      'url':'http://localhost:'+port+'/api/v1/admin/clients',
      'headers': {'huntKey':huntKey}
    }, function(error, response, body){
      if(error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(200);
        var bodyParsed = JSON.parse(body);
        bodyParsed.page.should.be.equal(1);
        Array.isArray(bodyParsed.data).should.be.true;
        bodyParsed.data.map(verifyClient);
        done();
      }
    });
  });

  describe('owners updates client partialy', function(){
    it('PUT request works', function(done){
      request({
        'method':'PUT',
        'url':'http://localhost:'+port+'/api/v1/admin/clients/'+clientId,
        'form':{
          'localAddress':'City #'+clientId
        },
        'headers': {'huntKey':huntKey}
      }, function(error, response, body){
        if(error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(202);
          var bodyParsed = JSON.parse(body);
          verifyClient(bodyParsed);
          bodyParsed.localAddress.should.be.equal('City #'+clientId);
          done();
        }
      });
    });

    it('client is actually updated', function(done){
      request({
        'method':'GET',
        'url':'http://localhost:'+port+'/api/v1/admin/clients/'+clientId,
        'headers': {'huntKey':huntKey}
      }, function(error, response, body){
        if(error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          var bodyParsed = JSON.parse(body);
          verifyClient(bodyParsed.data);
          bodyParsed.data.localAddress.should.be.equal('City #'+clientId);
          done();
        }
      });
    });
  });

  describe('owners updates client fully', function(){
    it('PUT request works', function(done){
      request({
        'method':'PUT',
        'url':'http://localhost:'+port+'/api/v1/admin/clients/'+clientId,
        'form':{
          'localAddress':'new_City #'+testId,
          'email': 'new_unitTestUser'+testId+'@mail.ru',
          'givenName': 'new_John'+testId,
          'middleName': 'new_Teodor'+testId,
          'familyName': 'new_Doe'+testId,
          'needQuestionnaire': true,
          'telefone': '555-339'+testId,
          'title': 'Mr.'
        },
        'headers': {'huntKey':huntKey}
      }, function(error, response, body){
        if(error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(202);
          var bodyParsed = JSON.parse(body);
          verifyClient(bodyParsed);
          bodyParsed.localAddress.should.be.equal('new_City #'+testId);
          bodyParsed.email.should.be.equal('new_unitTestUser'+testId+'@mail.ru');
          bodyParsed.name.givenName.should.be.equal('new_John'+testId);
          bodyParsed.name.middleName.should.be.equal('new_Teodor'+testId);
          bodyParsed.name.familyName.should.be.equal('new_Doe'+testId);
          bodyParsed.telefone.should.be.equal('555-339'+testId);
          bodyParsed.title.should.be.equal('Mr.');
          done();
        }
      });
    });

    it('client is actually updated', function(done){
      request({
        'method':'GET',
        'url':'http://localhost:'+port+'/api/v1/admin/clients/'+clientId,
        'headers': {'huntKey':huntKey}
      }, function(error, response, body){
        if(error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          var bodyParsed = JSON.parse(body);
          verifyClient(bodyParsed.data);
          bodyParsed.data.localAddress.should.be.equal('new_City #'+testId);
          bodyParsed.data.email.should.be.equal('new_unitTestUser'+testId+'@mail.ru');
          bodyParsed.data.name.givenName.should.be.equal('new_John'+testId);
          bodyParsed.data.name.middleName.should.be.equal('new_Teodor'+testId);
          bodyParsed.data.name.familyName.should.be.equal('new_Doe'+testId);
          bodyParsed.data.telefone.should.be.equal('555-339'+testId);
          bodyParsed.data.title.should.be.equal('Mr.');
          done();
        }
      });
    });
  });

  it('sends welcome link', function(done){
    request({
      'method':'POST',
      'url':'http://localhost:'+port+'/api/v1/admin/clients/welcome/'+clientId,
      'form':{ },
      'headers': {'huntKey':huntKey}
    }, function(error, response, body){
      if(error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(202);
        var bodyParsed = JSON.parse(body);
        bodyParsed.message.should.be.equal('sent');
        var params = url.parse(bodyParsed.welcomeLink);
        ['http:','https:'].should.include(params.protocol);
//        params.pathname.should.match(/^\/buyer\/welcome\/[a-z]+$/);
        params.pathname.should.be.equal('/');
        params.hash.should.match(/^\#login\/[a-z]+$/);
        bodyParsed.user.id.should.be.equal(clientId);
        done();
      }
    });
  });

  it('sends password reset link', function(done){
    request({
      'method':'POST',
      'url':'http://localhost:'+port+'/api/v1/admin/clients/resetPassword/'+clientId,
      'form':{ },
      'headers': {'huntKey':huntKey}
    }, function(error, response, body){
      if(error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(202);
        var bodyParsed = JSON.parse(body);
        bodyParsed.message.should.be.equal('sent');
        var params = url.parse(bodyParsed.welcomeLink);
        ['http:','https:'].should.include(params.protocol);
        params.pathname.should.be.equal('/');
        params.hash.should.match(/^\#login\/[a-z]+$/);
        bodyParsed.user.id.should.be.equal(clientId);
        done();
      }
    });
  });
});
