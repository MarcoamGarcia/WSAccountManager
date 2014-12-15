/**
 * Module dependencies.
 */

var mongoose = require('mongoose'),
    Step = require('step'),
    async = require('async'),
    _ = require("underscore"),
    utils = require('../lib/utils'),
    queue = require('../config/queue'),
    company_middleware = require('../middlewares/company_middleware'),
    logger = require('../config/logger').logger();
  
// Parse ISO 8601.
// https://github.com/JerrySievert/node-date-utils
// http://legitimatesounding.com/blog/Node_js_Date_Utils.html
require('date-utils');
   
var Company = mongoose.model('Company');
var Actor = mongoose.model('Actor');

// show all companies.
exports.companies = function(req, res, next) {
    
    var page = parseInt(req.params.page) || 1;
    res.locals("page", page);
    
    var from = (page - 1) * utils.paginate_limit();
    
    Company.find({}).limit(utils.paginate_limit).sort('name').exec(function(err, companies) {
        
        if(err) {
            next(err);
        } else {
            
            // get created by companies from database.
            var created_and_updated_by_ids = [];
            var company_ids = [];
            var actor_with_company_ids = [];
            companies.forEach(function(company) {
                if(company.created_by_id != null) {
                    created_and_updated_by_ids.push(company.created_by_id);
                }
                if(company.updated_by_id != null) {
                    created_and_updated_by_ids.push(company.updated_by_id);
                }
            });
            
            // removed duplicates.
            created_and_updated_by_ids = _.uniq(created_and_updated_by_ids);
            // removed duplicates.
            company_ids = _.uniq(company_ids);
            
            async.parallel([
                    function get_changed_by_companies(callback) {
                        Actor.find({ '_id': {"$in": created_and_updated_by_ids}}, callback);
                    }
                    // TODO: get company main user
                ], function(err, results) {
                
                    if(err) {
                        next(err);
                    } else {
                        var created_or_updated_by_list = results[0];
                        var created_or_updated_by_id = [];
                        created_or_updated_by_list.forEach(function(created_or_updated_by) {
                            created_or_updated_by_id[created_or_updated_by.id] = created_or_updated_by;
                        });
                        
                        var companies_id = [];
                        companies.forEach(function(company) {
                            companies_id[company.id] = company;
                        });

                        // create companies hash with created by and company information.
                        var companies_hash = [];
                        companies.forEach(function(company) {
                            var created_by = created_or_updated_by_id[company.created_by_id];
                            var created_by_info;
                            if(created_by != null) {
                                created_by_info = {id: created_by.id, name: created_by.name};
                            } else {
                                created_by_info = {id: "", name: ""};
                            }
                            var updated_by = created_or_updated_by_id[company.updated_by_id];
                            var updated_by_info;
                            if(updated_by != null) {
                                updated_by_info = {id: updated_by.id, name: updated_by.name};
                            } else {
                                updated_by_info = {id: "", name: ""};
                            }
                            
                            
                            var company_hash = {_id: company.id, name: company.name, state: company.state
                                , created_by: created_by_info
                                , updated_by: updated_by_info
                            };
                            companies_hash.push(company_hash);
                        });
                        
                        res.render('admin/companies/companies', {
                            companies: companies_hash,
                            title: ' Users',
                            site_host: req.site_host
                        });
                        
                    }
                }
            );
            
        }
    });
    
}

function enable(req, res, next) {
    
    var logged_user = req.user;
    var company = req.company;
    
    // don't allow to enable a company that os not in the deactived state.
    if(company.state != Company.DEACTIVATED) {
        res.send({ errors: { general: "Oops. Can't enable company because its not inactive." } }, 500);
        return;
    }
    
    company.state = Company.ACTIVE;
    // set user that made this change.
    company.updated_by_id = logged_user.id;
    
    // save company in db.
    company_middleware.save(company, function(err) {
        if (err) {
            res.send({ errors: { general: "Oops. Something went wrong. Please try again." } }, 500);
        } else {
            var created_by_info = {id: logged_user.id, name: logged_user.name};
            var updated_by_info = {id: logged_user.id, name: logged_user.name};
            var state_info = company_middleware.state_str(company.state);
            var company_with_info = { _id: company.id, name: company.name
                , state: company.state, state_info: state_info
                , info: "Inactive", created_by: created_by_info
                , updated_by: updated_by_info
            };
            res.json(company_with_info);
        }
    });
    
}

function disable(req, res, next) {
    
    var logged_user = req.user;
    var company = req.company;
    
    // don't allow to disable a company that os not in the active state.
    if(company.state != Company.ACTIVE) {
        res.send({ errors: { general: "Oops. Can't enable company because its not inactive." } }, 500);
        return;
    }
    
    company.state = Company.DEACTIVATED;
    // set user that made this change.
    company.updated_by_id = logged_user.id;
    
    // save company from db.
    company_middleware.save(company, function(err) {
        if (err) {
            res.send({ errors: { general: "Oops. Something went wrong. Please try again." } }, 500);
        } else {
            var created_by_info = {id: logged_user.id, name: logged_user.name};
            var updated_by_info = {id: logged_user.id, name: logged_user.name};
            var state_info = actor_middleware.state_str(actor);
            var company_with_info = { _id: company.id, name: company.name
                , state: company.state, state_info: state_info
                , info: "Inactive", created_by: created_by_info
                , updated_by: updated_by_info
            };
            res.json(company_with_info);
        }
    });
    
}

exports.remove  = function(req, res, next) {
    
    var logged_user = req.user;
    var company = req.company;
    
    // remove company from db.
    company_middleware.remove(company, function(err) {
        if (err) {
            res.send({ errors: { general: "Oops. Something went wrong. Please try again." } }, 500);
        } else {
            res.send({ del: true });
        }
    });
     
}