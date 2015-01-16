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

var Credencial = mongoose.model('Credencial', CredentialsSchema);

Credencial.TRIBUTARIESSERVICES = 0;
Credencial.SSECURITY = 1;

Credencial.existent_credencials = {};
  
Credencial.existent_credencials[Credencial.TRIBUTARIESSERVICES] = {name: 'Financial' };
Credencial.existent_credencials[Credencial.SSECURITY] = {name: 'Social Security' };