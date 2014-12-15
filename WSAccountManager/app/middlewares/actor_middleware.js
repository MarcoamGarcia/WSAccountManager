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
    _ = require("underscore");
    
var Actor = mongoose.model('Actor');
var Site = mongoose.model('Site');

// save actor in db.
exports.save_actor = save_actor;
function save_actor(actor, callback) {
    actor.save(function (err, actor) {
        if(err) {
            callback(err);
        } else {
            callback(null, actor);
        }
    });
}

// remove actor in db.
exports.remove_actor = remove_actor;
function remove_actor(actor, callback) {
    var actor_id = _.clone(actor.id);
    actor.remove(function (err) {
        if(err) {
            callback(err);
        } else {
            logger.debug("actor_id: " + actor_id);
            callback();
        }
    });
}

exports.state_str = state_str;
function state_str(state) {
     // if(x == undefined) is testing the value
    // if (typeof x = undefined) is testing the existence of x
    // http://bytes.com/topic/javascript/answers/594279-typeof-x-undefined-x-undefined
    if(state == undefined) {
        return "";
    }
    
    if(state.toString() == Actor.INVITED.toString()) {
        return "Invited";
    }
    else if(state.toString() == Actor.ACTIVE.toString()) {
        return "Active";
    }
    else if(state.toString() == Actor.DEACTIVATED.toString()) {
        return "Deactivated";     
    }
    else if(state.toString() == Actor.REGISTERED.toString()) {
        return "Waiting for approval";
    }
    else if(state.toString() == Actor.REJECTED.toString()) {
        return "Rejected";
    } else {
        return "";
    }
}

exports.get_sites = get_sites;
function get_sites(actor, company, callback) {
    
    var actor_permissions = actor.permissions;
    var company_id = company.id;

    // check if the user can change all company site objects.
    var all_sites = false;
    var all_sites_permission = Actor.two_attrs(actor_permissions, "type", Actor.PERMISSION_ALL_COMPANY_SITES, "obj_id", company.id);
    if(all_sites_permission != null) {
        all_sites = true;
    } else {
        // or if it is a company admin.
        var company_permission = Actor.two_attrs(actor_permissions, "type", Actor.PERMISSION_COMPANY_ADMIN, "obj_id", company.id);
        if(company_permission != null) {
            all_sites = true;
        }
    }

    if(all_sites) {
      Site.find({'company_id': company.id}, callback);
    } else {
      var site_permissions = Actor.attrs(actor_permissions, "type", Actor.PERMISSION_SITE);
      var site_ids = [];
      _.each(site_ids, function(site_id, key, list){
        site_ids.push(site_id.obj_id);
      });
      Site.find({'_id': {"$in": site_ids}, 'company_id': company.id}, callback);
    }
}


function disable_in_db(logged_user, actor, company, callback) {
    

    // don't allow user to remove company main actor.
    var site_permission = Actor.attr(actor.permissions, "type", Actor.PERMISSION_COMPANY_ADMIN);
        
    if(site_permission != null) {
        var error = new Error("Oops. Can't disabled user because its the main user in a company.");
        error.name = 'user';
        callback(error);
        return;
    }
    
    // don't allow to remove if its your user.
    if(logged_user.id == actor.id) {
        var error = new Error("Oops. Can't disabled user because its you.");
        error.name = 'user';
        callback(error);
        return;
    }
    
    actor.state = Actor.DEACTIVATED;
    // set user that made this change.
    actor.updated_by_id = logged_user.id;
    // remove tokens.
    actor.tokens = [];
    
    // save actor from db.
    save_actor(actor, callback);
    
}


exports.disable = disable;
function disable(req, res, next) {
        
    var logged_user = req.user;
    var company = req.company;
    var actor = req.actor;
    
    var logged_user = req.user;
    var actor = req.actor;

    disable_in_db(logged_user, actor, company, function(err) {
        if (err) {
            var err_srt = "Oops. Something went wrong. Please try again.";
            if (err.name = 'user') {
                err_srt = err.message;
            } 
            res.send({ errors: { general: err_srt } }, 500);
        } else {
            var created_by_info = {id: logged_user.id, name: logged_user.name};
            var updated_by_info = {id: logged_user.id, name: logged_user.name};
            var state_info = state_str(actor);
            var actor_with_info = {_id: actor.id, name: actor.name, email: actor.email, state: actor.state, state_info: state_info, info: "Inactive", created_by: created_by_info, updated_by: updated_by_info};
            res.json(actor_with_info);
        }
    });
        
}

exports.enable = enable;
function enable(req, res, next) {
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
    
    // save actor in db.
    save_actor(actor, function(err) {
        if (err) {
            res.send({ errors: { general: "Oops. Something went wrong. Please try again." } }, 500);
        } else {
            var created_by_info = {id: logged_user.id, name: logged_user.name};
            var updated_by_info = {id: logged_user.id, name: logged_user.name};
            var state_info = state_str(actor.state);
            var actor_with_info = {_id: actor.id, name: actor.name, email: actor.email, state: actor.state, state_info: state_info, created_by: created_by_info, updated_by: updated_by_info};
            res.json(actor_with_info);
        }
    });
}

exports.remove = remove;
function remove(req, res, next) {
    var logged_user = req.user;
    var company = req.company;
    var actor = req.actor;
    
    // don't allow user to remove company main actor.
    var site_permission = Actor.attr(actor.permissions, "type", Actor.PERMISSION_COMPANY_ADMIN);
    if(site_permission != null) {
        res.send({ errors: { general: "Oops. Can't remove user because its the main user in a company." } }, 500);
        return;
    }
    
    // don't allow to remove if its your user.
    if(logged_user.id == actor.id) {
        res.send({ errors: { general: "Oops. Can't remove user because its you." } }, 500);
        return;
    }
    
    // remove actor from db.
    remove_actor(actor, function(err) {
        if (err) {
            res.send({ errors: { general: "Oops. Something went wrong. Please try again." } }, 500);
        } else {
            res.send({ del: true });
        }
    });
}

exports.approve = approve;
function approve(req, res, next) {
    var logged_user = req.user;
    var company = req.company;
    var actor = req.actor;
    
    // don't allow user to remove company main actor (the one that created the main account).
    if(actor.state != Actor.REGISTERED) {
        res.send({ errors: { general: "Oops. Can't reject user because its not in the 'waiting for approval' state." } }, 500);
        return;
    }
    
    actor.state = Actor.ACTIVE;
    // set user that made this change.
    actor.updated_by_id = logged_user.id;

    //update the register date with the the approval date
    var reg_date = new Date().toISOString();
    actor.register_date = reg_date;
    
    // save actor in db.
    save_actor(actor, function(err) {
        if (err) {
            res.send({ errors: { general: "Oops. Something went wrong. Please try again." } }, 500);
        } else {
            var created_by_info = {id: logged_user.id, name: logged_user.name};
            var updated_by_info = {id: logged_user.id, name: logged_user.name};
            var info = "An email invitation was sent to the user.";
            var state_info = state_str(actor.state);
            var actor_with_info = {_id: actor.id, name: actor.name, email: actor.email, state: actor.state, state_info: state_info, created_by: created_by_info
                , updated_by: updated_by_info};
            res.json(actor_with_info);

            //producer with mongoskin, to send the email
            var client = queue.get_client();
            client.enqueue('send_mail', {
                title: 'Welcome to Helppier: ' + actor.email,
                to: actor.email,
                actor_id: actor.id,
                host: req.headers.host,
                // e-mail subject
                subject: 'Welcome to Helppier',
                // template used to send e-mail
                template: 'send_welcome_user'
            }, function (err, job) {
                if (err) {
                    logger.error(err);
                }
                logger.debug('enqueued:', job.data);
            });
        }
    });
}

exports.reject = reject;
function reject (req, res, next) {
    var logged_user = req.user;
    var company = req.company;
    var actor = req.actor;
    
    // don't allow user to remove company main actor (the one that created the main account).
    if(actor.state != Actor.REGISTERED) {
        res.send({ errors: { general: "Oops. Can't reject user because its not in the 'waiting for approval' state." } }, 500);
        return;
    }
    
    actor.state = Actor.REJECTED;
    // set user that made this change.
    actor.updated_by_id = logged_user.id;
    
    // save actor in db.
    save_actor(actor, function(err) {
        if (err) {
            res.send({ errors: { general: "Oops. Something went wrong. Please try again." } }, 500);
        } else {
            var created_by_info = {id: logged_user.id, name: logged_user.name};
            var updated_by_info = {id: logged_user.id, name: logged_user.name};
            var state_info = state_str(actor.state);
            var actor_with_info = {_id: actor.id, name: actor.name, email: actor.email, state: actor.state, state_info: state_info, created_by: created_by_info, updated_by: updated_by_info};
            res.json(actor_with_info);
        }
    });
}

//convert isoDate to timestamp
exports.timestamp = timestamp;
function timestamp (date) {
    var startTime = new Date(date);
    var dd = startTime.getDate();
    var mm = startTime.getMonth();
    var yyyy = startTime.getFullYear();

    today = mm+'/'+dd+'/'+yyyy;
    var reg_date = new Date(today).getTime();

    return reg_date;
}