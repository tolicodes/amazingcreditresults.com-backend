//controller for buyer Questionnaire and dashboard
module.exports = exports = function (core) {

//save buyer answers to Questionnaire - we recieve POST, we respond with JSON
  core.app.post('/api/v1/buyer/saveQuestionnaireAnswers', function (request, response) {
    if (request.user) {
      request.user.profile = request.user.profile || {};
      request.user.profile.answer1 = request.body.answer1;
      request.user.profile.answer2 = request.body.answer2;
      request.user.profile.answer3 = request.body.answer3;
      request.user.profile.needQuestionnaire = ((request.body.needQuestionnaire === false) ? false : true);

      request.user.save(function (error, userSaved) {
        if (error) {
          throw error;
        } else {
          response.status(202);
          response.json({
            'id': userSaved.id,
            'email': userSaved.email,
            'name': {
              'givenName': userSaved.name.givenName,
              'middleName': userSaved.name.middleName,
              'familyName': userSaved.name.familyName
            },
            'profile': userSaved.profile,
            'root': false,
            'accountVerified': userSaved.accountVerified
          });
        }
      });
    } else {
      response.status(401);
      response.json({
        'status': 'Error',
        'errors': [
          {
            'code': 401,
            'message': 'Authorization required!'
          }
        ]
      });
    }
  });
};