var _ = require('underscore');

/**
 * Gets the value located at string path
 * @param  {Object} obj  Object we are traversing (ex: this)
 * @param  {String} path The string path we want to get (ex: 
 *                       'cat.feet' would get obj.cat.feet)
 * @return {Various}      The value
 */
var getPath = function(obj, path) {
  path = path.split('.');

  for (var i = 0; i < path.length; i++) {
    if (!_.isUndefined(obj[path[i]]))  {
      obj = obj[path[i]];
    } else {
      return;
    }
  }

  return obj;
};

/**
 * Saves value to a nested path in the obj
 * @param  {Object} obj   The object we want to save to
 * @param  {String} path  String Path (see getPath for example)
 * @param  {Various} value The value we want to save
 * @return {Object}       Returns the original object
 */
var saveToPath = function(obj, path, value) {
  var original = obj;

  path = path.split('.');

  for (var i = 0; i < path.length; i++) {
    if(i + 1 === path.length) {
      obj[path[i]] = value;
    } else if (obj[path[i]]) {
      obj = obj[path[i]];
    } else {
      obj = obj[path[i]] = {};
    }
  }

  return original;
};

// Formatted value of one thousand dollars should look like '$1,000'
exports.formatMoney = function (price) {
  return '$' + reverse(reverse(price).replace(/(\d{3}(?!$))/g, "$1,"));
};

exports.fixQueryFormatting = function (query) {
  _(query).each(function(val, param){
    if(val === 'true') {
      val = true;
    } else if (val === 'false') {
      val = false;
    }

    query[param] = val;
  });

  return query;
};

exports.checkMissingFields = function(obj, fields) {
  var missing = [];
  _(fields).each(function(field){
    if(_.isUndefined(getPath(obj, field))) {
      missing.push(field);
    }
  });

  return missing;
}

exports.createFilter = function(obj, passThroughFilters, filterMap) {
  var filter = {};

  _(passThroughFilters).each(function(filter){
    filterMap[filter] = filter;
  });

  _(filterMap).each(function(field, queryField){
    var val = obj[queryField];
    if(!_.isUndefined(val)) {
      filter[field] = val;
    }
  });

  return filter;
}

exports.stringToBoolean = function(boolStr) {
  return (boolStr === 'true') ? true : false;
}

exports.createModel = function(input, passThrough, map, obj) {
  obj = obj || {};
  map = map || {};

  _(passThrough).each(function(field){
    map[field] = field;
  });

  _(map).each(function(inputField, outputField){
    var val = _.isFunction(inputField) ?
      inputField(input) : 
      getPath(input, inputField);

    if(!_.isUndefined(val)) {
      // Type issues, bool to string over HTTP
      if (_.isString(val) && (val === 'false' || val === 'true')) {
        val = exports.stringToBoolean(val);
      }
      obj = saveToPath(obj, outputField, val);
    }
  });

  return obj;
}

exports.throwError = function(res, error){
  //console.log(arguments);

  var errors = [];
  if (error.name === 'ValidationError') {
    errors = _(error.errors).map(function(val){
      return {
        message: val.message,
        field: val.path,
        value: val.value
      }
    });
  } else if (error.code === 11000) {
    errors.push({
      message: 'Duplicate Entry!'
    });
  } else {
    errors.push({
      message: 'Unknown Error'
    })
  }

  res.status(400).json({
    errors: errors
  }).end();
}

exports.checkError = function(error, data, notFoundMsg, response, successCb) {
  if (error) {
    throw error;
  } 

  if (!data) {
    response.status(404);
    response.json({
      'errors': [{
        'message': notFoundMsg
      }]
    });
    return true;
  } else {
    if(successCb) {
      successCb(data, response);
    } 
    return false;
  }
};

exports.pickFields = function(fields, data) {
  var obj = {};

  fields.push('id');

  _(fields).each(function(field){
    var val = getPath(data, field);

    if(!_.isUndefined(val)) {
      // Type issues, bool to string over HTTP
      if (_.isString(val) && (val === 'false' || val === 'true')) {
        val = exports.stringToBoolean(val);
      }
      obj = saveToPath(obj, field, val);
    }
  }, this);

  return obj;
};

exports.returnList = function(response, data, fields) {
  if(fields) {
    data = _(data).map(exports.pickFields.bind(exports, fields));
  }

  response.json({
    metaData: {
      totalPages: 1,
      page: 1
    },
    data: data
  });
};

exports.error = function error(code, messages, response) {
  if(!_.isNumber(code)) {
    response = messages;
    messages = code;
    code = 400;
  }

  if(!_.isArray(messages)) {
    messages = [messages];
  }

  _(messages).each(function(message, i){
    if(_.isString(message)) {
      messages[i] = {
        message: message
      };
    }
  });

  response.status(code);
  response.json({
    'status': 'Error',
    'errors': messages
  });
};

function reverse(string) {
  return string.toString().split('').reverse().join('')
}
