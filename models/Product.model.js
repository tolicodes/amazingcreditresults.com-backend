/*

 id
 name - Saphire
 bank - CHASE
 nc_rating - 0-2 (Bronze, Silver, Platinium)
 bc_rating - 0-2 (Bronze, Silver, Platinium)
 mo_rating - 0-2 (Bronze, Silver, Platinium)
 reports_to_experian - TRUE
 reports_to_equifax - FALSE
 reports_to_transunion - TRUE
 notes - Blah Blah
 maximum_aus -
 */

module.exports = exports = function(core){
  var ProductSchema = new core.mongoose.Schema({
    'name': {type: String},
    'bank': {type: String},
    'ncRating':{ type: Number, min: 0, max: 2 },
    'bcRating':{ type: Number, min: 0, max: 2 },
    'moRating':{ type: Number, min: 0, max: 2 },
    'reportsToExperian': Boolean,
    'reports_to_equifax': Boolean,
    'reports_to_transunion': Boolean,
    'notes': String,
    'maximumAus':{ type: Number, min: 0, max: 9999 }
  });

  ProductSchema.index({
    name: 1
  });
  return core.mongoConnection.model('Product', ProductSchema);
};