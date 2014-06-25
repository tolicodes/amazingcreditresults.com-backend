var stripe = require('stripe')(process.env.STRIPE_API_KEY || 'sk_test_Bq4myUHpyXqVaiZ47u7VrtCY');


module.exports = exports = function (core) {
  core.app.post('/stripewebhooks', function (request, response) {
  //todo - change /stripewebhooks to something much more unpredictable
  //like - /papytraxaetsobakatakemuinado
    console.info(request.body);
    response.send(200);
  });
};