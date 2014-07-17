var ensureBuyerOrSeller = require('../../../lib/middleware.js').ensureBuyerOrSeller,
  curl = require('request');

module.exports = exports = function (core) {
  core.app.get('/api/v1/areyouahuman', ensureBuyerOrSeller, function (request, response) {
    response.render('verification/areyouahuman', {
      'verified': request.user.profile && request.user.profile.isHuman,
      'layout': false,
      'publisherKey': core.config.areYouAHuman.publisherKey
    });
  });

  core.app.post('/api/v1/areyouahuman', ensureBuyerOrSeller, function (request, response) {
    var sessionSecret = request.body.session_secret;
    curl({
      'method': 'POST',
      'url': 'https://ws.areyouahuman.com/ws/scoreGame',
      'form': {
        'session_secret': sessionSecret,
        'scoring_key': core.config.areYouAHuman.scoringKey
      }
    }, function (error, res, body) {
      if (error) {
        throw error;
      } else {
        var bodyParsed = JSON.parse(body);
        if (bodyParsed.status_code === 1) {
          request.user.profile.isHuman = true;
          request.user.save(function (error) {
            if (error) {
              throw error;
            } else {
              response.render('verification/areyouahuman', {
                'verified': false,
                'layout': false,
                'sessionSecret': sessionSecret
              });
            }
          });
        } else {
          response.json(bodyParsed);
        }
      }
    });
  });
};

