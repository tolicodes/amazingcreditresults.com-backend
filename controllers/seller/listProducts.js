//https://oselot.atlassian.net/browse/ACR-214
var ensureSellerOrOwner = require('./../../lib/middleware.js').ensureSellerOrOwner;

module.exports = exports = function (core) {

  function formatProduct(product) {
    return product;
  }

  core.app.get('/api/v1/seller/products', ensureSellerOrOwner, function (request, response) {
    request.model.Product.find({
      //todo - add some search parameters later
    })
      .limit(100)
      .skip()
      .sort('+name')
      .exec(function (error, productsFound) {
        if (error) {
          throw error;
        } else {
          response.json({
            'metaData': {
              'totalPages': 1,
              'page': 1
            },
            'data': productsFound.map(formatProduct)
          });
        }
      });
  });

};