/**
 * Module dependencies.
 */

var mongoose = require('mongoose'),
    Step = require('step'),
    async = require('async'),
    _ = require("underscore"),
    utils = require('../lib/utils'),
    queue = require('../config/queue'),
    actor_middleware = require('../middlewares/actor_middleware'),
    // library to generate actor_id.
    crypto = require('crypto'),
    logger = require('../config/logger').logger();
  
// Parse ISO 8601.
// https://github.com/JerrySievert/node-date-utils
// http://legitimatesounding.com/blog/Node_js_Date_Utils.html
require('date-utils');
   
var Actor = mongoose.model('Actor');
var Role = mongoose.model('Role');
var Company = mongoose.model('Company');

// show all actors.
exports.index = function(req, res, next) {
    
    var page = parseInt(req.params.page) || 1;
    res.locals("page", page);
    
    var from = (page - 1) * utils.paginate_limit();
    
    Actor.find({}).limit(utils.paginate_limit).sort('-name').exec(function(err, actors) {
        
        if(err) {
            next(err);
        } else {
            
            // get created by actors from database.
            var created_and_updated_by_ids = [];
            var company_ids = [];
            var actor_with_company_ids = [];
            actors.forEach(function(actor) {
                if(actor.created_by_id != null) {
                    created_and_updated_by_ids.push(actor.created_by_id);
                }
                if(actor.updated_by_id != null) {
                    created_and_updated_by_ids.push(actor.updated_by_id);
                }
                actor.permissions.forEach(function(permission) {
                    if(permission.obj_id != null && (permission.type == Actor.PERMISSION_ALL_COMPANY_SITES || permission.type == Actor.PERMISSION_COMPANY_ADMIN)) {
                        company_ids.push(permission.obj_id);
                        actor_with_company_ids[actor.id] = permission.obj_id;
                    }
                });
            });
            
            // removed duplicates.
            created_and_updated_by_ids = _.uniq(created_and_updated_by_ids);
            // removed duplicates.
            company_ids = _.uniq(company_ids);
            
            async.parallel([
                    function get_changed_by_actors(callback) {
                        Actor.find({ '_id': {"$in": created_and_updated_by_ids}}, callback);
                    },
                    function get_actor_roles(callback) {
                        Role.find({}, callback);
                    },
                    function get_companies(callback) {
                        Company.find({ '_id': {"$in": company_ids}}, callback);
                    },
                ], function(err, results) {
                
                    if(err) {
                        next(err);
                    } else {
                        var created_or_updated_by_list = results[0];
                        var created_or_updated_by_id = [];
                        created_or_updated_by_list.forEach(function(created_or_updated_by) {
                            created_or_updated_by_id[created_or_updated_by.id] = created_or_updated_by;
                        });
                        
                        var roles = results[1];
                        var roles_with_name = [];
                        roles.forEach(function(role) {
                            roles_with_name[role.id] = role.name;
                        });
                        
                        var companies = results[2];
                        var companies_id = [];
                        companies.forEach(function(company) {
                            companies_id[company.id] = company;
                        });

                        // create actors hash with created by and company information.
                        var actors_hash = [];
                        actors.forEach(function(actor) {
                            var created_by = created_or_updated_by_id[actor.created_by_id];
                            var created_by_info;
                            if(created_by != null) {
                                created_by_info = {id: created_by.id, name: created_by.name};
                            } else {
                                created_by_info = {id: "", name: ""};
                            }
                            var updated_by = created_or_updated_by_id[actor.updated_by_id];
                            var updated_by_info;
                            if(updated_by != null) {
                                updated_by_info = {id: updated_by.id, name: updated_by.name};
                            } else {
                                updated_by_info = {id: "", name: ""};
                            }
                            var actor_company = companies_id[actor_with_company_ids[actor.id]];
                            var company_info;
                            if(actor_company != null) {
                                company_info = {id: actor_company.id, name: actor_company.name};
                            } else {
                                company_info = {id: "", name: ""};
                            }
                            var actor_state_info = actor_middleware.state_str(actor.state);
                            
                            var actor_roles_ids = []; 
                            var actor_role_name = "";
                            actor.roles.forEach(function(actor_role) {
                                if(roles_with_name[actor_role.role_id] !== undefined) {
                                    actor_role_name = roles_with_name[actor_role.role_id];
                                }
                            });
                            
                            if(actor.company_admin && actor_company != null) {
                                actor_role_name = " / Company Admin";  
                            }
                            
                            var actor_source = "";
                            var actor_email = "";
                            // get actor type
                            if(typeof actor.email !== undefined && actor.email != null && actor.email != "") {
                                actor_source = "Normal";
                                actor_email = actor.email;
                            } else if(typeof actor.fb.id !== undefined && actor.fb.id != null) {
                                actor_source = "Facebook";
                                actor_email = "---";
                            } else if(typeof actor.twit.id !== undefined && actor.twit.id != null) {
                                actor_source = "Twitter";
                                actor_email = "---";
                            }
                            // TODO: Need to add Google+ and Github.
                            
                           logger.debug("role: " + actor_role_name);
                            var actor_hash = {_id: actor.id, source: actor_source, name: actor.name
                                , email: actor_email, state: actor.state, state_info: actor_state_info
                                , role: actor_role_name, created_by: created_by_info
                                , updated_by: updated_by_info, company: company_info};
                            actors_hash.push(actor_hash);
                        });
                        
                        res.render('admin/actors/actors', {
                            actors: actors_hash,
                            title: ' Users',
                            site_host: req.site_host
                        });
                        
                    }
                }
            );
            
        }
    });
    
}

// invite user to use application.
exports.invite = function(req, res, next) {
    var logged_user = req.user;
    
    var actor = null;
    
    var crypt;
    var email_filter = utils.email_filter();

    var name = req.body.name;
    var email = req.body.email;
    // remove spaces in email string.
    var email = email.replace(/ /g,"");
    // check if the email is valid.
    if (!email_filter.test(email)) {
       logger.error("invalid e-mail " + email);
        res.send({ errors: {email: "Oops. The email you added in not valid. Please change it and try again." } }, 500);
        return;
    } 
    
    var email_already_taken = false;
    
    Step(  
            function check_if_actor_already_exists() {
                Actor.findOne({'email': email}, this);
            },
            function find_role(err, actor_in_db) {
                actor = actor_in_db;
                if (err) {
                    throw err;
                }
                // if the actor exists and is not in the invited state, there is no need to send the e-mail again.
                else if(actor != null) {
                    email_already_taken = true;
                    throw new Error("Oops. Cannot invite user. E-mail " + email + " is already taken!");
                } else {
                    if(actor == null) {
                        actor = new Actor();
                    }
                    // find normal role.
                    Role.findOne({rtype: Role.NORMAL}, this);
                }
            },
            function save_new_actor(err, role) {
                
                if (err) {
                    throw err;
                } else if(role == null) {
                    var err_msg = "User must have a role.";
                    logger.error(err_msg);
                    throw new Error(err_msg);
                }
                
                actor.roles.push({role_id: role._id});
                actor.email = email;
                actor.name = name;
                // set user that made the invitation so this can be tracked.
                actor.created_by_id = logged_user.id;
                actor.updated_by_id = logged_user.id;

                actor.password = crypto.randomBytes(8).toString('hex');
                
                // create new actor token.
                crypt = crypto.randomBytes(16).toString('hex');
                var new_token = {value: crypt, sent_at: new Date(), type: 1, created_by_id: logged_user.id};
                // add new token.
                actor.tokens.push(new_token);
                
                // set user state as invited.
                actor.state = Actor.INVITED;
                actor_middleware.save_actor(actor, this);
                
            },
            function send_email(err) {
                if (err) {
                   logger.error(err);
                    if(email_already_taken) {
                        res.send({ errors: {email: "Someone already has claimed that email." } }, 500);
                    } else {
                        res.send({ errors: {general: "Oops. can't invite user. Please try again." } }, 500);
                    }
                } else {
                    
                    var values = {};
                    values.crypt = crypt;

                    //create producer with mongoskin, to send the email
                    var client = queue.get_client();
                    client.enqueue('send_mail', {
                        title: 'invite user: ' + actor.email,
                        values: values,
                        to: actor.email,
                        actor_id: actor.id,
                        user_id: logged_user.id,
                        host: req.headers.host,
                        // e-mail subject
                        subject: 'You have been invited to Helppier.com!',
                        // template used to send e-mail
                        template: 'invite_user'
                    }, function (err, job) {
                        if (err) {
                            logger.error(err);
                        }
                        logger.debug('enqueued:', job.data);
                    });
                    // send success info to user interface.
                    var changed_by_info = {id: logged_user.id, name: logged_user.name};
                    var info = "An email invitation was sent to the user.";
                    var state_info = actor_middleware.state_str(actor);
                    var actor_with_info = {_id: actor.id, name: actor.name, email: actor.email, state: actor.state, state_info: state_info, info: info, created_by: changed_by_info};
                    res.json(actor_with_info);
                }
            }  
    );  
}

exports.update = function(req, res, next) {
    if(req.body.action == 'approve') {
        approve(req, res, next);
    } else if(req.body.action == 'reject') {
        reject(req, res, next);
    } else if(req.body.action == 'enable') {
        enable(req, res, next);
    } else if(req.body.action == 'disable') {
        disable(req, res, next);
    } else {
        res.send({ errors: { general: "Oops. Something went wrong. Please try again." } }, 500);
    }
}

function reject(req, res, next) {
    actor_middleware.reject(req, res, next);
}

function approve(req, res, next) {
    actor_middleware.approve(req, res, next);
}

function enable(req, res, next) {
    actor_middleware.enable(req, res, next);
}

function disable(req, res, next) {
    actor_middleware.disable(req, res, next);
}

exports.remove = function(req, res, next) {
     actor_middleware.remove(req, res, next);
}