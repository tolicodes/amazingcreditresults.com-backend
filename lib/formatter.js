var utilities = require('./utilities.js'),
  moment = require('moment'),
  _ = require('underscore');

// Always round to the nearest month
// If < 1 year, display x months (ex: 3 months 10 days = 3 months)
// If > y year also display years + months (ex: 1 year 3 months 20 days = "1 year 4 months")
function humanizeLineAge(dateOpen) {
  var diff = moment.duration(moment() - moment(dateOpen));

  var months = diff.months();
  if (diff.days() >= 15) {
    months += 1;
  }
  var humanized = diff.years() ? (diff.years() + ' years') : '';
  return humanized + months + ' months';
}

exports.formatUserForOwner = function(user) {
  return {
    'id': user.id,
    'huntKey': user.apiKey,
    'email': user.email,
    'name': {
      'title': user.profile ? (user.profile.title || 'Mr.') : 'Mr.',
      'suffix' : user.profile ? user.profile.suffix  : '',
      'familyName': user.name.familyName, //http://schema.org/familyName
      'givenName': user.name.givenName, //http://schema.org/givenName
      'middleName': user.name.middleName //http://schema.org/middleName - at least the google oauth has this structure!
    },
    'areYouAHuman': user.profile ? (user.profile.areYouAHuman ? true : false) : false,
    'phone': user.profile ? (user.profile.phone || '') : '',
    'phoneVerified': user.profile ? (user.profile.phoneVerified ? true : false) : false,
    'evsVerified': user.profile ? (user.profile.evsVerified ? true : false) : false,
    'altPhone': user.profile ? (user.profile.altPhone || '') : '',
    'state': user.profile ? (user.profile.state || '') : '',
    'city': user.profile ? (user.profile.city || '') : '',
    'zip': user.profile ? (user.profile.zip || '') : '',
    'street1': user.profile ? (user.profile.street1 || '') : '',
    'street2': user.profile ? (user.profile.street2 || '') : '',
    'ssn': user.profile ? (user.profile.ssn ? user.profile.ssn.slice(-4) : '') : '',
    'birthday': user.profile ? (user.profile.birthday || '') : '',
    'creditReportLogin': user.profile ? (user.profile.creditReportLogin ? {username: user.profile.creditReportLogin.username, site: user.profile.creditReportLogin.site, password: '*********'} : null) : null,
    'gravatar': user.gravatar,
    'gravatar30': user.gravatar30,
    'gravatar50': user.gravatar50,
    'gravatar80': user.gravatar80,
    'gravatar100': user.gravatar100,
    'online': user.online,
    'root': user.root,
    'roles': {
      'owner': user.roles ? user.roles.owner : false,
      'buyer': user.roles ? user.roles.buyer : false,
      'seller': user.roles ? user.roles.seller : false
    },
    'accountVerified': user.accountVerified,
    'needQuestionnaire': user.profile ? user.profile.needQuestionnaire : true,
    'achAccount': user.profile ? (user.profile.achAccount || {}) : {},
    'profile': {
      'answer1': user.profile ? user.profile.answer1 : '',
      'answer2': user.profile ? user.profile.answer2 : '',
      'answer3': user.profile ? user.profile.answer3 : ''
    },
    'isBanned': user.isBanned,
    'balance': utilities.formatMoney(user.profile ? (user.profile.balance || 0) : 0)
  };
};

exports.formatTradelineForBuyer = function(user, t) {
  return _(t)
    .chain()
    .extend({
      id: t._id,
      inCart: !!(user.profile && user.profile.cart && user.profile.cart[t._id])
    })
    .omit('seller', 'buyers', 'cashLimit', 'currentBalance', 'cost', 'notes')
    .value();
};
