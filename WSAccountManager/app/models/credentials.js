/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

// Template.
var CredentialsSchema = new Schema({
	credential_name: String
  , credential_description: String
  , credential_username: String
  , credential_password: String
  , created_by_name: String
  , created_by_id: ObjectId
  , updated_by_name: String
  , updated_by_id: ObjectId
  , created_by_date: { type: Date, default: Date.now }
  , updated_by_date: { type: Date}
  , company_id : ObjectId
  , client_id : ObjectId
});

var Credential = mongoose.model('Credential', CredentialsSchema);

Credential.TRIBUTARIESSERVICES = 0;
Credential.SSECURITY = 1;

Credential.existent_credentials = {};
  
Credential.existent_credentials[Credential.TRIBUTARIESSERVICES] = {name: 'Financial' };
Credential.existent_credentials[Credential.SSECURITY] = {name: 'Social Security' };