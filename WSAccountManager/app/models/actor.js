/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , crypto = require('crypto')
  , _ = require('underscore')
  , authTypes = ['github', 'twitter', 'facebook', 'google'];
  
/**
 * Actor Schema
 */
  
// Roles embedded in Actor/User. 
var Roles = new Schema({
      role_id  : ObjectId
});

var Contacts = new Schema({
      name: String // e-mail, phone, address, other...
      , value: String
      , pending: Boolean // flag that show if its a pending email.
});
  
// Links embedded in Actor/User. 
var Links = new Schema({
      name : String // personal site / work / facebook / linkedin / twitter / other
      , value  : String
});
  
// fields used for sending invitations or resetting accounts by e-mail.
var Tokens = new Schema({
      value: String // token string encrypted value.
      , createdAt: Date // when the token was created.
      , type: Number // token type: "reset pass": 0, "invitation": 1, "change main email": 2
      , created_by_id : ObjectId // actor that created this token (for instance made the invitation request).
});
Tokens.index({ token: 1 });
  
  // Permissions embedded in Actor/User. 
var Permissions = new Schema({
      type : Number // permission type (check helpers.js for existent types).
      , obj_id  : ObjectId // permission id (site or company id).
});
  
var ActorSchema = new Schema({
      name: { type: String, default: '' }
      , email: { type: String, default: '' }
      , provider: { type: String, default: '' }
      , hashed_password: { type: String, default: '' }
      , salt: { type: String, default: '' }
      , authToken: { type: String, default: '' }
      , facebook: {}
      , twitter: {}
      , github: {}
      , google: {}
      , state : { type: Number, default: 1 } // invited, active (default), deactivated, registered, approved and rejected.
      , state_info: String // No longer used: information related to the actor state, for instance if the user register with a different actor id, this information is added here
      , pending_email: String // if the user register with a different email, it is added here.
      , pending_email_security: { type: Number, default: 1 } // security level: "ONLY_YOU": 0, "INTERNAL": 1, "PUBLIC": 2
      , pending_actor: ObjectId // if the user register with a different email and actor id (matching two different actors in the db) the second actor is added here.
      , previous_state : Number // invited, active, deactivated, registered, imported, approved and rejected.
      , read_and_accepted_terms: { type: Boolean, default: false} // flag that tells if the user read the terms when signing up.
      , roles : [Roles]
      // sub-document used for sending invitations or resetting accounts by e-mail.
      , tokens: [Tokens]
      , links      : [Links]
      , contacts      : [Contacts]
      // basic attributes.
      , email_security: { type: Number, default: 0 } // security level: "PRIVATE": 0, "REGISTERED": 1, "PUBLIC": 2
      , name     : { type: String, default: ""} 
      , name_security: { type: Number, default: 1 } // security level: "PRIVATE": 0, "REGISTERED": 1, "PUBLIC": 2
      //, company_id  : { type: ObjectId, index: true }
      //, company_admin  : { type: Boolean, default: false }
      , about_me  : { type: String, default: ""} 
      , about_me_security: { type: Number, default: 1 } // security level: "PRIVATE": 0, "REGISTERED": 1, "PUBLIC": 2
      , photo: String
      , birth_date  : Date
      , place_of_birth :String
      , current_location :String
      , gender :Boolean
      , created_by_id : ObjectId // user that created this obj.
      , updated_by_id : ObjectId // user that updated this obj (invited user, changed its state, etc.).
      , register_date : String //register date of the user
      , first_register_date : String //first register date of the user
      , permissions: [Permissions] // permissions: all permissions this actor has (in companies and sites). 
}), Actor;
//ActorSchema.plugin(useTimestamps);
//ActorSchema.plugin(social_networy_and_password_confirmation, {});
//ActorSchema.plugin(versioning, { max: 10 });
ActorSchema.index({ updatedAt: 1 });
ActorSchema.index({ company_id: 1 });
    

/**
 * Virtuals
 */

ActorSchema
  .virtual('password')
  .set(function(password) {
    this._password = password
    this.salt = this.makeSalt()
    this.hashed_password = this.encryptPassword(password)
  })
  .get(function() { return this._password })

/**
 * Validations
 */

var validatePresenceOf = function (value) {
  return value && value.length
}

// the below 4 validations only apply if you are signing up traditionally

ActorSchema.path('name').validate(function (name) {
  // if you are authenticating by any of the oauth strategies, don't validate
  if (authTypes.indexOf(this.provider) !== -1) return true
  return name.length
}, 'Name cannot be blank')

ActorSchema.path('email').validate(function (email) {
  // if you are authenticating by any of the oauth strategies, don't validate
  if (authTypes.indexOf(this.provider) !== -1) return true
  return email.length
}, 'Email cannot be blank')

ActorSchema.path('email').validate(function (email, fn) {
  var Actor = mongoose.model('Actor')
  
  // if you are authenticating by any of the oauth strategies, don't validate
  if (authTypes.indexOf(this.provider) !== -1) fn(true)

  // Check only when it is a new actor or when email field is modified
  if (this.isNew || this.isModified('email')) {
    Actor.find({ email: email }).exec(function (err, actors) {
      fn(!err && actors.length === 0)
    })
  } else fn(true)
}, 'Email already exists')

ActorSchema.path('hashed_password').validate(function (hashed_password) {
  // if you are authenticating by any of the oauth strategies, don't validate
  if (authTypes.indexOf(this.provider) !== -1) return true
  return hashed_password.length
}, 'Password cannot be blank')


/**
 * Pre-save hook
 */

ActorSchema.pre('save', function(next) {
  if (!this.isNew) return next()

  if (!validatePresenceOf(this.password)
    && authTypes.indexOf(this.provider) === -1)
    next(new Error('Invalid password'))
  else
    next()
})

/**
 * Methods
 */

ActorSchema.methods = {

  /**
   * Authenticate - check if the passwords are the same
   *
   * @param {String} plainText
   * @return {Boolean}
   * @api public
   */

  authenticate: function (plainText) {
      console.log("try to find user...");
      return this.encryptPassword(plainText) === this.hashed_password
  },

  /**
   * Make salt
   *
   * @return {String}
   * @api public
   */

  makeSalt: function () {
    return Math.round((new Date().valueOf() * Math.random())) + ''
  },

  /**
   * Encrypt password
   *
   * @param {String} password
   * @return {String}
   * @api public
   */
  encryptPassword: function (password) {
    if (!password) return ''
    var encrypred
    try {
      encrypred = crypto.createHmac('sha1', this.salt).update(password).digest('hex')
      return encrypred
    } catch (err) {
      return ''
    }
  }
}


var attributes_extension = require('../lib/sub_document_attr');
ActorSchema.plugin(attributes_extension);

mongoose.model('Actor', ActorSchema);

var Actor = mongoose.model('Actor');

// Actor state types.
Actor.INVITED = 0; // invited by the admin or another user.
Actor.ACTIVE = 1; // active in the application.
Actor.DEACTIVATED = 2; // deactivated by the admin or user.
Actor.REGISTERED = 3; // user registered in the homepage.
Actor.REJECTED = 4; // user rejected by admin.

// Permission types in actors.
Actor.PERMISSION_COMPANY_ADMIN = 0;
// this next of permission is used so even if one site is remove from the company, 
// if the user only had permissions to the removed site, it still can be seen in the company actors list.
Actor.PERMISSION_COMPANY = 1;
Actor.PERMISSION_ALL_COMPANY_SITES = 2;
Actor.PERMISSION_SITE = 3;

Actor.ALL_PERMISSIONS = [Actor.PERMISSION_COMPANY_ADMIN
      , Actor.PERMISSION_COMPANY
      , Actor.PERMISSION_ALL_COMPANY_SITES,
      Actor.PERMISSION_SITE ]

// Permission type in helpset (Not used at this time)
// Actor.PERMISSION_USER = 0;
