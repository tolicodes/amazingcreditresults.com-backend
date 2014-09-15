var formatter = require('../../lib/formatter.js')
var ensureRole = require('../../lib/middleware.js').ensureRole;
var returnList = require('../../lib/utilities').returnList;
var _ = require('underscore');

module.exports = exports = function (core) {
  core.app.get('/api/v1/tradelines', ensureRole('buyer'),
    function (request, response) {
    request.model.TradeLine
      .find({'active': true})
      .populate('product')
      .sort('+name')
      .lean()
      .exec(function (error, tradelines) {
        if(error) throw error;

        returnList(
          response,
          _(tradelines)
            .chain()
            .map(formatter.formatTradelineForBuyer.bind(null, request.user))
           // .find()
            .filter(function(t){
              return !t.inCart;
            })
            .value()
        );
      });
  });
};
