var hunt = require('hunt'),
  Hunt = hunt({
//    'hostUrl':'https://dev.amazingcreditresults.com/', //for example
    'redisUrl': process.env.AMAZING_REDIS_URL || 'redis://localhost:6379',
    'mongoUrl': process.env.AMAZING_MONGO_URL || 'mongodb://localhost/amazing',
    'io': {
      'loglevel': 0
    },
    'huntKey': true, //hunt key authorization, just in case
    'disableCsrf': true, //strongly not recommended for production!!!
    'enableMongoose': true,
    'enableMongooseUsers': true,
    'public': __dirname+'/public/',
    'views': __dirname+'/views/',
    'maxWorkers': 2, //for production use - 1 per CPU core
    'passport':{
      'local': true, //need for owners to be able to auth. Thats all!
      'signUpByEmail': false,
      'verifyEmail': false,
      'resetPassword': false,
      'sessionExpireAfterSeconds': 5*60, //plan 1.4
//      'apiKeyOutdates': 5*24*60*60*1000 //ttl of api key for buyer to authorize - 5 dayes
      'apiKeyOutdates': 1*24*60*60*1000 //ttl of api key for buyer to authorize - 1 day //https://oselot.atlassian.net/browse/ACR-20
    },
    'emailConfig' : process.env.AMAZING_AMAZON_USE_SES ? {
      host : 'email-smtp.us-east-1.amazonaws.com',
      port : 587,
      name : 'dev.amazingcreditresults.com',//'54.86.168.135',
      fromEmailAddr : process.env.AMAZING_AMAZON_SES_SMTP_FROM || 'anatolij@oselot.com',
      auth: {
        user: process.env.AMAZING_AMAZON_SES_SMTP_USERNAME || 'AKIAJ2ZQ6HBUVUQCRUIQ',
        pass: process.env.AMAZING_AMAZON_SES_SMTP_PASSWORD || 'AuJw3HgKNWp+vpERHTnBmbl7LmPe7GXZfJnj4zK0zQKm'
      }
    } : false
  });

//loading models
Hunt.extendModel('Product',require('./models/Product.model.js'));
Hunt.extendModel('TradeLine',require('./models/TradeLine.model.js'));
Hunt.extendModel('Facade',require('./models/Facade.model.js'));

Hunt.extendApp(function(core){
//*/
//setting up the css and javascripts to insert into layout
  core.app.locals.css.push({'href': '//yandex.st/bootstrap/3.1.1/css/bootstrap.min.css', 'media': 'screen'});

  core.app.locals.javascripts.push({'url': '//yandex.st/jquery/2.0.3/jquery.min.js'});
  core.app.locals.javascripts.push({'url':'//yandex.st/bootstrap/3.1.1/js/bootstrap.min.js'});
  core.app.locals.javascripts.push({'url':'//cdnjs.cloudflare.com/ajax/libs/knockout/3.1.0/knockout-min.js'});
//*/
});

//access control middleware
Hunt.extendMiddleware(function(core){
  return function(request, response, next){
    if(request.user){
      next();
    } else {
      if(
          /^\/admin\/login/.test(request.originalUrl) ||
          /^\/buyer\/welcome\/[a-z]+$/.test(request.originalUrl) ||
          /^\/api\/v1\//.test(request.originalUrl) ||
          /^\/buyer\/login/.test(request.originalUrl) ||
          /^\/buyer\/setPassword/.test(request.originalUrl) ||
          /^\/testError/.test(request.originalUrl) ||
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
Hunt.extendRoutes(require('./controllers/buyer/questionnaire.js'));

//loading different controllers for owners
Hunt.extendRoutes(require('./controllers/owner/login.js'));
Hunt.extendRoutes(require('./controllers/owner/editClients.js'));

//loading controller shared by owners and buyers
Hunt.extendRoutes(require('./controllers/shared.js'));

//Development route to test error cacther middleware
Hunt.extendRoutes(function(core){
  core.app.get('/testError', function(request,response){
    if(core.config.env === 'development'){
      throw new Error('Test error!');
    } else {
      response.send(404);
    }
  });
});

//JSON error reporter middleware.
//https://oselot.atlassian.net/browse/ACR-105
Hunt.extendMiddleware(function(core){
  return function(error,request,response,next){
    response.status(500);
    response.json({'code':500,'Message':'Internal server error','error':error.message, 'stack':error.stack});
  };
});

Hunt.on('start', function(evnt){
//creating test owner in development environment!
  if(Hunt.config.env === 'development') {
//    require('./lib/populateDatabase.js')(Hunt); //uncomment to repopulate database on every start
  }

  var welcomeLinkGenerator = require('./lib/welcome.js');
  console.log('Testing welcome link generator:');
  console.log(welcomeLinkGenerator());
  console.log(welcomeLinkGenerator());
  console.log(welcomeLinkGenerator());

/*/
//testing amazon SET
  Hunt.sendEmail('anatolij@oselot.com','SES works','YRA!', console.error);
//*/
});

/*/
//Some sort of logging. npm module of `forever` can output this all to files.
Hunt.on('httpSuccess', console.log);
Hunt.on('httpError', console.error);
//*/

//starting
if(Hunt.config.env === 'development'){
  Hunt.startWebServer();
} else {
  Hunt.startWebCluster();
}

