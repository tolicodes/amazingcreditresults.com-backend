var  formatUser = require('./formater.js').formatUserForOwner;

//GET request to get current authorized users parameters in form of json
module.exports = exports = function (core) {
  function f4myself(request, response) {
    if (request.user) {
      response.json(formatUser(request.user));
    } else {
      response.status(400);
      response.json({'Error': 'Authorization required!'});
    }
  }

  core.app.all('/api/v1/myself', f4myself);
  core.app.all('/auth/myself', f4myself); //not used and can be deprecated
};
