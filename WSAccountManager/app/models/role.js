/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

// Actor/User Role.
var RoleSchema = new Schema({
      name: String
      // role type.
      , rtype: Number
});
mongoose.model('Role', RoleSchema);

var Role = mongoose.model('Role');
// Role types.
Role.ADMIN = 0;
Role.NORMAL = 1;
