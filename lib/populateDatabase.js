var dummyUsers = [
  {
    'username' : 'owner',
    'password' : 'test123',
    'root' : true,
  },
  {
    'email': 'johndoe@example.org',
    'accountVerified':false,
    'name': {
      'familyName' : 'Doe',
      'givenName' : 'John'
    }
  },
  {
    'email': 'janedoe@example.org',
    'accountVerified':true,
    'password' : 'test123',
    'name': {
      'familyName' : 'Doe',
      'givenName' : 'Jane'
    }
  }
];


module.exports = exports = function(core){
  console.log('Database population!');
  if(core.config.env != 'development'){
    return; //just in case
  }
  core.async.each(
    dummyUsers,
    function(user, cb){
      if(user.root){
        core.model.User.findOneAndUpdate(
          { 'keychain.username': user.username },
          {
            'apiKey':core.rack(),
            'username': user.username,
            'root': true,
          },
          {
            'upsert':true
          },
          function(error, userFound){
            if(error) {
             cb(error);
            } else {
              userFound.setPassword(user.password, function(err){
                if(err) {
                  cb(err);
                } else {
                  console.log('---------------------------');
                  console.log('Owner '+userFound.username+':'+user.password+' is created!');
                  cb();
                }
              });
            }
          });
      } else {
        if(user.accountVerified) {
          core.model.User.findOneAndUpdate(
            { 'keychain.email': user.email },
            {
              'name': {
                'familyName': user.name.familyName || '',
                'givenName': user.name.givenName  || '',
                'middleName': user.name.middleName || ''
              },
              'apiKey':core.rack(),
              'email': user.email,
              'accountVerified': true,
              'root':false,
            },
            {
              'upsert':true
            },
            function(error, userFound){
            if(error) {
             cb(error);
            } else {
              userFound.setPassword(user.password, function(err){
                if(err) {
                  cb(err);
                } else {
                  console.log('---------------------------');
                  console.log('Verified buyer '+userFound.email+' : '+user.password+' is created!');
                  console.log('Visit '+ core.config.hostUrl + 'buyer/welcome/' +
                              userFound.apiKey + ' to sign in as him/her!');
                  cb();
                }
              });
            }
          });
        } else {
          core.model.User.findOneAndUpdate(
            { 'keychain.email': user.email },
            {
              'name': {
                'familyName': user.name.familyName  || '',
                'givenName': user.name.givenName  || '',
                'middleName': user.name.middleName || ''
              },
              'apiKey':core.rack(),
              'email': user.email,
              'accountVerified': false,
              'root':false,
            },
            {
              'upsert':true
            },
            function(error, userFound){
              if(error){
                throw error;
              } else {
                console.log('---------------------------');
                console.log('Unverified buyer '+userFound.email+' is created!');
                console.log('Visit '+ core.config.hostUrl + 'buyer/welcome/' +
                            userFound.apiKey + ' to set password for him/her');
              }
            });

        }
      }
    },
    function(error){
      if(error){
        console.error(error);
      } else {
        console.log('Database population completed!');
      }
    });
}