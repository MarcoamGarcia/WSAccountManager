/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Step = require('step'),
    async = require('async'),
    // library to generate actor_id.
    crypto = require('crypto'),
    fs = require('fs'),
    queue = require('../config/queue'),
    logger = require('../config/logger').logger(),
    utils = require('../lib/utils'),
    actor_middleware = require('../middlewares/actor_middleware'),
    _ = require("underscore");

// Parse ISO 8601.
// https://github.com/JerrySievert/node-date-utils
// http://legitimatesounding.com/blog/Node_js_Date_Utils.html
require('date-utils');
   
var Actor = mongoose.model('Actor');
var Role = mongoose.model('Role');
var HelpSet = mongoose.model('HelpSet');

exports.load_from_token = function(req, res, next, token_id) {
    Actor.findOne({'tokens.value': token_id}, function (err, actor) {
        if(err) {
            return next(err);
        } else if(actor == null) {
            return next(new Error("Can't find user."));
        }
        else {
            req.actor = actor;
            // set actor object in result.
            res.locals.actor = actor;
        }
        next();
    });
}

// go to active profile page.
exports.show_active_profile_dashboard = function(req, res, next) { 
    res.redirect(res.locals.url_mount("/profile/" + req.user.id + "/dashboard"));
}

// show profile info.
exports.show = function(req, res, next) { 
    if(req.actor == null) {
        logger.error("cannot find user");
        res.redirect(res.locals.url_mount("/404"));
    }
    if(res.locals.can_edit) {
        edit_profile(req, res, next);
    }
    else {
        // check if its an inactive profile.
        if(req.actor.state != Actor.ACTIVE) {
            var actor = req.actor;
            if(req.isAuthenticated()) {
                // check if user is authorized to view this inactive profile (check if its an admin user).
                var authorized = authorization.authorized(req, action, 'admin', null);
                if(authorized) {
                    show_profile(req, res, next);
                }
                else {
                    // don't show inactive actors.
                    logger.error("cannot show inactive user " + req.actor.id);
                    res.redirect(res.locals.url_mount("/404"));
                }
            } else {
                // don't show inactive actors.
                logger.error("cannot show inactive user " + req.actor.id);
                res.redirect(res.locals.url_mount("/404"));
            }
        } else {
            show_profile(req, res, next);
        }
    }  
}

//edit profile info.
exports.edit_profile = edit_profile;
function edit_profile(req, res, next) { 
    
    var actor = req.actor;
    
    var profile_name = actor.name;
    if(actor.name == null) {
        profile_name = "";
    }
    res.locals.title = profile_name;
    res.locals.public = false;
    res.locals.email = "";
    
    res.locals.main = main_info_hash(req);
    
    res.render('profile/edit_person'); 
    
}

//show profile info.
exports.show_profile = function(req, res, next) { 
    
    var actor = req.actor;
    
    try {
        
        var profile_name = actor.name;
        if(actor.name == null) {
            profile_name = "";
        }
        
        if(!req.isAuthenticated()) {
            res.render('profile/person', {
                title: profile_name,
                show_login: true,
                public: true
            }); 
        } else {
            res.render('profile/person', {
                title: profile_name,
                public: false
            }); 
        }
        
    } catch(err) {
        logger.error(err);
        return next(err);
    }
    
}

exports.show_profile_dashboard = function(req, res, next) {
    
    if(req.actor == null) {
        logger.error("cannot find user");
        res.redirect(res.locals.url_mount("/404"));
    } else {
        var actor = req.actor;
        var profile_name = actor.name;
        async.parallel([
                function count_helpsets(callback) {
                    HelpSet.count({ created_by_id: actor.id}, callback);
                }
            ], function(err, results) {
                if(err) {
                    logger.error(err);
                    res.redirect(res.locals.url_mount("/500"));
                } else {
                    var number_of_helpsets = results[0];
                    res.render('profile/dashboard', {
                        title: profile_name,
                        number_of_helpsets: number_of_helpsets,
                    }); 
                }
            }
        );
    }
    
}

//show main info.
exports.main_info = function(req, res, next) { 
    
    var actor_hash = main_info_hash(req);
    res.writeHead(200, {'content-type': 'text/json' });
    res.write(JSON.stringify(actor_hash));
    res.end('\n');
    
}

function main_info_hash(req) { 
    
    var actor = req.actor;
    
    if(actor.name === undefined) {
        actor.name = "";
    }
    if(actor.about_me === undefined) {
        actor.about_me = "";
    }
    if(actor.gender === undefined) {
        actor.gender = "";
    }
    if(actor.pending_email === undefined || actor.pending_email == null) {
        actor.pending_email = "";
    }
    var birth_date = "";
    if(actor.birth_date === undefined) {
        birth_date = "";
    } else {
        birth_date = actor.birth_date.toYMD();
    }
    
    var actor_hash = { _id: actor.id, name: actor.name, name_security: actor.name_security
         , about_me: actor.about_me, about_me_security: actor.about_me_security
         , gender: actor.gender, birth_date: birth_date
         , email: actor.email, email_security: actor.email_security
         , pending_email: actor.pending_email};
    
    return actor_hash;
    
}

//update main info.
exports.update_main_info = function(req, res, next) {
    
  var logged_user = req.user;
  var actor = req.actor;
  
  actor.created_by_id = logged_user.id;
  
  var errors = {};
  var has_errors = false;
  
  // don't allow to change data without security.
  if(req.body.name_security === undefined || isNaN(req.body.name_security) || parseInt(req.body.name_security) < 0 || parseInt(req.body.name_security) > 2 ) {
      errors["name"] = "security level cannot be empty";
      has_errors = true;
  }
  
  if(req.body.email_security === undefined || isNaN(req.body.email_security) || parseInt(req.body.email_security) < 0 || parseInt(req.body.email_security) > 2 ) {
      errors["email"] = "security level cannot be empty";
      has_errors = true;
  }
  
  if(req.body.about_me_security === undefined || isNaN(req.body.about_me_security) || parseInt(req.body.about_me_security) < 0 || parseInt(req.body.about_me_security) > 2 ) {
      errors["about_me"] = "security level cannot be empty";
      has_errors = true;
  }
  
  if(req.body.name !== undefined) {
      actor.name = req.body.name;
      actor.name_security = req.body.name_security;
  } else {
      logger.error("invalid name " + name);
      errors["name"] = "This field is required.";
      has_errors = true;
  }
  if(req.body.about_me !== undefined) {
      actor.about_me = req.body.about_me;
      actor.about_me_security = req.body.about_me_security;
  }
  if(req.body.gender !== undefined) {
      if(req.body.gender == "0") {
          actor.gender = 0;
      } else if(req.body.gender == "1") {
          actor.gender = 1;
      }
  }
  if(req.body.birth_date !== undefined && req.body.birth_date != "") {
      // parse ISO date.
      actor.birth_date = new Date(Date.parse(req.body.birth_date));
  }
  

  actor.email_security = req.body.email_security;
  
  var email = req.body.email;
  // check if email has changed.
  if(email != actor.email) {
      // remove spaces in email string.
      var email = email.replace(/ /g,"");
      // check if the email is valid.
      var email_filter = utils.email_filter();
      if (!email_filter.test(email)) {
          logger.error("invalid e-mail " + email);
          errors["email"] = "Oops. The email you added in not valid. Please change it and try again.";
          has_errors = true;
      } 
      
      if(has_errors) {
          res.send({ errors: errors}, 500);
          return;
      }
      
      // check if email is already taken.
      Actor.findOne({'email': email}, function(err, actor_with_email) {
          if(err) {
              logger.error(err);
              res.send({ errors: { general: "Oops. Something went wrong. Please try again." } }, 500);
              return;
          // if there is another actor with the same email send an error.
          } else if(actor_with_email != null && actor_with_email.email != actor.email) {
              res.send({ errors: { email: "Cannot change e-mail because its already taken!" } }, 500);
              return;
          }
              
          // create new actor token.
          var crypt = crypto.randomBytes(16).toString('hex');
          var new_token = {value: crypt, sent_at: new Date(), type: 2};
          var tokens = actor.tokens;
          if(tokens.length > 0) {
              // try to see if there is already a token of the same kind and remove it if necessary.
              var token = Actor.attr(tokens, "type", 2);
              if(token != null) {
                  token.remove();
              }
          }
          // add new token.
          tokens.push(new_token);
          // need to clone tokens because we're adding and removing a token at the same time.
          var tokens = _.clone(tokens);
          // change token sub-documents.
          actor.tokens = tokens;

          //add new pending e-mail.
          actor.pending_email = email;
          actor_middleware.save_actor(actor, function (err) {
              if (err) {
                  logger.error(err);
                  res.send({ errors: { general: "Oops. Something went wrong. Please try again." } }, 500);
              } else {
                  var actor_hash = main_info_hash(req);
                  res.writeHead(200, {'content-type': 'text/json' });
                  res.write(JSON.stringify(actor_hash));
                  res.end('\n');
                  
                  // send e-mail to confirm it as the main e-mail.
                  var client = queue.get_client();
                  client.enqueue('send_mail', {
                      title: 'Confirm new mail: ' + actor.email,
                      to: actor.pending_email,
                      actor_id: actor.id,
                      values: {crypt: crypt},
                      user_id: logged_user.id,
                      host: req.headers.host,
                      // e-mail subject
                      subject: 'Helppier Email Verification',
                      // template used to send e-mail
                      template: 'confirm_email'
                  }, function (err, job) {
                        if (err) {
                            logger.error(err);
                        }
                        logger.debug('enqueued:', job.data);
                    });
              }
          });
          
      });
      
  } else {
      if(has_errors) {
          res.send({ errors: errors}, 500);
          return;
      }
      actor_middleware.save_actor(actor, function (err) {
          if (err) {
              logger.error(err);
              res.send({ errors: { general: "Oops. Something went wrong. Please try again." } }, 500);
          } else {
              var actor_hash = main_info_hash(req);
              res.writeHead(200, {'content-type': 'text/json' });
              res.write(JSON.stringify(actor_hash));
              res.end('\n');
          }
      });
  }
  
}

// deactivate profile.
exports.deactivate_profile = function(req, res, next) { 
    var logged_user = req.user;
    var actor = req.actor;
    
    // remove tokens.
    actor.tokens = [];
    // deactivate actor.
    actor.state = Actor.DEACTIVATED;
    actor.created_by_id = logged_user.id;
    actor_middleware.save_actor(actor, function(err) {
        if (err) {
            console.err(err.message);
            res.send({ error: "Oops. can't deactivate profile. Please try again." });
        } else {
            res.send({ id: actor.id });
        }
    });
}

///////////////////////
//Contacts      //
///////////////////////

//show contacts.

exports.contacts = function(req, res, next) {
    
    var logged_user = req.user;
    var actor = req.actor;
    var contacts = actor.contacts;
    // add main e-mail profile to contacts if it's an user and the e-mail is real (not a bogus one created when the user data was imported from sigarra). 
    if(actor.type == Actor.USER || utils.email_filter().test(actor.email)) {
        var main_email_contact = {_id: actor.id, name: 'E-mail', value: actor.email, main_email: true};
        contacts.unshift(main_email_contact);
    }
    res.writeHead(200, {'content-type': 'text/json' });
    res.write(JSON.stringify(contacts));
    res.end('\n');
    
}

// add contact to profile.
exports.add_contact = function(req, res, next) {
    
    var logged_user = req.user;
    var actor = req.actor;
    actor.created_by_id = logged_user.id;
    
    // don't allow empty name.
    if(req.body.name === undefined || req.body.name === "") {
        res.send({ error: "name cannot be empty" });
    } 
    // don't allow empty value.
    else if(req.body.value === undefined || req.body.value === "") {
        res.send({ error: "value cannot be empty" });
    } 
    else {
        var cnt_name = req.body.name;
        var cnt_value = req.body.value;
        var cnt_security = req.body.security;
        var contact = { name: cnt_name, value: cnt_value, security: cnt_security };
        // TODO: must change mongoose so the embebbed object is returned 
        // as a new param in the save callback.
        // http://groups.google.com/group/mongoose-orm/browse_thread/thread/94c0888671f63fb9/0d607086fd3d7d44?lnk=gst&q=document+id#
        var contacts_size = actor.contacts.length;
        actor.contacts.push(contact);
        actor_middleware.save_actor(actor, function(err){
            var added_contact = actor.contacts[contacts_size];
            if (err) {
                res.send({ error: err.message });
            } else {
                res.send(added_contact);
            }
        });
    }
    
}

//update contact.
exports.update_contact = function(req, res, next) { 
    
    try {
        var logged_user = req.user;
        var actor = req.actor;
        actor.created_by_id = logged_user.id;
        
        var main_email = req.body.main_email;
        
        var set_main_email = false;
        // check if the request is to make an e-mail the main one.
        if(req.body.main_email !== undefined && req.body.main_email != "") {
            set_main_email = true;
        }
        
        // don't allow to change contact without security.
        if(req.body.security === undefined || isNaN(req.body.security) || parseInt(req.body.security) < 0 || parseInt(req.body.security) > 2 ) {
            res.send({ error: "security level cannot be empty" });
            return;
        }
        
        if(set_main_email) {
            
            if(req.body.value === undefined || req.body.value === "") {
                res.send({ error: "e-mail cannot be empty" });
            }
            
            var contacts = actor.contacts;
            
            // get contact to set as pending e-mail.
            var contact = contacts.id(req.params.contact_id);
            if(contact.type != ACTOR_EMAIL) {
                res.send({ error: "Oops. can't set main e-mail. Please try again." });
                return;
            } 
            
            // remove pending in any other contact (if they exist).
            contacts.forEach(function(existent_contact) {
                if(existent_contact.pending) {
                    existent_contact.pending = false;
                }
            });
            
            // add new pending e-mail.
            actor.pending_email = contact.value;
            actor.pending_email_security = contact.security;
            // set contact as pending.
            contact.pending = true;
            
            // create new actor token.+
            var crypt = crypto.randomBytes(16).toString('hex');
            var new_token = {value: crypt, sent_at: new Date(), type: 2};
            
            var tokens = actor.tokens;
            
            if(tokens.length > 0) {
                // try to see if there is already a token of the same kind and remove it if necessary.
                var token = tokens.attr("type", 2);
                if(token != null) {
                    token.remove();
                }
            }
            // add new token.
            tokens.push(new_token);
            
            // need to clone tokens because we're adding and removing a token at the same time.
            var tokens = _.clone(tokens);
            
            // change token sub-documents.
            actor.tokens = tokens;
            
            actor_middleware.save_actor(actor, function (err) {
                if (err) {
                    res.send({ error: err.message });
                } else {
                    // send e-mail to confirm it as the main e-mail.
                    var client = queue.get_client();
                    client.enqueue('send_mail', {
                        title: 'confirm new mail: ' + actor.email,
                        to: actor.pending_email,
                        actor_id: actor.id,
                        value: crypt,
                        user_id: logged_user.id,
                        host: req.headers.host,
                        // e-mail subject
                        subject: 'Helppier Email Verification',
                        // template used to send e-mail
                        template: 'confirm_email'
                    }, function (err, job) {
                        if (err) {
                            logger.error(err);
                        }
                        logger.debug('enqueued:', job.data);
                    });
                    res.send(contact);
                }
            });
        } else {
            // don't allow empty name.
            if(req.body.name === undefined || req.body.name === "") {
                res.send({ error: "name cannot be empty" });
            } 
            // don't allow empty value if type is 'other'.
            else if(req.body.value === undefined || req.body.value === "") {
                res.send({ error: "value cannot be empty" });
            } 
            // don't allow to change contact without security.
            else if(req.body.security === undefined || isNaN(req.body.security) || parseInt(req.body.security) < 0 || parseInt(req.body.security) > 2 ) {
                res.send({ error: "security level cannot be empty" });
                return;
            }
            else {
                    var contact = actor.contacts.id(req.params.contact_id);
                    contact.name = req.body.name;
                    contact.value =  req.body.value;
                    contact.security =  req.body.security;
                    actor_middleware.save_actor(actor, function (err) {
                        if (err) {
                            res.send({ error: err.message });
                        } else {
                            res.send(contact);
                        }
                    });
            }
        }
    } catch(e) {
        logger.debug(e.message);
        res.json({ error: "Oops. can't update contact. Please try again." }, 500);
    }
}

//remove contact from profile.
exports.remove_contact = function(req, res, next) { 
    try {
        var logged_user = req.user;
        var actor = req.actor;
        actor.created_by_id = logged_user.id;
        var contact = actor.contacts.id(req.params.contact_id);
        // if the contact is pending remove it.
        if(contact.pending == true && actor.pending_email == contact.value) {
            actor.pending_email = null;
            actor.pending_email_security = null;
        }
        contact.remove();
        actor_middleware.save_actor(actor, function (err) {
            if (err) {
                logger.debug(err.message);
                res.send({ error: "Oops, can't remove contact. Please try again." });
            } else {
                res.send({ del: true, to: "#contact_" + req.params.contact_id });
            }
        });
    } catch(e) {
        res.json({ error: "Oops. can't remove contact. Please try again." }, 500);
    }
}

//change main contact to new e-mail.
exports.change_main_contact = function(req, res, next) { 

    var token_id = req.params.token_id;
    var actor = req.actor;
    if(actor == null) {
        next(new Error("cannot find user"));
    } else {
        // try to see if the token stills exists.
        var token = actor.tokens.attr("value", token_id);
        if(token == null) {
            logger.debug("cannot find token with value " + token_id);
            throw new Error("Oops. can't change main e-mail. Please try again.");
        }
        
        // remove token.
        token.remove();
        
        // try to see if the pending email stills exists.
        if(actor.pending_email == null) {
            logger.debug("cannot find contact with value " + actor.pending_email);
            throw new Error("Oops. can't change main e-mail. Please try again.");
        } 
        
        // change email.
        actor.email = actor.pending_email;
        actor.pending_email = null;
        
        actor_middleware.save_actor(actor, function(err) {
            if (err) {
                logger.debug(err.message);
                next(err);
            }
            else {
                res.render('profile/confirm_email_change', {
                    errors: [],
                    actor: actor,
                    title: 'Changed e-mail for ' + actor.name
                }); 
            }
        });
        
    } 
}

//*********************//
//  Password actions   //
//*********************//

exports.show_change_profile_password = function(req, res, next) {
    
    var logged_user = req.user;
    
    res.render('profile/change_password', {
        title: logged_user.name + ' : Change Password',
        errors: []
    });
    
}

// change profile password.
exports.change_profile_password = function(req, res, next) { 

    var logged_user = req.user;
    var actor = req.actor;
    
    var old_pass = req.body.old_pass;
    var pass = req.body.pass;
    var pass_confirm = req.body.pass_confirm;
    
    if(old_pass == null || old_pass == "") {
        var errors = {old_pass: 'current password cannot be empty'};
        res.render('profile/change_password', {
            title: logged_user.name + ' : Change Password',
            errors: errors
        });
        return;
    }
    
    if(pass == null || pass == "") {
        var errors = {pass: 'new password cannot be empty'};
        res.render('profile/change_password', {
            title: logged_user.name + ' : Change Password',
            errors: errors
        });
        return;
    } 
    else if(pass != pass_confirm) {
        var errors = {pass: 'new password must be the same in the two text boxes'};
        res.render('profile/change_password', {
            title: logged_user.name + ' : Change Password',
            errors: errors
        });
        return;
    }
    
    Step(
       function find_actor() {
            actor.password = old_pass;
            // manually login the user once successfully signed up
            req.logIn(actor, this);
       },
       function save_actor(err) {
           if (err) {
                logger.error(err);
                var errors = {old_pass: 'current password is wrong'};
                res.render('profile/change_password', {
                     title: logged_user.name + ' : Change Password',
                     errors: errors
                });
                return;
            } else {
                // set new pass and save it.
                actor.password = pass;
                actor_middleware.save_actor(actor, this);
            }
       },
       function send_result(err, actor) {
           if (err) {
               throw next(err);
           }
           else {
               res.render('profile/reset_pass_success', {
                    public: false,
                    title: 'Password changed successfully'
               });
           }
       }
    );
}

// show lost password page.
exports.show_forgot_password = function(req, res, next) {
    res.locals.title = 'Forgot password?';
    res.render('profile/forgot_pass', {
        errors: [],
        email_error: '',
        email: ''
    }); 
}


//reset profile password.
exports.forgot_password = function(req, res, next) { 

  var logged_user = req.user;
  var email = req.body.email;
  
  var errors = {};
  if(email == undefined || email == "") {
      errors["email"] = "Please add your email account in the text box.";
      res.locals.title = 'Forgot password?';
      res.render('profile/forgot_pass', {
          email_error: 'error',
          errors: errors
      }); 
      return;
  } else if(!utils.email_filter().test(email)) {
      errors["email"] = "Please enter a valid Email.";
      res.locals.title = 'Forgot password?';
      res.render('profile/forgot_pass', {
          email_error: 'error',
          errors: errors,
          email: email
      }); 
      return;
  }
  
  var actor;
  var crypt;
  var failed = false;
  
  Step(  
     function get_user() {
         Actor.findOne({'email': email}, this);
     },
     function find_actor(err, actor_in_db) {
         actor = actor_in_db;
         if (err) {
             logger.debug(err);
             failed = true;
             throw error;
         } else if(actor == null) {
             failed = true;
             logger.debug("cannot find user with email " + email);
             errors["email"] = "Sorry, cannot find user with this email. Please contact the site administrator: help@helppier.com";
             return null;
         } else {
             
             // create new actor token.
             crypt = crypto.randomBytes(16).toString('hex');
             var new_token = {value: crypt, sent_at: new Date(), type: 0};
             // add new token.
             actor.tokens.push(new_token);
             
             actor_middleware.save_actor(actor, this); 
         }
         
     },
     function show(err) {
         
         if(err) {
            failed = true;
            errors["email"] = "Oops. Something went wrong. Please try again.";
         } 
         
         if(failed) {
             res.locals.title = 'Lost password?';
             res.render('profile/forgot_pass', {
                 errors: errors,
                 email_error: 'error',
                 email: email
             }); 
         } else {
             
             // send e-mail to reset password.
             var client = queue.get_client();
             client.enqueue('send_mail', {
                 title: 'reset password: ' + actor.email,
                 to: actor.email,
                 actor_id: actor.id,
                 values: {crypt: crypt},
                 host: req.headers.host,
                 // e-mail subject
                 subject: 'Helppier Password Reset Confirmation',
                 // template used to send e-mail
                 template: 'reset_pass'
             }, function (err, job) {
                if (err) {
                    logger.error(err);
                }
                logger.debug('enqueued:', job.data);
            });
             
             res.locals.title = 'Sent e-mail with instructions';
             res.render('profile/forgot_pass_success', {}); 
             
         }
     }
  );
}

//show view to reset profile password.
exports.show_reset_password = function(req, res, next) { 

    var actor = req.actor;
    if(actor == null) {
        next(new Error("cannot find user"));
    } else {
        res.locals.title = 'Reset pass for ' + actor.name;
        res.render('profile/reset_pass', {
            account_pass_error: '',
            pass_confirm_error: '',
            errors: []
        }); 
    }
}

//reset profile password.
exports.reset_password = function(req, res, next) { 

    var logged_user = req.user;
    var actor = req.actor;
    if(actor == null) {
        next(new Error("cannot find user"));
    } else {
        var pass = req.body.account.pass;
        var pass_confirm = req.body.account.pass_confirm;
        
        var errors = {};
        var failed = false;

        var account_pass_error = "";
        var pass_confirm_error = "";
        if(pass == null || pass == "") {
            errors["pass"] = 'password cannot be empty';
            account_pass_error = "error";
            failed = true;
        } 
        else if(pass != pass_confirm) {
            errors["pass_confirm"] = 'password must be the same in the two text boxes';
            pass_confirm_error = "error";
            failed = true;
        }
        
        if(failed) {
            res.locals.title = 'Reset pass for ' + actor.name;
            res.render('profile/reset_pass', {
                errors: errors,
                account_pass_error: account_pass_error,
                pass_confirm_error: pass_confirm_error
            }); 
            return;
        }
        
        // remove token.
        var token = actor.tokens.attr("value", token_id);
        actor.tokens.id(token.id).remove();
        actor.password = pass;
        actor_middleware.save_actor(actor, function (err) {
            if(err) {
                logger.debug(err);
                next(err);
            } else {
                res.render('profile/reset_pass_success', {
                    public: true,
                    title: 'Password changed successfully!'
                }); 
            }
        });
    }
}

//*********************//
// Invitation actions  //
//*********************//

//show view for actor invitation.
exports.show_invitation = function(req, res, next) { 
    var actor = req.actor;
    if (actor != null) {
       res.render('profile/invitation', {
            errors: [],
            actor: actor,
            show_login: false,
            title: 'Invitation for ' + actor.name
        }); 
    } else {
        next(new Error("cannot find user"));
    }
}

//reset account password.
exports.complete_invitation = function(req, res, next) { 
    
    var actor = req.actor;
    if(actor == null) {
        next(new Error("cannot find user"));
    } else {
        
        var name = req.body.account.name;
        var pass = req.body.account.pass;
        var pass_confirm = req.body.account.pass_confirm;
        var token_id = req.params.token_id;
        
        var errors = {};
        var failed = false;
        if(name == null || name == "") {
            errors["name"] = 'name cannot be empty';
            failed = true;
        } 
        
        if(pass == null || pass == "") {
            errors["pass"] = 'password cannot be empty';
            failed = true;
        } 
        else if(pass != pass_confirm) {
            errors["pass_confirm"] = 'password must be the same in the two text boxes';
            failed = true;
        }
        
        if(failed) {
            res.render('profile/invitation', {
                errors: errors,
                actor: actor,
                show_login: false,
                 title: 'Invitation for ' + actor.name
            }); 
            return;
        } 
        
        var token = Actor.attr(actor.tokens, "value", token_id);
        actor.name = name;
        actor.state = Actor.ACTIVE;
        actor.password = pass;
        actor.invited_by = token.created_by_id;
        // remove token.
        actor.tokens.id(token.id).remove();
        actor_middleware.save_actor(actor, function (err) {
            if(err) {
                logger.debug(err);
                next(err);
            } else {
                // manually login the user once successfully signed up
                req.logIn(actor, function(err) {
                    if (err) {
                        logger.error(err);
                        errors.push('Failed login.');
                        res.render('profile/invitation', {
                            errors: errors,
                            actor: actor,
                            show_login: false,
                            title: 'Invitation for ' + actor.name
                        }); 
                    }else {
                        res.redirect(res.locals.url_mount("/"));
                    }
                });
            }
        });
    }
}

// flag profile.
exports.flag_profile = function(req, res, next) {
     var logged_user = req.user;
    
     var noti_id = req.params.notification_id;
     var flag_reason = req.body.reason;
     
     var actor = req.actor;
     
     var now = new Date();
     var flag = {reason: flag_reason, actor_id: active_account.id, user_id: logged_user.id, createdAt: now, updatedAt: now};
     // TODO: must change mongoose so the embebbed object is returned 
     // as a new param in the save callback.
     // http://groups.google.com/group/mongoose-orm/browse_thread/thread/94c0888671f63fb9/0d607086fd3d7d44?lnk=gst&q=document+id#
     actor.flags.push(flag);
     actor.is_flagged = true;
     actor_middleware.save_actor(actor, function(err){
         if (err) {
             logger.error(err.message);
             res.send({ error: "Oops, something when wrong. Please try again." });
         } else {
             res.send({ message: "Profile flagged as inappropriate."});
         }
     });
}

