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
  , created_by_name: String
  , created_by_id: ObjectId
  , updated_by_name: String
  , updated_by_id: ObjectId
  , created_by_date: { type: Date, default: Date.now }
  , updated_by_date: { type: Date}
  , company_id : ObjectId
  , client_id : ObjectId
});

var ClientDetail = mongoose.model('ClientDetail', ClientDetailSchema);