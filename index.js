var Hunt = require('hunt'),
  hrw = require('hunt-mongoose-rest'),
  e = process.env,
  hunt = Hunt({
    'hostUrl': e.ACR_HOST, //for example
    'redisUrl': e.ACR_REDIS_URL || 'redis://localhost:6379',
    'mongoUrl': e.ACR_MONGO_URL || 'mongodb://localhost/amazing',
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
      'sessionExpireAfterSeconds': 500 * 60, //plan 1.4
      'apiKeyOutdates': 60 * 60 * 1000 //ttl of api key for buyer to authorize - 1 day //https://oselot.atlassian.net/browse/ACR-20
    },
    'getProveApiKey': e.ACR_PROVE_KEY,
    'areYouAHuman': {
      'publisherKey': e.ACR_AREYOUHUMAN_PUBLISHER_KEY,
      'scoringKey': e.ACR_AREYOUHUMAN_SCORING_KEY
    },
    'echoSign': {
      'auth': {
        'userCredentials': {
          'email': e.ACR_ECHOSIGN_EMAIL,
          'password': e.ECHOSIGN_PASSWORD,
          'apiKey': e.ACR_ECHOSIGN_APIKEY
        },
        'applicationCredentials': {
          'applicationSecret': e.ACR_ECHOSIGN_APPLICATION_ID,
          'applicationId': e.ACR_ECHOSIGN_APPLICATION_SECRET
        }
      }
    },
    'evs': {
      'username': e.ACR_EVS_EMAIL,
      'password': e.ACR_EVS_PASSWORD
    },
    'emailConfig': e.ACR_AMAZON_USE_SES ? {
      host: 'email-smtp.us-east-1.amazonaws.com',
      port: 587,
      name: e.ACR_HOST,
      fromEmailAddr: e.ACR_AMAZON_SES_SMTP_FROM,

      auth: {
        user: e.ACR_AMAZON_SES_SMTP_USERNAME,
        pass: e.ACR_AMAZON_SES_SMTP_PASSWORD
      }
    } : false
  });

//loading models
hunt.extendModel('Product', require('./models/Product.model.js'));
hunt.extendModel('TradeLine', require('./models/TradeLine.model.js'));
hunt.extendModel('TradeLineChange', require('./models/TradeLineChange.model.js'));
hunt.extendModel('Transaction', require('./models/Transaction.model.js'));
hunt.extendModel('Facade', require('./models/Facade.model.js'));

hunt.extendApp(function(core) {
  //*/
  //setting up the css and javascripts to insert into layout
  core.app.locals.css.push({
    'href': '//yandex.st/bootstrap/3.1.1/css/bootstrap.min.css',
    'media': 'screen'
  });

  core.app.locals.javascripts.push({
    'url': '//yandex.st/jquery/2.0.3/jquery.min.js'
  });
  core.app.locals.javascripts.push({
    'url': '//yandex.st/bootstrap/3.1.1/js/bootstrap.min.js'
  });
  core.app.locals.javascripts.push({
    'url': '//cdnjs.cloudflare.com/ajax/libs/knockout/3.1.0/knockout-min.js'
  });
  //*/
});

//perform ban for users being banned
hunt.extendMiddleware(function(core) {
  return function(request, response, next) {
    if (request.user && request.user.isBanned) {
      response.status(403);
      response.json({
        'status': 'Error',
        'errors': [{
          'code': 403,
          'message': ((request.user.roles && request.user.roles.owner) ? 'Access denied! your account has been deactivated!' : 'Access denied! You user account is banned!')
        }]
      });
    } else {
      next();
    }
  };
});

//loading different controllers for buyers
hunt.extendRoutes(require('./controllers/buyer/login.js'));
hunt.extendRoutes(require('./controllers/buyer/questionnaire.js'));
hunt.extendRoutes(require('./controllers/buyer/verifications/echosign.js'));
hunt.extendRoutes(require('./controllers/buyer/verifications/getprove.js'));
hunt.extendRoutes(require('./controllers/buyer/verifications/called.in.js'));
hunt.extendRoutes(require('./controllers/buyer/verifications/areyouahuman.js'));
hunt.extendRoutes(require('./controllers/buyer/verifications/evs.js'));

//loading controller for inventory table
hunt.extendRoutes(require('./controllers/buyer/tradelines.js'));

//loading controller for cart
hunt.extendRoutes(require('./controllers/buyer/cart.js'));
hunt.extendRoutes(require('./controllers/buyer/checkout.js'));

//loading different controllers for owners
hunt.extendRoutes(require('./controllers/owner/login.js'));
hunt.extendRoutes(require('./controllers/owner/editOwners.js'));
hunt.extendRoutes(require('./controllers/owner/editClients.js'));
hunt.extendRoutes(require('./controllers/owner/editProducts.js'));
hunt.extendRoutes(require('./controllers/owner/editAllTradelines.js'));
hunt.extendRoutes(require('./controllers/owner/bulkImport.js'));

//loading different controllers for sellers
hunt.extendRoutes(require('./controllers/seller/listProducts.js'));
hunt.extendRoutes(require('./controllers/seller/editMyTradelines.js'));

//loading controller shared by all users
hunt.extendRoutes(require('./controllers/shared.js'));

//processing payment notifications from stripe
hunt.extendRoutes(require('./controllers/stripe/webhooks.js'));

//RESTfull api via HRW

hrw(hunt, {
  'modelName': 'Product',
  'mountPoint': '/api/v2/products'
});


//Development route to test error catcher middleware
if (hunt.config.env === 'development') {
  hunt.extendRoutes(function(core) {
    core.app.get('/testError', function(request, response) {
      throw new Error('Test error!');
    });
  });
}

hunt.extendRoutes(function(core) {
  core.app.all('*', function(request, response) {
    response.status(404);
    response.json({
      'status': 'Error',
      'errors': [{
        'code': 404,
        'message': 'This API endpoint do not exists!'
      }]
    });
  });
});

//JSON error reporter middleware.
//https://oselot.atlassian.net/browse/ACR-105
hunt.extendRoutes(function(core) {
  core.app.use(function(error, request, response, next) {
    //http://mongoosejs.com/docs/validation.html
    //    if (core.config.env === 'development') {
    console.log('============================================');
    console.error(error);
    console.error(error.stack);
    console.log('============================================');

    //    }

    if (error.code === 11000) {
      response.status(400);
      response.json({
        'status': 'Error',
        'errors': [{
          'code': 400,
          'message': 'Duplicate entry!'
        }]
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
      'errors': [{
        'code': 500,
        'message': error.message
      }]
    });

  });
});

hunt.once('start', function(evnt) {
  //populating database with test data in development environment!
  if (hunt.config.env === 'development') {
    require('./lib/populateDatabase.js')(hunt); //uncomment to repopulate database on every start
  }

  //testing amazon SES
  //hunt.sendEmail('toli@oselot.com','SES works','YO!', console.error);

});


//Some sort of logging. npm module of `forever` can output this all to files.

//hunt.on('httpSuccess', console.log);
//hunt.on('httpError', console.error);

//starting
if (module.parent) {
  //https://oselot.atlassian.net/browse/ACR-255
  module.exports = exports = hunt;
} else {
  if (hunt.config.env === 'development') {
    hunt.startWebServer();
  } else {
    hunt.startWebCluster();
  }
}