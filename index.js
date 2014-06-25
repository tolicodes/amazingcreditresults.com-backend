var hunt = require('hunt'),
  Hunt = hunt({
//    'hostUrl':'https://dev.amazingcreditresults.com/', //for example
    'redisUrl': process.env.AMAZING_REDIS_URL || 'redis://localhost:6379',
    'mongoUrl': process.env.AMAZING_MONGO_URL || 'mongodb://localhost/amazing',
    'io': false,
    'huntKey': true,
    'disableCsrf': true, //strongly not recommended for production!!!
    'enableMongoose': true,
    'enableMongooseUsers': true,
    'public': __dirname + '/public/',
    'views': __dirname + '/views/',
    'maxWorkers': 2, //for production use - 1 per CPU core
    'passport': {
      'local': false,
      'signUpByEmail': false,
      'verifyEmail': false,
      'resetPassword': false,
      'sessionExpireAfterSeconds': 5 * 60, //plan 1.4
//      'apiKeyOutdates': 5*24*60*60*1000 //ttl of api key for buyer to authorize - 5 dayes
      'apiKeyOutdates': 24 * 60 * 60 * 1000 //ttl of api key for buyer to authorize - 1 day //https://oselot.atlassian.net/browse/ACR-20
    },
    'emailConfig': process.env.AMAZING_AMAZON_USE_SES ? {
      host: 'email-smtp.us-east-1.amazonaws.com',
      port: 587,
      name: 'dev.amazingcreditresults.com',//'54.86.168.135',
      fromEmailAddr: process.env.AMAZING_AMAZON_SES_SMTP_FROM || 'anatolij@oselot.com',
      auth: {
        user: process.env.AMAZING_AMAZON_SES_SMTP_USERNAME || 'AKIAJ2ZQ6HBUVUQCRUIQ',
        pass: process.env.AMAZING_AMAZON_SES_SMTP_PASSWORD || 'AuJw3HgKNWp+vpERHTnBmbl7LmPe7GXZfJnj4zK0zQKm'
      }
    } : false
  });

//loading models
Hunt.extendModel('Product', require('./models/Product.model.js'));
Hunt.extendModel('TradeLine', require('./models/TradeLine.model.js'));
Hunt.extendModel('TradeLineChange', require('./models/TradeLineChange.model.js'));
Hunt.extendModel('TradeLineChange', require('./models/Transaction.model.js'));
Hunt.extendModel('Facade', require('./models/Facade.model.js'));

Hunt.extendApp(function (core) {
//*/
//setting up the css and javascripts to insert into layout
  core.app.locals.css.push({'href': '//yandex.st/bootstrap/3.1.1/css/bootstrap.min.css', 'media': 'screen'});

  core.app.locals.javascripts.push({'url': '//yandex.st/jquery/2.0.3/jquery.min.js'});
  core.app.locals.javascripts.push({'url': '//yandex.st/bootstrap/3.1.1/js/bootstrap.min.js'});
  core.app.locals.javascripts.push({'url': '//cdnjs.cloudflare.com/ajax/libs/knockout/3.1.0/knockout-min.js'});
//*/
});

//perform ban for users being banned
Hunt.extendMiddleware(function (core) {
  return function (request, response, next) {
    if (request.user && request.user.isBanned) {
      response.status(403);
      response.json({
        'status': 'Error',
        'errors': [
          {
            'code': 403,
            'message': 'Access denied! You user account is banned!'
          }
        ]
      });
    } else {
      next();
    }
  };
});

//loading different controllers for buyers
Hunt.extendRoutes(require('./controllers/buyer/login.js'));
Hunt.extendRoutes(require('./controllers/buyer/questionnaire.js'));
//loading controller for inventory table
Hunt.extendRoutes(require('./controllers/buyer/tradelines.js'));
//loading controller for cart
Hunt.extendRoutes(require('./controllers/buyer/cart.js'));

//loading different controllers for owners
Hunt.extendRoutes(require('./controllers/owner/login.js'));
Hunt.extendRoutes(require('./controllers/owner/editOwners.js'));
Hunt.extendRoutes(require('./controllers/owner/editClients.js'));
Hunt.extendRoutes(require('./controllers/owner/editProducts.js'));
Hunt.extendRoutes(require('./controllers/owner/editAllTradelines.js'));
Hunt.extendRoutes(require('./controllers/owner/bulkImport.js'));

//loading different controllers for sellers
Hunt.extendRoutes(require('./controllers/seller/listProducts.js'));
Hunt.extendRoutes(require('./controllers/seller/editMyTradelines.js'));

//loading controller shared by all users
Hunt.extendRoutes(require('./controllers/shared.js'));

//processing payment notifications from stripe
Hunt.extendRoutes(require('./controllers/stripe/webhooks.js'));

//Development route to test error catcher middleware
if (Hunt.config.env === 'development') {
  Hunt.extendRoutes(function (core) {
    core.app.get('/testError', function (request, response) {
      throw new Error('Test error!');
    });
  });
}

Hunt.extendRoutes(function (core) {
  core.app.all('*', function (request, response) {
    response.status(404);
    response.json({
      'status': 'Error',
      'errors': [
        {
          'code': 404,
          'message': 'This API endpoint do not exists!'
        }
      ]
    });
  });
});

//JSON error reporter middleware.
//https://oselot.atlassian.net/browse/ACR-105
Hunt.extendRoutes(function (core) {
  core.app.use(function (error, request, response, next) {
//http://mongoosejs.com/docs/validation.html
    if (core.config.env === 'development') {
      console.error(error);
      console.error(error.stack);
    }

    if (error.code === 11000) {
      response.status(400);
      response.json({
        'status': 'Error',
        'errors': [
          {
            'code': 400,
            'message': 'Duplicate entry!'
          }
        ]
      });
      return;
    }
    if (error.name === 'ValidationError') {
      response.status(400);
      var errs = [];
      for (var x in error.errors) {
        if (error.errors.hasOwnProperty(x)) {
          errs.push({
            'code': 400,
            'message': error.errors[x].message,
            'field': error.errors[x].path,
            'value': error.errors[x].value
          });
        }
      }
      response.json({
        'status': 'Error',
        'errors': errs
      });
      return;
    }


    response.status(500);
    response.json({
      'status': 'Error',
      'errors': [
        {
          'code': 500,
          'message': error.message
        }
      ]
    });

  });
});

Hunt.on('start', function (evnt) {
//populating database with test data in development environment!
  if (Hunt.config.env === 'development') {
    require('./lib/populateDatabase.js')(Hunt); //uncomment to repopulate database on every start
  }
  /*/
   //testing amazon SES
   Hunt.sendEmail('nowak@oselot.com','SES works','YO!', console.error);
   //*/
});


//Some sort of logging. npm module of `forever` can output this all to files.

//Hunt.on('httpSuccess', console.log);
//Hunt.on('httpError', console.error);

//starting
if (module.parent) {
//https://oselot.atlassian.net/browse/ACR-255
  module.exports = exports = Hunt;
} else {
  if (Hunt.config.env === 'development') {
    Hunt.startWebServer();
  } else {
    Hunt.startWebCluster();
  }
}

