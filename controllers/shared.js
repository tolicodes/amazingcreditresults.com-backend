//GET request to get current authorized users parameters in form of json
module.exports = exports = function (core) {
  function f4myself(request, response) {
    if (request.user) {
      var user = request.user;
      response.json({
        "id": user.id,
        "huntKey": user.apiKey,//used for sessionless authorization
        "email": user.email,
        "name": {
          "familyName": user.name.familyName, //http://schema.org/familyName
          "givenName": user.name.givenName, //http://schema.org/givenName
          "middleName": user.name.middleName //http://schema.org/middleName - at least the google oauth has this structure!
        },
        "gravatar": user.gravatar,
        "gravatar30": user.gravatar30,
        "gravatar50": user.gravatar50,
        "gravatar80": user.gravatar80,
        "gravatar100": user.gravatar100,
        "online": user.online,
        "root": user.root,
        "accountVerified": user.accountVerified,
        "telefone": user.profile ? user.profile.telefone : '',
        "localAddress": user.profile ? user.profile.localAddress : ''
      });
    } else {
      response.status(400);
      response.json({'error': 'Authorization required!'})
    }
  }

  core.app.get('/api/v1/myself', f4myself);
  core.app.get('/auth/myself', f4myself);
};
