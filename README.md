Backend
=============================

Access for owners - `#/admin/login`
Access for anybody - by link in email address
[Apiary documentation](http://docs.amazingcreditresultsapi.apiary.io/)


Setting Up Development Environment
==================================

* I suggest installing nginx, to act as static http server for frontend code, and proxy for api on staging server
So, both the backend, and frontend (from local folder) are served from the localhost!
This eliminates a lot cross origin issues and allows session based authorization
Nginx config is published [here](https://bitbucket.org/nycitt/amazingcreditresults.com-backend/src/56a3bb3f036f38d20102b9af03ff17c304138c4e/nginx.conf)
Some usefull info:

[http://learnaholic.me/2012/10/10/installing-nginx-in-mac-os-x-mountain-lion/](http://learnaholic.me/2012/10/10/installing-nginx-in-mac-os-x-mountain-lion/)
[http://nginx.org/en/docs/windows.html](http://nginx.org/en/docs/windows.html)
[http://wiki.nginx.org/Install](http://wiki.nginx.org/Install)

* Clone oselot/echosign, and oselot/hunt-mongoose-rest projects into seperate repos.

* npm install those fromt their respective folders.

* After installing nginx replace your configuration e.g. /etc/nginx/nginx.conf file with the one found in the repository,
open it, and adjust the lines that follow exclamation marks.

* `cd` into the backend directory and execute `node index.js` to start the server.
* Now your server should be available at http://localhost.
Try to open http://localhost/#admin/login. Default credentials are owner@example.org/test123

Sessionless authorization
=============================

When user is authorized, she or he can receive profile JSON on this page
http://docs.amazingcreditresultsapi.apiary.io/#get-%2Fapi%2Fv1%2Fmyself

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


Chechout procedures (CART WORKFLOW)
=====================================

1) Buyer can add tradeline he/she want to buy to cart,

http://docs.amazingcreditresultsapi.apiary.io/#post-%2Fapi%2Fv1%2Fcart%2Ftradelines

Also note, that on this api endpoint -
http://docs.amazingcreditresultsapi.apiary.io/#get-%2Fapi%2Fv1%2Ftradelines
the field of "inCart" is set to true if this particular tradeline is in cart.

Also Buyer can see the tradelines currently in cart by using this endpoint
http://docs.amazingcreditresultsapi.apiary.io/#get-%2Fapi%2Fv1%2Fcart%2Ftradelines

2) To delete unneeded tradeline from cart, Buyer can use this endpoint
http://docs.amazingcreditresultsapi.apiary.io/#delete-%2Fapi%2Fv1%2Fcart%2Ftradelines%2F5396002cb5282e71211d4f74


3) To perform checkount Buyer have to use this api endpoint
http://docs.amazingcreditresultsapi.apiary.io/#post-%2Fapi%2Fv1%2Fcart%2Ftradelines

If Byuer does not have sufficient funds on his account, the transaction will not be issued.

If Byuer has sufficient funds on his account (as can be seen here http://docs.amazingcreditresultsapi.apiary.io/#get-%2Fapi%2Fv1%2Faccount),
the transaction is issued. Firstly, the transaction is created in database collection of `Transactions`,
 with userId, tradelineId as parameters saved. Than, the transaction is saved into database.

ALso Buyer can see his/her transactions on this api endpoint http://docs.amazingcreditresultsapi.apiary.io/#get-%2Fapi%2Fv1%2Faccount

The tradeline entity in the database will have the buyers populated with current user profile.
 And Owner can see the transaction Buyers when using this api endpoint - http://docs.amazingcreditresultsapi.apiary.io/#get-%2Fapi%2Fv1%2Fowner%2Ftradelines%2F%3Aid
 For now it is planned behaviour, if this is correct approach, i can uncomment code to do this
