var hunt = require('hunt'),
  Hunt = hunt({
//    'hostUrl':'https://dev.amazingcreditresults.com/', //for example
//    'redisUrl':'', //from environment or default values
    'mongoUrl':'mongodb://localhost/amazing',
    'io': {
      'loglevel': 0
    },
    'huntKey':true, //hunt key authorization, just in case
    'disableCsrf': true, //strongly not recommended for production!!!
    'enableMongoose':true,
    'enableMongooseUsers':true,
    'public': __dirname+'/public/',
    'views': __dirname+'/views/',
    'maxWorkers': 2,
    'passport':{
      'local': true, //need for owners to be able to auth. Thats all!
      'signUpByEmail': false,
      'verifyEmail': false,
      'resetPassword': false,
      'sessionExpireAfterSeconds': 5*60, //plan 1.4
//      'apiKeyOutdates': 5*24*60*60*1000 //ttl of api key for buyer to authorize - 5 dayes
      'apiKeyOutdates': 1*24*60*60*1000 //ttl of api key for buyer to authorize - 5 dayes //https://oselot.atlassian.net/browse/ACR-20
    }
  });

Hunt.extendApp(function(core){
//*/
//setting up the css and javascripts to insert into layout
  core.app.locals.css.push({'href': '//yandex.st/bootstrap/3.1.1/css/bootstrap.min.css', 'media': 'screen'});

  core.app.locals.javascripts.push({'url': '//yandex.st/jquery/2.0.3/jquery.min.js'});
  core.app.locals.javascripts.push({'url':'//yandex.st/bootstrap/3.1.1/js/bootstrap.min.js'});
  core.app.locals.javascripts.push({'url':'//cdnjs.cloudflare.com/ajax/libs/knockout/3.1.0/knockout-min.js'});
//  core.app.locals.javascripts.push({'url': '/javascripts/hunt.js'});
//*/
});

//access control middleware
Hunt.extendMiddleware(function(core){
  return function(request, response, next){
//    console.log(request.originalUrl);
    if(request.user){
      next();
    } else {
      if(
          request.originalUrl === '/admin/login' ||
          request.originalUrl === '/admin/login/' || //for express 4.0.0
          /^\/buyer\/welcome\/[a-z]+$/.test(request.originalUrl) ||
          /^\/api\/v1\//.test(request.originalUrl) ||
          request.originalUrl === '/buyer/login' ||
          request.originalUrl === '/buyer/setPassword' ||
//          /^\/swagger\//.test(request.originalUrl) ||
          /^\/auth\//.test(request.originalUrl) ) {
        next();
      } else {
        response.status(200);
        response.render('landing',{'title':'Landing page'});
      }
    }
  };
});

//loading different controllers for buyers
Hunt.extendRoutes(require('./controllers/buyer/login.js'));
Hunt.extendRoutes(require('./controllers/buyer/landing.js'));

//loading different controllers for owners
Hunt.extendRoutes(require('./controllers/owner/login.js'));
Hunt.extendRoutes(require('./controllers/owner/editClients.js'));

//loading controller shared by owners and buyers
Hunt.extendRoutes(require('./controllers/shared.js'));


Hunt.extendRoutes(function(core){
  core.app.get('/testError', function(request,response){
    throw new Error('Test error!');
  });
});

Hunt.extendMiddleware(function(core){
  return function(error,request,response,next){
    response.status(500);
    response.json({'code':500,'Message':'Internal server error','error':error.message, 'stack':error.stack});
  };
});

Hunt.on('start', function(evnt){
//creating test users in development environment!
  if(Hunt.config.env === 'development') {
//    require('./lib/populateDatabase.js')(Hunt); //uncomment to repopulate database on every start
  }

  var welcomeLinkGenerator = require('./lib/welcome.js');
  console.log('Testing welcome link generator:');
  console.log(welcomeLinkGenerator());
  console.log(welcomeLinkGenerator());
  console.log(welcomeLinkGenerator());
});

//Hunt.on('httpSuccess', console.log);
//Hunt.on('httpError', console.error);

//starting
if(Hunt.config.env === 'development'){
  Hunt.startWebServer();
} else {
  Hunt.startWebCluster();
}

