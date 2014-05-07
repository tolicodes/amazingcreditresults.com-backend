var hunt = require('hunt'),
  Hunt = hunt({
//    'hostUrl':'https://dev.amazingcreditresults.com/', //for example
//    'redisUrl':'', //from environment or default values
    'mongoUrl':'mongodb://localhost/amazing',
    'io': {
      'loglevel': 0
    },
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
      'apiKeyOutdates': 5*24*60*60*1000 //ttl of api key for buyer to authorize - 5 dayes
    }
  });

Hunt.extendApp(function(core){
/*/
//setting up the css and javascripts to insert into layout
  core.app.locals.css.push({'href': '//yandex.st/bootstrap/3.1.1/css/bootstrap.min.css', 'media': 'screen'});

  core.app.locals.javascripts.push({'url': '//yandex.st/jquery/2.0.3/jquery.min.js'});
  core.app.locals.javascripts.push({'url':'//yandex.st/bootstrap/3.1.1/js/bootstrap.min.js'});
  core.app.locals.javascripts.push({'url':'//cdnjs.cloudflare.com/ajax/libs/knockout/3.1.0/knockout-min.js'});
  core.app.locals.javascripts.push({'url': '/javascripts/hunt.js'});
//*/
});

//*/
//access control middleware
Hunt.extendMiddleware(function(core){
  return function(request, response, next){
    if(request.user){
      next();
    } else {
      if(request.originalUrl === '/admin/login' ||
          /^\/buyer\/welcome\/[0-9a-f]+$/.test(request.originalUrl) ||
          /^\/auth\//.test(request.originalUrl) ) {
        next();
      } else {
        response.status(200);
        response.render('landing');
      }
    }
  };
});
/*/
//access control for /admin/ path - this is only accessible by users
//that are owners/staff - they had `root:true` in profile
Hunt.extendMiddleware(function(request, response, next){
  return function(request, response, next){
    if(/^\/admin\//.test(request.originalUrl)) {
      if(request.originalUrl === '/admin/login'){
        next();
      } else {
        if(request.user && request.user.root === true){
          next();
        } else {
          response.send(403);
        }
      }
    } else {
      next();
    }
  }
});
//*/

//loading different controllers for byuers
Hunt.extendRoutes(require('./controllers/buyer/login.js'));
Hunt.extendRoutes(require('./controllers/buyer/landing.js'));

//loading different controllers for owners
Hunt.extendRoutes(require('./controllers/owner/login.js'));
Hunt.extendRoutes(require('./controllers/owner/editClients.js'));


Hunt.on('start', function(evnt){
//creating test users in development environment!
  if(Hunt.config.env === 'development') {
    //require('./lib/populateDatabase.js')(Hunt);
  }
});

Hunt.on('httpSuccess', console.log);

//starting
if(Hunt.config.env === 'development'){
  Hunt.startWebServer();
} else {
  Hunt.startWebCluster();
}
