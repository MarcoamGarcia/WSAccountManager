/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , sjcl = require('../lib/sjcl.js');

// Flag system (so a user can report abuse in notification or messages).
var Flags = new Schema({
    created_by_id  : ObjectId // user that created this flag.
    , created_by_email : String // user mail that created this flag (for non-registered users).
    , updated_by_id: ObjectId // user that updated / solved this flag (not used at this time).
    , type : Number // flag type (check helpers.js).
    , reason : String // flag reason
    , closed_reason : String // flag close reason (not used at this time). 
    , closed : Number // is the flag solved? (not used at this time)
    , createdAt: Date
    , updatedAt: Date
});

// HelpSet.
var HelpSetSchema = new Schema({
    //actor_id : ObjectId, // user that created/updated this help.
    state: {type: Number, default: 0}, // 0 - draft / 1 - published.
    name: String,
    downcase_name: {type: String, default: ""},  // this field is needed because mongodb does not allow case insensitive queries.
    description: String,
    type: Number, // official help or user created.
    sub_type: Number, // 0 - context or 1 - tutorial help.
    company_id: ObjectId, // company where this helpset belongs to.
    site_id : ObjectId, // site parent.
    page_id: ObjectId, // page parent.
    official: { type: Boolean, default: false }, // flag that tells if the helpset is an official one.
    b_seven: { type: String, required: true }, // encryption pass used in getting and sending help information between the browser and the server.
    helps: String,
    permissions: [], // permissions: all permissions present in this helpset (list of actors that can change this helpset).
    created_by_id : ObjectId, // user that created this obj.
    updated_by_id : ObjectId, // user that updated this obj.
    // *************** //
    // Flag attributes //
    // *************** //
    // flag used to tell if at this time this helpset is flagged.
    is_flagged : { type: Boolean, default: false },
    // notification flags.
    flags: [Flags]

});
//HelpSetSchema.plugin(useTimestamps);
HelpSetSchema.plugin(encrypt_help);
HelpSetSchema.plugin(add_downcase_name);
HelpSetSchema.index({ updatedAt: 1 });
HelpSetSchema.index({ site_id: 1 });
HelpSetSchema.index({ site_id: 1, state: 0 });
HelpSetSchema.index({ page_id: 1, is_flagged: 0 });
HelpSetSchema.index({ page_id: 1 });
HelpSetSchema.index({ updated_by_id: 1 });



HelpSetSchema.pre('save', function (next) {
    var self = this;
    // TODO: scramble encryption passaword.
    if (self.isNew) {
        var b_seven = encode(self.b_seven);
        self.b_seven = b_seven;
    };
    next();
});

//create a random string
function random_string ()
{
    var text = "";
    var possible = "ABCfDEFGfghsdsdww22eHIJ1234567890KLMNOPQfhfhRSTUVWXYZabcdegfhhtjfghijghjgjklmnopqjhgstuvwxyz012dfd3456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

//encode a given input, converting to ascii and adding a random_string
function encode (input) {
    var self = this;  
    var output = [];
    for (i=0; i < input.length; i++) {
        var make = random_string();
        output[output.length] = input[i].charCodeAt(0) + make;
    }
    return output;
}

//dencode a given input, converting ascii to char and removing the random_string
function decoding (input) {
    var self = this;  
    var output = "";
    for (i=0; i < input.length; i++) {
        var temp = input[i].slice(0,input[i].length - 5);
        output += String.fromCharCode(temp);
    }
    return output;
}

mongoose.model('HelpSet', HelpSetSchema);
    
// this function is needed because mongodb does not allow case insesitive queries.
function add_downcase_name(schema, options) {
    schema.pre('save', function (next) {
        if(this.name !== "" || typeof this.name === "undefined") {
            this.downcase_name = this.name.toLowerCase();
        } 
        next();
    });
}
    
// plugin to send help as encrypted data.
function encrypt_help(schema, options) {
    schema.methods.encryptJSON = function encryptJSON() { 
        var obj = this.toObject();
        var encrypt_pass = this.enc_pass;
        // delete all other information that isn't needed in the api.
        delete obj["enc_pass"];
        delete obj["versions"];
        delete obj["company_id"];
        delete obj["site_id"];
        delete obj["page_id"];
        delete obj["updatedAt"];
        delete obj["updated_by_id"];
        delete obj["created_by_id"];
        return obj;
    };
}

var HelpSet = mongoose.model('HelpSet');

// helpset state types.
HelpSet.DRAFT = 0; // default state
HelpSet.PUBLISHED = 1;

HelpSet.CONTEXT = 0;
HelpSet.TUTORIAL = 1;
