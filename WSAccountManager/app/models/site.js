/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

// Site.
var SiteSchema = new Schema({
    company_id : ObjectId, // company parent.
    name: String, // site name
    url: { type: String, unique: true}, // site base url. Example: www.google.com 
    subdomains: { type: Boolean, default: true} , // should include subdomains?
    key : String, // api key.
    created_by_id : ObjectId, // user that created this obj.
    updated_by_id : ObjectId, // user that updated this obj.
    page_ordering: [ObjectId] // used to sort pages in sites, so url regex can be tested in the right way.
});
//SiteSchema.plugin(useTimestamps);
SiteSchema.index({ key: 1 });
SiteSchema.path('url').index({ unique: true });
mongoose.model('Site', SiteSchema);