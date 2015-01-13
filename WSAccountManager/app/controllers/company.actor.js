/**
 * Module dependencies.
 */ 
var mongoose = require('mongoose'),
    Step = require('step'),
    async = require('async'),
    // library to generate actor_id.
    crypto = require('crypto'),
    fs = require('fs'),
    logger = require('../config/logger').logger(),
    queue = require('../config/queue'),
    utils = require('../lib/utils'),
    actor_middleware = require('../middlewares/actor_middleware'),
    _ = require("underscore");

// Parse ISO 8601.
// https://github.com/JerrySievert/node-date-utils
// http://legitimatesounding.com/blog/Node_js_Date_Utils.html
require('date-utils');
   
var Actor = mongoose.model('Actor');
var Role = mongoose.model('Role');
var Site = mongoose.model('Site');
var Company = mongoose.model('Company');

exports.load = function(req, res, next, actor_id) {
    Actor.findById(actor_id, function (err, actor) {
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

// show company actors.
exports.index = function(req, res, next) {
    
    var page = parseInt(req.params.page) || 1;
    res.locals.page = page;
    
    var limit = utils.paginate_limit();
    var from = (page - 1) * limit;
    
    var company = req.company;
    var sites = null;
    
    Step(  
            function get_all_company_sites() {
                Site.find({company_id: company.id}, this);
            },
            function get_all_company_sites(err, sites_in_db) {
                if (err) {
                    logger.debug(err);
                    return next(err);
                }
                sites = sites_in_db;
                Actor.find({ 'permissions.type': {'$in': Actor.ALL_PERMISSIONS }, 'permissions.obj_id': company.id }, {}, { sort: {"name": 1}, limit: 5 }, this);
            }, 
            function get_all_company_actors_and_render(err, actors) {
                if (err) {
                    logger.debug(err);
                    next(err);
                }
                else {
                    
                    var updated_by_ids = [];
                    actors.forEach(function(actor) {
                        if (actors.updated_by_id != null) {
                            updated_by_ids.push(actors.updated_by_id);
                        }
                    });
                    
                    // find actors that change .
                    Actor.find({ '_id': {"$in": updated_by_ids}}, function(err, updated_by_list) {
                        if(err) {
                            next(err);
                        } else {
                            
                            var updated_by_id = [];
                            updated_by_list.forEach(function(updated_by) {
                                updated_by_id[updated_by.id] = updated_by;
                            });
                            
                            var actors_with_created_by = [];
                            
                            var actors_info = [];
                            actors.forEach(function(actor) {
                                var actor_permissions = actor.permissions;
                                
                                var updated_by = updated_by_id[actor.updated_by_id];
                                var updated_by_info;
                                if(updated_by != null) {
                                    updated_by_info = {id: updated_by.id, name: updated_by.name};
                                } else {
                                    updated_by_info = {id: "", name: ""};
                                }
                                
                                //TODO: Check company_admin, state_info and actor_permissions_with_names
                                
                                 var actor_permissions_with_names = [];

                                var is_admin = false;
                                for (var i = 0; i < actor.roles.length; i++) {
                                    if (actor.roles[i].type == Role.ADMIN) {
                                        is_admin = true;
                                    };
                                };
                                var state_info = actor_middleware.state_str(actor.state);
                                var actor_info = {_id: actor.id
                                    , company_admin: is_admin, name: actor.name
                                    , email: actor.email, state: actor.state
                                    , state_info: state_info, updated_by: updated_by_info
                                    , sites: actor_permissions_with_names};
                                actors_info.push(actor_info);
                            });
                            res.render('actors/actors', {
                                actors: actors_info,
                                company: company,
                                sites: sites,
                                title: req.company.name + ' Users'
                            });
                        }
                    });
                }
            }
    );
}

//add user to company.
exports.invite = function(req, res, next) {
    
    var logged_user = req.user;
    var company = req.company;
    
    var actor = null;
    
    var crypt;
    var email_filter = utils.email_filter();

    var name = req.body.name;
    var email = req.body.email;
    var pass = req.body.pass;
    var selected_permissions = req.body.sites;
    // remove spaces in email string.
    var email = email.replace(/ /g,"");
    // check if the email is valid.
    if (!email_filter.test(email)) {
        logger.error("invalid e-mail " + email);
        res.send({ errors: {email: "Oops. The email you added in not valid. Please change it and try again." } }, 400);
        return;
    } 
    
    // if its a company admin add it to permissions.
    if(req.body.company_admin) {
        selected_permissions.push(company.id + "_admin");
    }
    
    // don't invite user if no sites were selected.
    if (selected_permissions.length == 0) {
        logger.error("no sites selected for user");
        var errors = {};
        errors[company.id] = "Oops. Please select at least one of the checkboxes.";
        res.send({ errors: errors }, 400);
        return;
    } 
    
    Actor.findOne({'email': email}, function(err, actor) {
        
        if (err) {
            res.send({ errors: {general: "Oops. can't update user. Please try again." } }, 500);
            return;
        }
        // if the actor exists and is not in the invited state, there is no need to send the e-mail again.
        if(actor != null) {
            res.send({ errors: {email: "Oops. Cannot invite user. E-mail " + email + " is already taken!" } }, 500);
            return;
        } else {
            
            if(actor == null) {
                actor = new Actor();
            }
            
            var sites_plus_company_names = [];
            var all_permissions_for_company_plus_sites = [];
            
            async.parallel(
                    [
                        function check_if_actor_already_exists(callback) {
                            Actor.findOne({'email': email}, callback);
                        }, function get_all_company_sites(callback) {
                            Site.find({ company_id: company.id}, callback);
                        },
                        function find_normal_role(callback) {
                         // find normal role.
                            Role.findOne({rtype: Role.NORMAL}, callback);
                        },
                    ], function(err, results) {
                        if (err) {
                            res.send({ errors: {general: "Oops. can't update user. Please try again." } }, 500);
                            return;
                        }
                        
                        var actor_in_db = results[0];
                        var sites = results[1];
                        var normal_role = results[2];
                        
                        if(actor_in_db != null) {
                            res.send({ errors: {email: "Someone already has claimed that email." } }, 400);
                        }
                         
                        if(normal_role == null) {
                            res.send({ errors: {general: "Oops. can't update user. Please try again." } }, 500);
                            return;
                        }
                        
                        sites.forEach(function(site) {
                            all_permissions_for_company_plus_sites.push(site.id);
                            sites_plus_company_names[site.id] = site.url;
                        });
                        all_permissions_for_company_plus_sites.push(company.id);
                        sites_plus_company_names[company.id] = company.name;
                        
                        var permissions_to_add = null;
                        // check if the user is an admin.
                        if(_.indexOf(selected_permissions, company.id + "_admin") > -1) {
                            permissions_to_add = [{type: Actor.PERMISSION_COMPANY_ADMIN, obj_id: company.id}, {type: Actor.PERMISSION_ALL_COMPANY_SITES, obj_id: company.id}];
                        // check if the user has access to all sites.
                        } else if(_.indexOf(selected_permissions, company.id) > -1) {
                            permissions_to_add = [{type: Actor.PERMISSION_ALL_COMPANY_SITES, obj_id: company.id}];
                        } else {
                            // double check that sites that were selected exists in company.
                            // this is a security measure so the user cannot add sites from other companies.
                            selected_permissions = _.intersection(selected_permissions, all_permissions_for_company_plus_sites);
                            permissions_to_add = [];
                            selected_permissions.forEach(function(permission_site_id) {
                                permissions_to_add.push({type: Actor.PERMISSION_SITE, obj_id: permission_site_id});
                            });
                        }
                        // this next permissions is just to set this actor as a member of this company, 
                        // so even if the company sites are removed, the actor can still be seen in this company.
                        permissions_to_add.push({type: Actor.PERMISSION_COMPANY, obj_id: company.id});
                        actor.permissions = permissions_to_add;
                        
                        actor.roles.push({role_id: normal_role._id});
                        actor.email = email;
                        actor.name = name;
                        // set user that made the invitation so this can be tracked.
                        actor.created_by_id = logged_user.id;
                        actor.updated_by_id = logged_user.id;
                        
                        // set temporary password
                        actor.password = crypto.randomBytes(8).toString('hex');
                        
                        // create new actor token.
                        crypt = crypto.randomBytes(16).toString('hex');
                        var new_token = {value: crypt, sent_at: new Date(), type: 1, created_by_id: logged_user.id};
                        // add new token.
                        actor.tokens.push(new_token);
                        
                        // set user state as invited.
                        actor.state = Actor.ACTIVE;
                        actor.company_id = company.id;

                        actor.password = pass;
                        actor.invited_by = actor.created_by_id;
                        
                        actor_middleware.save_actor(actor, function(err, actor) {
                            
                            if (err) {
                                logger.error(err);
                                res.send({ errors: {general: "Oops. can't invite user. Please try again." } }, 500);
                            } else {
                                
                                var values = {};
                                values.company_name = company.name;
                                values.crypt = crypt;
                                
                                var company_admin = false;
                                var actor_permissions_with_names = [];
                                // check if the user is an admin.
                                if(_.indexOf(selected_permissions, company.id + "_admin") > -1) {
                                    company_admin = true;
                                } 
                                // check if the user has access to specific or all sites.
                                selected_permissions.forEach(function(site_or_company) {
                                    var name = sites_plus_company_names[site_or_company];
                                    if(typeof name !== undefined && name != null) {
                                        actor_permissions_with_names.push({id: company.id, name: name});
                                    }
                                });
                                
                                // send success info to user interface.
                                var updated_by_info = {id: logged_user.id, name: logged_user.name};
                                var state_info = actor_middleware.state_str(actor.state);
                                
                                var actor_with_info = {_id: actor.id, company_admin: company_admin, name: actor.name, email: actor.email, state: actor.state, state_info: state_info, updated_by: updated_by_info, sites: actor_permissions_with_names};
                                res.json(actor_with_info);
                            }
                            
                        });
                        
                    }
                
                );
            
            
        }
    });
    
}

exports.update = function(req, res, next) {
    
    var logged_user = req.user;
    var company = req.company;
    var actor = req.actor;
    

    // check if its a state change.
    if(req.body.state != actor.state) {

        if (req.body.state == Actor.DEACTIVATED) {
            actor_middleware.disable(req, res, next);
        };
        if (req.body.state == Actor.ACTIVE) {
            actor_middleware.enable(req, res, next);
        };

    } else {
        
        var selected_permissions = req.body.sites;
        
        // if its a company admin add it to permissions.
        if(req.body.company_admin) {
            selected_permissions.push(company.id + "_admin");
        }
        
        // don't allow to change user if no sites were selected.
        if (selected_permissions.length == 0) {
            logger.error("no sites selected for user");
            var errors = {};
            errors[company.id] = "Oops. Please select at least one of the checkboxes.";
            res.send({ errors: errors }, 400);
            return;
        } 
        
        var sites_plus_company_names = [];
        var all_permissions_for_company_plus_sites = [];
        var permissions_to_add = null;
        Step(  
                function get_all_company_sites() {
                    Site.find({company_id: company.id}, this);
                },
                function save_actor(err, sites) {
                    if (err) {
                        throw err;
                    }
                    else {
                        sites.forEach(function(site) {
                            all_permissions_for_company_plus_sites.push(site.id);
                            sites_plus_company_names[site.id] = site.url;
                        });
                        all_permissions_for_company_plus_sites.push(company.id);
                        all_permissions_for_company_plus_sites.push(company.id + "_admin");
                        sites_plus_company_names[company.id] = company.name;
                        
                        // check if the user is an admin.
                        if(_.indexOf(selected_permissions, company.id + "_admin") > -1) {
                            permissions_to_add = [company.id, company.id + "_admin"];
                        // check if the user has access to all sites.
                        } else if(_.indexOf(selected_permissions, company.id) > -1) {
                            permissions_to_add = [company.id];
                        } else {
                            // double check that sites that were selected exists in company.
                            // this is a security measure so the user cannot add sites from other companies.
                            permissions_to_add = _.intersection(selected_permissions, all_permissions_for_company_plus_sites);
                        }
                        
                        var actor_permissions = actor.permissions;
                        // remove permissions if needed.
                        var permissions_to_remove = _.difference(all_permissions_for_company_plus_sites, selected_permissions);
                        permissions_to_remove.forEach(function(permission) {
                            if(permission.indexOf("_admin") > -1) {
                                var company_permission = Actor.two_attrs(actor_permissions, "type", Actor.PERMISSION_COMPANY_ADMIN, "obj_id", company.id);
                                if(company_permission != null) {
                                    company_permission.remove();
                                }
                            } else if(permission.indexOf(company.id) > -1) {
                                var company_all_sites_permission = Actor.two_attrs(actor_permissions, "type", Actor.PERMISSION_ALL_COMPANY_SITES, "obj_id", company.id);
                                if(company_all_sites_permission != null) {
                                    company_all_sites_permission.remove();
                                }
                            } else {
                                var site_permission = Actor.attr(actor_permissions, "obj_id", permission);
                                if(site_permission != null) {
                                    site_permission.remove();
                                }
                            }
                        });
                        
                        // add permissions if they don't exist.
                        permissions_to_add.forEach(function(permission) {
                            if(permission.indexOf("_admin") > -1) {
                                // try to check if admin permissions already exist and if they don't add them.
                                var company_permission = Actor.two_attrs(actor_permissions, "type", Actor.PERMISSION_COMPANY_ADMIN, "obj_id", company.id);
                                if(company_permission == null) {
                                    actor_permissions.push({type: Actor.PERMISSION_COMPANY_ADMIN, obj_id: company.id});
                                    var company_all_sites_permission = Actor.two_attrs(actor_permissions, "type", Actor.PERMISSION_ALL_COMPANY_SITES, "obj_id", company.id);
                                    if(company_all_sites_permission == null) {
                                        actor_permissions.push({type: Actor.PERMISSION_ALL_COMPANY_SITES, obj_id: company.id});
                                    }
                                }
                            } else if(permission.indexOf(company.id) > -1) {
                                // try to check if permission already exist and if it does't add it.
                                var company_all_sites_permission = Actor.two_attrs(actor_permissions, "type", Actor.PERMISSION_ALL_COMPANY_SITES, "obj_id", company.id);
                                if(company_all_sites_permission == null) {
                                    actor_permissions.push({type: Actor.PERMISSION_ALL_COMPANY_SITES, obj_id: company.id});
                                }
                            } else {
                                // try to check if permission already exist and if it does't add it.
                                var site_permission = Actor.attr(actor_permissions, "obj_id", permission);
                                if(site_permission == null) {
                                    actor_permissions.push({type: Actor.PERMISSION_SITE, obj_id: permission});
                                }
                            }
                        });
                        
                        // re set permissions.
                        actor.permissions = _.clone(actor_permissions);
                        
                        // set user that made this changes.
                        actor.updated_by_id = logged_user.id;
                        actor_middleware.save_actor(actor, this);
                    }
                },
                function send_response(err) {
                    if (err) {
                        logger.error(err);
                        res.send({ errors: {general: "Oops. can't update user. Please try again." } }, 500);
                    } else {
                        var company_admin = false;
                        var actor_permissions_with_names = [];
                        // check if the user is an admin.
                        if(_.indexOf(selected_permissions, company.id + "_admin") > -1) {
                            company_admin = true;
                        } 
                        // check if the user has access to specific or all sites.
                        permissions_to_add.forEach(function(site_or_company_id) {
                            var name = sites_plus_company_names[site_or_company_id];
                            if(typeof name !== undefined && name != null) {
                                actor_permissions_with_names.push({id: site_or_company_id, name: name});
                            }
                        });
                        
                        // send success info to user interface.
                        var updated_by_info = {id: logged_user.id, name: logged_user.name};
                        var state_info = actor_middleware.state_str(actor.state);
                        
                        var actor_with_info = {_id: actor.id, company_admin: company_admin, name: actor.name, email: actor.email, state: actor.state, state_info: state_info, updated_by: updated_by_info, sites: actor_permissions_with_names};
                        res.json(actor_with_info);
                    }
                }  
        );  
    }
    
}

exports.enable = function(req, res, next) {
    
    var logged_user = req.user;
    var company = req.company;
    var actor = req.actor;
    
    // don't allow user to remove company main actor (the one that created the main account).
    if(actor.state != Actor.DEACTIVATED) {
        res.send({ errors: { general: "Oops. Can't enable user because its not inactive." } }, 500);
        return;
    }
    
    actor.state = Actor.ACTIVE;
    // set user that made this change.
    actor.updated_by_id = logged_user.id;
    
    // save actor from db.
    actor_middleware.save_actor(actor, function(err) {
        if (err) {
            res.send({ errors: { general: "Oops. Something went wrong. Please try again." } }, 500);
        } else {
            var changed_by_info = {id: logged_user.id, name: logged_user.name};
            var info = "An email invitation was sent to the user.";
            var state_info = actor_middleware.state_str(actor.state);
            var actor_with_info = {_id: actor.id, name: actor.name, email: actor.email, state: actor.state, state_info: state_info, created_by: changed_by_info};
            res.json(actor_with_info);
        }
    });
    
}

exports.disable = function(req, res, next) {
    actor_middleware.disable(req, res, next);
}

exports.remove = function(req, res, next) {
    actor_middleware.remove(req, res, next);
}
