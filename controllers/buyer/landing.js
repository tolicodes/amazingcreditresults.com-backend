//controller for buyer questionare and dashboard
module.exports = exports = function(core){

//show buyer the dashboard with questionare?
  core.app.get('/buyer', function(request, response){
    response.render('buyer/stage3',{'title':'Dashboard'});
  });

//save buyer answers to questionare - we recieve POST, we respond with JSON
  core.app.post('/buyer/saveQuestionareAnswers', function(request, response){
    if(request.user){
      request.user.profile = request.user.profile || {};
      request.user.profile.answer1 = request.body.answer1;
      request.user.profile.answer2 = request.body.answer2;
      request.user.profile.answer3 = request.body.answer3;
      request.user.save(function(error, userSaved){
        if(error){
          throw error;
        } else {
          response.status(202);
          response.json({
            'id': userSaved.id,
            'email': userSaved.email,
            'name':{
              'givenName':userSaved.name.givenName,
              'middleName':userSaved.name.middleName,
              'familyName':userSaved.name.familyName
            },
            'profile': userSaved.profile,
            'root': false,
            'accountVerified': userSaved.accountVerified
          });
        }
      });
    } else {
      response.status(400);
      response.json({'error':'Authorization is required'})
    }
  });
};