var request = require('request'),
  should = require('should'),
  port = process.env.PORT || 3000,
  huntKeys = [];

describe('/api/v1/owner/login API endpoint test', function(){
  it('returns 200 && `huntKey` for correct password via application/x-www-form-urlencoded', function(done){
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
        huntKeys.push(bodyParsed.huntKey);
        done();
      }
    });
  });

  it('returns 200 && `huntKey` for correct password via application/json', function(done){
    request({
      'method':'POST',
      'url':'http://localhost:'+port+'/api/v1/owner/login',
      'json' : {
        'username':'owner@example.org',
        'password':'test123'
      }
    }, function(error, response, body){
      if(error) {
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

  it('returned the good huntKeys', function(){
    Array.isArray(huntKeys).should.be.true;
    huntKeys.length.should.be.equal(2);
    huntKeys[0].should.be.equal(huntKeys[1]);
  });

  it('returns 403 && message for wrong password', function(done){
    request({
      'method':'POST',
      'url':'http://localhost:'+port+'/api/v1/owner/login',
      'json' : {
        'username':'owner@example.org',
        'password':'someWrongPassword'
      }
    }, function(error, response, body){
      if(error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(403);
        var bodyParsed = body;
        bodyParsed.Code.should.be.equal(403);
        bodyParsed.Error.should.be.equal('Unable to authorize Owner with this credentials!');
        should.not.exist(bodyParsed.huntKey);
        done();
      }
    });
  });

    it('returns 400 && message for absent username or password', function(done){
    request({
      'method':'POST',
      'url':'http://localhost:'+port+'/api/v1/owner/login',
      'json' : {
        'notAusername':'owner@example.org',
        'notAPassword':'someWrongPassword'
      }
    }, function(error, response, body){
      if(error) {
        done(error);
      } else {
        response.statusCode.should.be.equal(400);
        var bodyParsed = body;
        bodyParsed.Code.should.be.equal(400);
        bodyParsed.Error.should.be.equal('The values of `username` or `password` are not provided!');
        should.not.exist(bodyParsed.huntKey);
        done();
      }
    });
  });
});

function testingCallback(error, response, body, done){
  if(error) {
    done(error);
  } else {
    response.statusCode.should.be.equal(200);
    var bodyParsed = JSON.parse(body);
    bodyParsed.id.should.be.a.String;
    bodyParsed.id.should.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i);
    bodyParsed.huntKey.should.be.equal(huntKeys[0]);
    bodyParsed.email.should.be.a.equal('owner@example.org');
    bodyParsed.root.should.be.true;
    bodyParsed.profile.should.be.an.Object;
    bodyParsed.profile.needQuestionnaire.should.exist;
    bodyParsed.gravatar.should.be.a.equal('https://secure.gravatar.com/avatar/b5fca0fa34000c908d46313ed1d737e0.jpg?s=80&d=wavatar&r=g');
    bodyParsed.gravatar30.should.be.a.equal('https://secure.gravatar.com/avatar/b5fca0fa34000c908d46313ed1d737e0.jpg?s=30&d=wavatar&r=g');
    bodyParsed.gravatar50.should.be.a.equal('https://secure.gravatar.com/avatar/b5fca0fa34000c908d46313ed1d737e0.jpg?s=50&d=wavatar&r=g');
    bodyParsed.gravatar80.should.be.a.equal('https://secure.gravatar.com/avatar/b5fca0fa34000c908d46313ed1d737e0.jpg?s=80&d=wavatar&r=g');
    bodyParsed.gravatar100.should.be.a.equal('https://secure.gravatar.com/avatar/b5fca0fa34000c908d46313ed1d737e0.jpg?s=100&d=wavatar&r=g');
    done();
  }
}

describe('/api/v1/myself works for owner', function(){
  it('works with `huntKey` as `GET` parameter', function(done){
    request({
      'method':'GET',
      'url':'http://localhost:'+port+'/api/v1/myself?huntKey='+huntKeys[0],
    }, function(error, response, body){
        testingCallback(error, response, body, done);
    });
  });
  it('works with `huntKey` as `POST` parameter', function(done){
    request({
      'method':'POST',
      'url':'http://localhost:'+port+'/api/v1/myself',
      'form': {'huntKey':huntKeys[0]}
    }, function(error, response, body){
        testingCallback(error, response, body, done);
    });
  });

  it('works with `huntKey` as custom header for GET response', function(done){
    request({
      'method':'GET',
      'url':'http://localhost:'+port+'/api/v1/myself',
      'headers': {'huntKey':huntKeys[0]}
    }, function(error, response, body){
        testingCallback(error, response, body, done);
    });
  });

  it('works with `huntKey` as custom header for POST response', function(done){
    request({
      'method':'POST',
      'url':'http://localhost:'+port+'/api/v1/myself',
      'headers': {'huntKey':huntKeys[0]}
    }, function(error, response, body){
        testingCallback(error, response, body, done);
    });
  });

  it('works with `huntKey` as custom header for PUT response', function(done){
    request({
      'method':'PUT',
      'url':'http://localhost:'+port+'/api/v1/myself',
      'headers': {'huntKey':huntKeys[0]}
    }, function(error, response, body){
      testingCallback(error, response, body, done);
    });
  });

  it('works with `huntKey` as custom header for DELETE response', function(done){
    request({
      'method':'DELETE',
      'url':'http://localhost:'+port+'/api/v1/myself',
      'headers': {'huntKey':huntKeys[0]}
    }, function(error, response, body){
      testingCallback(error, response, body, done);
    });
  });

  it('works with `huntKey` as custom header for PUT response', function(done){
    request({
      'method':'PUT',
      'url':'http://localhost:'+port+'/api/v1/myself',
      'headers': {'huntKey':huntKeys[0]}
    }, function(error, response, body){
        testingCallback(error, response, body, done);
    });
  });

  it('works with `huntKey` as custom header for DELETE response', function(done){
    request({
      'method':'DELETE',
      'url':'http://localhost:'+port+'/api/v1/myself',
      'headers': {'huntKey':huntKeys[0]}
    }, function(error, response, body){
        testingCallback(error, response, body, done);
    });
  });

});
