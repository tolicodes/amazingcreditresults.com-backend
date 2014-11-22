var ensureRole = require('./../../lib/middleware.js').ensureRole;
var utilities = require('../../lib/utilities');

var fields = ['name', 'bank', 'type', 'notes', 
              'reportsToExperian', 'reportsToEquifax', 
              'reportsToTransunion', 'moRating',
              'ncRating', 'bcRating', 'totalAus',
              'improvingShortCreditHistory',
              'improvingBadCreditScore',
              'improvingMaxedOutCredit'
             ];

module.exports = exports = function (core) {
  core.app.get('/api/v1/owner/products', ensureRole('owner'), function (req, res) {
    utilities.throwError = utilities.throwError.bind(utilities, res);
    req.model.Product
      .find()
      .sort('+name')
      .exec().then(function (data) {
        utilities.returnList(res, data, fields);
      }, utilities.throwError);
  });

  core.app.get('/api/v1/owner/products/:id', ensureRole('owner'), function (req, res) {
    utilities.throwError = utilities.throwError.bind(utilities, res);
    req.model.Product
      .findById(req.params.id)
      .exec().then(function (obj) {
        if(!obj) {
          return utilities.error(404, 'Product not found', res);
        }
        
        res.json(utilities.pickFields(fields, obj));
      }, utilities.throwError);
  });

  core.app.post('/api/v1/owner/products', ensureRole('owner'), function (req, res) {
    utilities.throwError = utilities.throwError.bind(utilities, res);
    req.model.Product
      .create(utilities.createModel(req.body, fields))
      .then(function (obj) {
        res.status(201).json(utilities.pickFields(fields, obj));
      }, utilities.throwError);
  });

  core.app.put('/api/v1/owner/products/:id', ensureRole('owner'), function (req, res) {
    utilities.throwError = utilities.throwError.bind(utilities, res);
    var productModel = 
        utilities.createModel(req.body, fields, {});
    req.model.Product
      .update(
        {_id: req.params.id}, 
        productModel
      )
      .exec().then(function (affected) {
        if(!affected) {
          return utilities.error(404, 'Product not found', res);
        }
        
        productModel['id'] = req.params.id;
        res.status(202).json(productModel);
      }, utilities.throwError);
  });

  core.app.delete('/api/v1/owner/products/:id', ensureRole('owner'), function (req, res) {
    utilities.throwError = utilities.throwError.bind(utilities, res);
    req.model.Product
      .findById(req.params.id)
      .exec()
      .then(function(obj){
        if(!obj) {
          return utilities.error(404, 'Product not found', res);
        }

        req.model.TradeLine
          .count({'product': req.params.id})
          .exec()
          .then(function(count){
            if(count) {
              return utilities.error(400, 'Product with this ID is used by Tradelines!', res)
            }

            req.model.Product
              .remove({'_id': req.params.id})
              .exec()
              .then(function(){
                res.status(202).json({status: 'deleted'});
              }, utilities.throwError);
          }, utilities.throwError)
      }, utilities.throwError);

    return;
  });
};
