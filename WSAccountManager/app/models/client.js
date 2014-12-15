/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

// Template.
var ClientSchema = new Schema({
	company_name: String
  , first_name: String
  , last_name: String
  , first_contact: String
  , second_contact: String
  , company_id : ObjectId
});

var Client = mongoose.model('Client', ClientSchema);