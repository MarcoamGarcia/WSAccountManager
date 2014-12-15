/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

// Page.
var PageSchema = new Schema({
    company_id : ObjectId, // company parent.
    site_id : ObjectId, // site parent.
    url_regex: { type: String, default: ""}, // Page can be defined in two ways. Either by a url regex or an id.
    key: { type: String, default: ""}, // Page can be defined in two ways. Either by a url regex or an id.
    uniq_key_url: { type: String, unique: true }, // extra field to guarantee that the key or url is unique in a given site.
    name: String, // Page title.
    description: String, // Page description/content (can be html).
    default_helpset_id: ObjectId, // default helpset to show in this page.
    default_first_time_only: {type: Boolean, default: true}, // flag that says if the default helpset is showed only the first time the user enter the page.
    created_by_id : ObjectId, // user that created this obj.
    updated_by_id : ObjectId // user that updated this obj.
});
//PageSchema.plugin(useTimestamps);
PageSchema.plugin(uniq_page);
PageSchema.index({ key: 1 });
mongoose.model('Page', PageSchema);

// copy key or url info to the extra "uniq_***" field to guarantee that its unique in the site.
function uniq_page(schema, options) {
    schema.pre('save', function (next) {
        // add page key if it does not exist.
        if(this.key !== "" || typeof this.key === "undefined") {
            this.uniq_key_url = this.site_id + "_key_" + this.key;
        } else if(this.url_regex !== "" || typeof this.url_regex === "undefined") {
            this.uniq_key_url = this.site_id + "_url_" + this.url_regex;
        }
        next();
    });
}