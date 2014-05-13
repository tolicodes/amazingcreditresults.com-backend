var request = require('request'),
  should = require('should'),
  port = process.env.PORT || 3000,
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
    if(client.name.familyName){
      client.name.givenName.should.be.a.String;
    }
    if(client.name.familyName){
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
        huntKey=bodyParsed.huntKey;
        done();
      }
    });
  });

  it('creates new client', function(done){
    done();
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
        Array.isArray(bodyParsed.clients).should.be.true;
        bodyParsed.clients.map(verifyClient);
        done();
      }
    });
  });
/*/
  it('get clients by id', function(done){
    request({
      'method':'GET',
      'url':'http://localhost:'+port+'/api/v1/owner/clients/'+clientId,
      'headers': {'huntKey':huntKey}
    }, function(error, response, body){
      if(error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(200);
        var bodyParsed = JSON.parse(body);
        bodyParsed.page.should.be.equal(1);
        Array.isArray(bodyParsed.clients).should.be.true;
        bodyParsed.clients.map(verifyClient);
        done();
      }
    });
  });
//*/
  it('updates client');
  it('sends welcome link')
});
