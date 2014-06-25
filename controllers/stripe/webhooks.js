var stripe = require('stripe')(process.env.STRIPE_API_KEY || 'sk_test_BQokikJOvBiI2HlWgH4olfQ2');


module.exports = exports = function (core) {
  core.app.get('/stripewebhooks', function (request, response) {
  //todo - change /stripewebhooks to something much more unpredictable
  //like - /papytraxaetsobakatakemuinado
    console.info(request.body);
    response.send(200);
  });
};