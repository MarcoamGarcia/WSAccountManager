/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

// Company.
var CompanySchema = new Schema({
    name: String,
    address: String,
    email: String,
    url: String,
    main_contact: String,
    main_actor_id: ObjectId, // main user account.
    key : { type: String, required: true }, // api key.
    state : { type: Number, default: 1 }, // active (default) and deactivated.
    //security: { type: Number, default: 1 }, // security level: "ONLY_YOU": 0, "INTERNAL": 1, "PUBLIC": 2
    created_by_id : ObjectId, // user that created this obj / 
    updated_by_id : ObjectId // user that updated this obj.

});
//CompanySchema.plugin(useTimestamps);
mongoose.model('Company', CompanySchema);

var Company = mongoose.model('Company');

// Company state types.
Company.ACTIVE = 1; // active in the application.
Company.DEACTIVATED = 2;