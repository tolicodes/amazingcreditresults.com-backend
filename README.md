Backend
=============================


Access for owners - `/admin/login`
Access for anybody - by link in email address
[Apiary documentation](http://docs.amazing.apiary.io/)


Sessionless authorization
=============================

When user is authorized, s/he can receive profile JSON on this page
http://docs.amazing.apiary.io/#get-%2Fauth%2Fmyself

This response is something like this

```json

    {
      "id": "536cfc8a886fcbba14d07dd5",
      "huntKey": "1fcfaecdc53ce05ac5aa0658a977931b77d28861799c9b0261af1d83d713d2ea910b7f110d8f76fe02748040903cd70cef7107357395125c9a2888100f0634a9",
      "email": "owner@example.org",
      "name": {},
      "gravatar": "https://secure.gravatar.com/avatar/b5fca0fa34000c908d46313ed1d737e0.jpg?s=80&d=wavatar&r=g",
      "gravatar30": "https://secure.gravatar.com/avatar/b5fca0fa34000c908d46313ed1d737e0.jpg?s=30&d=wavatar&r=g",
      "gravatar50": "https://secure.gravatar.com/avatar/b5fca0fa34000c908d46313ed1d737e0.jpg?s=50&d=wavatar&r=g",
      "gravatar80": "https://secure.gravatar.com/avatar/b5fca0fa34000c908d46313ed1d737e0.jpg?s=80&d=wavatar&r=g",
      "gravatar100": "https://secure.gravatar.com/avatar/b5fca0fa34000c908d46313ed1d737e0.jpg?s=100&d=wavatar&r=g",
      "root": true,
      "accountVerified": false
    }

```

The `huntKey` is used to override session based authorization in this ways

`GET` request - prepend it as additional query parameter - for example
[http://localhost:3000/auth/myself?huntKey=1fcfaecdc53ce0d8f76fe027480125c9a2888100f0634a9](http://localhost:3000/auth/myself?huntKey=1fcfaecdc53ce0d8f76fe027480125c9a2888100f0634a9)
Will authorize the request to be done by the user who has this huntKey

`POST` request - add it as additonal parameter to request body - like in this jQuery example

```javascript

   $.post('http://localhost:3000/admin/clients`,
    {
        'huntKey':'1fcfaecdc53ce05ac5aa06580b7f110d8f76fe02748040903cd70cef7107357395125c9a2888100f0634a9',
        "familyName" : "Doe",
        "givenName" : "John",
        "middleName" : "Theodor",
        "email":"johndoe@example.org"
    }, function(data){
    /* some code */
    });

```

Additional header - `huntkey=1fcfaecdc53ce05ac5aa0658a9770903cd70cef7107357395125c9a2888100f0634a9`

