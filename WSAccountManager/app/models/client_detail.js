/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

// Template.
var ClientDetailSchema = new Schema({
	title: String
  , description: String
  , created: { type: Date, default: Date.now }
  , end_date: String
  , company_name: String
  , alert: Boolean
  , company_id : ObjectId
  , client_id : ObjectId
});

var ClientDetail = mongoose.model('ClientDetail', ClientDetailSchema);