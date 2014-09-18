var ensureRole = require('./../../lib/middleware.js').ensureRole;
var utilities = require('../../lib/utilities');
var _ = require('underscore');

var fields = [
  'product', 'seller', 'totalAus', 'currentAus', 
  'statementDate', 'dateOpen', 'creditLimit',
  'currentBalance', 'cost', 'price', 'balance', 'notes', 'tier', 'active'
];

var editableFields = _(fields).chain().clone().without('product', 'seller').value();

module.exports = exports = function(core) {
  core.app.get('/api/v1/owner/tradelines', ensureRole('owner'), function(req, res) {
    utilities.throwError = utilities.throwError.bind(utilities, res);

    req.model.TradeLine
      .find(utilities.createModel(req.query, fields))
      .skip(req.query.skip || 0)
      .limit(req.query.limit || 10000)
      .sort('+_id')
      .populate('product')
      .exec().then(function(obj) {
        utilities.returnList(res, obj);
      }, utilities.throwError);
  });

  core.app.get('/api/v1/owner/tradelines/:id', ensureRole('role'), function(req, res) {
    utilities.throwError = utilities.throwError.bind(utilities, res);

    req.model.TradeLine
      .findById(req.params.id)
      .populate('product')
      .exec().then(function (obj) {
        if(!obj) {
          return utilities.error(404, 'Tradeline not found', res);
        }
        
        res.json(utilities.pickFields(fields, data));
      }, utilities.throwError);
  });

  core.app.post('/api/v1/owner/tradelines', ensureRole('owner'), function(req, res) {
    utilities.throwError = utilities.throwError.bind(utilities, res);

    req.model.TradeLine
      .create(utilities.createModel(req.body, fields))
      .then(function (obj) {
        res.status(201).json(utilities.pickFields(fields, obj));
      }, utilities.throwError);
  });

  core.app.put('/api/v1/owner/tradelines/:id', ensureRole('owner'), function(req, res) {
    utilities.throwError = utilities.throwError.bind(utilities, res);
    
    req.model.TradeLine
      .update(
        {_id: req.params.id}, 
        utilities.createModel(req.body, editableFields, {})
      )
      .exec().then(function (affected) {
        if(!affected) {
          return utilities.error(404, 'Tradeline not found', res);
        }
        
        res.status(202).json(utilities.pickFields(fields, req.body));
      }, utilities.throwError);
  });

  core.app.delete('/api/v1/owner/tradelines/:id', ensureRole('owner'), function(req, res) {
    utilities.throwError = utilities.throwError.bind(utilities, res);

    req.model.TradeLine
     .findById(req.params.id)
      .exec()
      .then(function(obj){
        if(!obj) {
          return utilities.error(404, 'Tradeline not found', res);
        }

        req.model.TradeLine
          .remove({'_id': req.params.id})
          .exec()
          .then(function(){
            res.status(202).json({});
          }, utilities.throwError);
      }, utilities.throwError);
  });
};