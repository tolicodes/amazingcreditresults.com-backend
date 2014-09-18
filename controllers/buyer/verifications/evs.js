var ensureRole = require('../../../lib/middleware.js').ensureRole,
  xml2js = require('xml2js'),
  curl = require('request'),
  utilities = require('./../../../lib/utilities.js'),
  moment = require('moment'),
  _ = require('underscore'),
  cheerio = require('cheerio');

module.exports = exports = function(core) {
  core.app.get('/api/v1/verify-evs', ensureRole('buyer'), function(req, res) {
    var user = req.user,
      profile = user.profile;

    
    var missingFields = utilities.checkMissingFields(user, ['name.givenName', 'name.familyName', 'profile.ssn', 'profile.birthday']);
    if(missingFields.length) {
      return utilities.error('Fields missing: ' + missingFields.join(', '), res);
    }

    if (!user || !profile.ssn) {
      return utilities.error(400, 'SSN has not been entered!', res);
    }

    if (user.ssnVerified) {
      return utilities.error(400, 'SSN has already verified!', res);
    }

    var today = moment().format('MM-DD-YY'),
      evsRateLimit = false;

    if (user.evsLastTryDate === today) {
      if (user.evsNumberTries === 3) {
        evsRateLimit = true;
      } else {
        user.evsNumberTries++;
      }
    } else {
      user.evsNumberTries = 1;
      user.evsLastTryDate = today;
    }

    user.save(function(err) {
      if (err) {
        return utilities.error('400', err);
      }
    });

    if (evsRateLimit) {
      return utilities.error('400', 'SSN verification rate limited to 3x a day');
    };

    //perform verification
    var builder = new xml2js.Builder();

    var identity = utilities.createModel(user, [], {
      FirstName: 'name.givenName',
      MiddleName: 'name.middleName',
      LastName: 'name.familyName',
          Generation: 'name.generation',
          Ssn: function(user) { return user.profile.ssn.replace(/\-/g, '') },
          Street: 'profile.street1',
          City: 'profile.city',
          State: 'profile.state',
          ZipCode: 'profile.zip',
          DateOfBirth: function(user) { return moment(user.profile.birthday).format('MM-DD-YY'); }
    });

    var body = {
      PlatformRequest: {
        Credentials: {
          Username: core.config.evs.username,
          Password: core.config.evs.password
        },
        CustomerReference: req.user.id,
        Identity: identity
      }
    };
    
    curl({
      method: 'GET',
      //url: 'https://identiflo.everification.net/WebServices/Integrated/Main/V200/Consumer',
      url: 'http://localhost:8081/evsresponse.xml',
      body: builder.buildObject(body)
    }, function(error, data, body) {
      if (error) {
        return utilities.error('400', error, res)
      }

      var $ = cheerio.load(body);

      var verifications = [
        ['SocialSecurityNumberResult', ['FY', 'PY', 'Y'], 'SSN and Name don\'t match'],
        ['DateOfBirthResult', ['9'], 'DOB doesn\'t match']
      ];

      var errors = [];

      _(verifications).each(function(verification){
        var code = $(verification[0]).attr('code');

        if (_(verification[1]).indexOf(code.toString()) === -1) {
          errors.push(verification[2]);
        }
      });

      if(errors.length) {
        return utilities.error(400, errors, res);
      }

      req.user.evsVerified = true;
      req.user.save(function(err){
        if(err) {
          utilities.error(err, res)
        } else {
          res.json({success:true});
        }
      });
    });

  });
};