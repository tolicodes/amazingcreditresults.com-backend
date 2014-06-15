exports.formatUserForOwner = function (user) {
  return {
    'id': user.id,
    'huntKey': user.apiKey,
    'email': user.email,
    'name': {
      'familyName': user.name.familyName, //http://schema.org/familyName
      'givenName': user.name.givenName, //http://schema.org/givenName
      'middleName': user.name.middleName //http://schema.org/middleName - at least the google oauth has this structure!
    },
    'title': user.profile ? (user.profile.title || 'Mr.') : 'Mr.',
    'phone': user.profile ? (user.profile.phone || '') : '',
    'altPhone': user.profile ? (user.profile.altPhone || '') : '',
    'state': user.profile ? (user.profile.state || '') : '',
    'city': user.profile ? (user.profile.city || '') : '',
    'zip': user.profile ? (user.profile.zip || '') : '',
    'localAddress': user.profile ? (user.profile.localAddress || '') : '',
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
    'profile': {
      'needQuestionnaire': user.profile ? user.profile.needQuestionnaire : true,
      'answer1': user.profile ? user.profile.answer1 : '',
      'answer2': user.profile ? user.profile.answer2 : '',
      'answer3': user.profile ? user.profile.answer3 : ''
    },
    'isBanned': user.isBanned
  };
};