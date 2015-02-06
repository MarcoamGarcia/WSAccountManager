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
  , address: String
  , nif: String
  , niss: String
  , default_task: String
  , inq_ine: Boolean
  , pec: Boolean
  , created_by_name: String
  , created_by_id: ObjectId
  , updated_by_name: String
  , updated_by_id: ObjectId
  , created_by_date: { type: Date, default: Date.now }
  , updated_by_date: { type: Date}
  , company_id : ObjectId
});

var Client = mongoose.model('Client', ClientSchema);

Client.IVA1 = 0;
Client.IVA3 = 1;

Client.existent_tasks = {};
  
Client.existent_tasks[Client.IVA1] = {name: 'IVA Mensal' };
Client.existent_tasks[Client.IVA3] = {name: 'IVA Trimestral' };