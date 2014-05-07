//controller for buyer questionare and dashboard
module.exports = exports = function(core){

//show buyer the dashboard with questionare?
  core.app.get('/buyer', function(request, response){
    response.render('buyer/stage3',{'title':'Dashboard'});
  });

//save buyer answers to questionare - we recieve POST, we respond with JSON
  core.app.post('/buyer/saveQuestionareAnswers', function(request, response){

  });

//save buyer profile
};