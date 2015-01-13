/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

// Template.
var CredentialsSchema = new Schema({
	credencial_name: String
  , credencial_description: String
  , credencial_username: String
  , credencial_password: String
  , company_id : ObjectId
  , client_id : ObjectId
});

var Credencials = mongoose.model('Credencials', CredentialsSchema);

Credencials.TRIBUTARIESSERVICES = 0;
Credencials.SSECURITY = 1;

Credencials.existent_credencials = {};
  
Credencials.existent_credencials[Credencials.TRIBUTARIESSERVICES] = {name: 'Financial' };
Credencials.existent_credencials[Credencials.SSECURITY] = {name: 'Social Security' };