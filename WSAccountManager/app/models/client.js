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
  , default_task: String
  , company_id : ObjectId
});

var Client = mongoose.model('Client', ClientSchema);

Client.IVA1 = 0;
Client.IVA3 = 1;

Client.existent_tasks = {};
  
Client.existent_tasks[Client.IVA1] = {name: 'Monthly IVA' };
Client.existent_tasks[Client.IVA3] = {name: 'Quarterly IVA' };