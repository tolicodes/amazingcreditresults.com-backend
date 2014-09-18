var stripe = require('stripe')();

module.exports = exports = function (core) {
  core.app.post('/stripewebhooks', function (request, response) {
  //todo - change /stripewebhooks to something much more unpredictable
  //like - /papytraxaetsobakatakemuinado
    console.info(request.body);
    response.send(200);
  });
};