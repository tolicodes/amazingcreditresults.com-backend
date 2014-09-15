//helper for parsing evs response properly

var xml2js = require('xml2js'),
  fs = require('fs'),
  util = require('util'),
  parser = new xml2js.Parser(),
  body = fs.readFileSync('evsresponse.xml');

parser.parseString(body, function (error, result) {
  if (error) {
    throw error;
  } else {
    console.log(util.inspect(result, false, null));
  }
});