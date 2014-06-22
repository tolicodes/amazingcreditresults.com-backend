var security = require('./security');
var utilities = require('./utilities');

var api = {
  cart: require('../controllers/buyer/cart.js')
};

var routes = [
  {
    path: '/cart/items',
    method: utilities.http.methods.GET,
    roles: [security.roles.buyer],
    handler: api.cart.items
  },
  {
    path: '/cart/items',
    method: utilities.http.methods.POST,
    roles: [security.roles.buyer, security.roles.owner],
    handler: api.cart.addItem
  },
  {
    path: '/cart/items/:id',
    method: utilities.http.methods.DELETE,
    roles: [security.roles.buyer, security.roles.owner],
    handler: api.cart.deleteItem
  },
  {
    path: '/cart/:id',
    method: utilities.http.methods.POST,
    roles: [security.roles.buyer, security.roles.owner],
    handler: api.cart.someStrangeFunction
  }
];


module.exports = exports = utilities.addPrefixToRoutePaths(routes);

