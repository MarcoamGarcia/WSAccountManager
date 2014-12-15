/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;
  
// FAQ Entry.
var FAQEntry = new Schema({
    name: String 
    , description: String
});

// FAQ.
var FAQSchema = new Schema({
    name: String 
    , description: String
    , company_id : ObjectId // company parent.
    , site_id : ObjectId // site parent.
    , created_by_id : ObjectId // user that created this obj
    , updated_by_id : ObjectId // user that updated this obj.
    , entries: [FAQEntry] // faq entries
    , permissions: [] // permissions: all permissions present in this FAQ (list of actors that can change this object).
});
//FAQSchema.plugin(useTimestamps);
mongoose.model('FAQ', FAQSchema);