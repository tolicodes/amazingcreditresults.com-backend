// TODO add as static methods on mongoose User object

var createPatch = require('./utilities.js').createPatch,
    _ = require('underscore');
var nameFields = ['familyName', 'givenName', 'middleName', 'suffix', 'title'];
  fieldMap = {
  'street1': 'profile.street1',
  'street2': 'profile.street2',
  'state': 'profile.state',
  'city': 'profile.city',
  'ssn': 'profile.ssn',
  'birthday': 'profile.birthday',
  'zip': 'profile.zip'
};

exports.canEditAfterEVS = function(changes) {
  // Innocent until provent guilty
  var canEdit = true;

  // This is a big no-no
  if (changes.name) {
    return false;
  } else {
    _(fieldMap).forEach(function(fullKey, shortKey) {
      if (changes.hasOwnProperty(shortKey)) {
        canEdit = false;
      }
    });
  }
  return canEdit;
};

exports.createModel = function(changes, user) {
  var patch = createPatch(changes, nameFields, fieldMap);

  if (changes.phone && changes.phone !== user.profile.phone) {
    // Reset phoneverified flag
    if (user.profile.phoneVerified) {
      patch['profile.phoneVerified'] = false;
    }
    patch['profile.phone'] = changes.phone;
  }
  // TODO add creditReportLogin
  console.log(patch);
  return patch;
};