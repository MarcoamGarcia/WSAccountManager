/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    path = require('path'),
    Step = require('step'),
    async = require('async'),
    crypto = require('crypto'),
    url = require('url'),
    logger = require('../config/logger').logger(),
    utils = require('../lib/utils'),
    _ = require("underscore");

// Parse ISO 8601.
// https://github.com/JerrySievert/node-date-utils
// http://legitimatesounding.com/blog/Node_js_Date_Utils.html
require('date-utils');
   
var Actor = mongoose.model('Actor');
var Site = mongoose.model('Site');
var Company = mongoose.model('Company');
var Page = mongoose.model('Page');

exports.load_with_company = function(req, res, next, site_id) {
     
    Site.findById(site_id, function (err, site) {
        
        if(err) {
            console.err(err);
            return next(err);
        }
        
        if(site == null) {
            console.err("Can't find site");
            return next(new Error("Can't find site"));
        }
        
        req.site = site;
        // set site object in result.
        res.locals.site = site;
        
        if(site.company_id != null) {
            Company.findById(site.company_id, function (err, company) {
                if(err) {
                    console.err(err);
                    return next(err);
                }
                req.company = company;
                // set company object in result.
                res.locals.company = company;
                next();
            });
        } else {
            next();
        }
        
    });
    
}

exports.load_using_key = function(req, res, next, site_key) {
       console.log("// find site using its key");
    // find site using its key.
    Site.findOne({ key: site_key}, function(err, site) {
        if(err) {
            next(err);
        } else if(site == null) {
            // TODO: Next lines are used to if works in the non official mode.
            // Need to remove them and add another way to create this mode.
            logger.debug("can't find site with key: " + req.params.site_key);
            site = new Site();
            site.save(function(err) {
                req.site = site;
                next();
            });
            //next(new Error("can't find site"));
        } else {
            req.site = site;
            next();
        }
    });
}

exports.load_using_query_url = function(req, res, next) {
    
    if(req.query.url) {
        // try to find site using its url (used in sites that don't have server side code).
        var url_parts = url.parse(req.query.url, true);
        var base_url = url_parts.hostname;
        Site.findOne({ url: base_url}, function(err, site_from_url) {
            if(err) {
                next(err);
            } else if(site_from_url == null) {
                req.base_url = base_url;
                next();
            } else {
                req.site = site_from_url;
                next();
            }
        });
    } else {
        next();
    }
    
}

exports.load_using_company_and_query_url = function(req, res, next) {
    
    if(req.query.url && req.company) {
        // try to find site using its url (used in sites that don't have server side code).
        var url_parts = url.parse(req.query.url, true);
        var base_url = url_parts.hostname;
        Site.findOne({company_id: req.company.id, url: base_url}, function(err, site_from_url) {
            if(err) {
                next(err);
            } else if(site_from_url == null) {
                req.base_url = base_url;
                next();
            } else {
                req.site = site_from_url;
                next();
            }
        });
    } else {
        next();
    }
    
}

// find site using request body id.
exports.find_from_params = function(req, res, next) {
    var site_id = req.body.site.id;
    Site.findById(site_id, function(err, site) {
        if(err) {
            logger().error(err);
            next(error);
        } else {
            console.log("Find from params: " + req.site);
            req.site = site;
            next();
        }
    });
}

// NOT USED AT THIS TIME.
exports.load_in_parallel_with_company = function(req, res, next, site_id) {
    var company_id = req.params.company_id;
    async.parallel([
            function get_company(callback) {
                Company.findById(company_id, callback);
            },
            function get_site(callback) {
                Site.findById(site_id, callback);
            }
        ], function(err, results) {
            if(err) {
                next(err);
            } else {
                req.company = results[0];
                req.site = results[1];
                next();
            }
        }
    );
}

exports.load = function(req, res, next, site_id) {
        
    var actor = req.actor;
    var site_id = req.params.site_id;
        
    Site.findById(site_id, function (err, site) {
        
        if(err) {
            console.err(err);
            return next(err);
        }
        
        if(site == null) {
            console.err("Can't find site");
            return next(new Error("Can't find site"));
        }
        
        req.site = site;
        // set site object in result.
        res.locals.site = site;
        
        next();
    });
    
}


// show company sites.
exports.company_sites = function(req, res, next) {
    var page = parseInt(req.params.page) || 1;
    res.locals.page = page;
    var logged_user = req.user;
    var from = (page - 1) * utils.paginate_limit();
    show_all_sites(req, res, next, page, logged_user, from, req.company, null);
}

// show sites where this user has permissions.
exports.profile_sites = function(req, res, next) {
    
    var page = parseInt(req.params.page) || 1;
    res.locals.page = page;
    
    res.locals.company = "";
    
    var logged_user = req.user;
    
    var from = (page - 1) * utils.paginate_limit();
    
    var all_company_permissions = Actor.attr(req.user.permissions,"type", Actor.PERMISSION_ALL_COMPANY_SITES);
    var site_permissions = Actor.attr(req.user.permissions,"type", Actor.PERMISSION_SITE);
    // show all company sites.
    if(all_company_permissions != null) {
        Company.findById(all_company_permissions.obj_id.toString(), function (err, company) {
            if(err) {
                next(err);
            } else {
                show_all_sites(req, res, next, page, logged_user, from, company, null);
            }
        });
    } else if(site_permissions != null) {
        // get sites from permissions.
        var site_ids = [];
        site_permissions.forEach(function(permission) {
            if(permission.obj_id != null) {
                site_ids.push(permission.obj_id);
            }
        });
        show_all_sites(req, res, next, page, logged_user, from, null, site_ids);
    }
    
}

function show_all_sites(req, res, next, page, actor, from, company, site_ids) {
    
    var params = {};
    var title = "";
    if(company != null) {
        params = { company_id: company.id};
        title = company.name + ' sites';
    } else if(site_ids != null) {
        params = { "_id": {"$in" : site_ids }};
        title = 'Sites';
    } 
    
    if(_.size(params) == 0) {
        logger.error("no company or sites ids where found...");
        return next(new Error("Oops. Something went wrong. Please try again."));
    }
    Site.find(params, {},
        { sort: {"name": 1}, skip: from, limit: utils.paginate_limit }, function(err, sites) {
        if(err) {
            next(err);
        } else {
            
            // get sites updated_by_id ids.
            var updated_by_ids = [];
            sites.forEach(function(site) {
                if(site.updated_by_id != null) {
                    updated_by_ids.push(site.updated_by_id);
                }
            });
            
            // removed duplicates.
            updated_by_ids = _.uniq(updated_by_ids);
            
            // find helpset owners.
            Actor.find({ '_id': {"$in": updated_by_ids}}, function(err, updated_by_list) {
                if(err) {
                    next(err);
                } else {
                    
                    var updated_by_id = [];
                    updated_by_list.forEach(function(updated_by) {
                        updated_by_id[updated_by.id] = updated_by;
                    });
                    
                    var sites_hash = [];
                    // create site hash with updated by information.
                    sites.forEach(function(site) {
                        var updated_by = updated_by_id[site.updated_by_id];
                        var updated_by_info;
                        if(updated_by != null) {
                            updated_by_info = {id: updated_by.id, name: updated_by.name};
                        } else {
                            updated_by_info = {id: "", name: ""};
                        }
                        
                        var site_info = {_id: site.id, name: site.name, url: site.url, key: site.key, updated_by: updated_by_info};
                        sites_hash.push(site_info);
                    });
                    
                    console.log("sites: " + JSON.stringify(sites_hash));
                    res.render('sites/sites', {
                        actor: actor,
                        title: title,
                        sites: sites_hash
                    });
                }
            });
        }
    });
    
}

//add site to company.
exports.add_site = function(req, res, next) {
    var logged_user = req.user;
    var actor = req.actor;
    var site_name = req.body.name;
    var site_url = req.body.url;
    var include_subdomains = req.body.subdomains;
    var company_key = req.company.key;
    
    if(site_url === undefined || site_url === "") {
        res.send({ errors: { url: "This field is required." } });
    } else if(!utils.url_filter(site_url)) {
        res.send({ errors: { url: "Please enter a valid URL." } });
    }
    else {
        Site.findOne({ url: site_url }, function(err, site) {
            if (err) {
                logger.error(err);
                res.send({ errors: {general: "Oops. Something went wrong. Please try again." } });
            } else if(site != null) {
                logger.error(new Error("Site " + site_url + " already exists."));
                res.send({ errors: {url: "Someone already has claimed that url." } });
            } else {
                var site = new Site();
                site.name = site_name;
                site.url = site_url;
                site.subdomains = include_subdomains;
                // create new api token.
                var crypt = crypto.randomBytes(16).toString('hex');
                site.key = crypt;
                site.company_id = req.company._id;
                site.created_by_id = logged_user.id;
                site.updated_by_id = logged_user.id;
                site.save(function(err){
                    if (err) {
                        logger.debug(err);
                        res.send({ errors: {general: "Oops. Something went wrong. Please try again." } });
                    } else {
                        var updated_by_info = {id: logged_user.id, name: logged_user.name};
                        res.writeHead(200, {'content-type': 'text/json' });
                        var site_hash = { _id: site._id, name: site.name, url: site.url, key: site.key, updated_by: updated_by_info};
                        res.write(JSON.stringify(site_hash));
                        res.end('\n');
                    }
                });
            }
        });
    }
}

//update site information.
exports.update_site = function(req, res, next) {
    var logged_user = req.user;
    var site = req.site;
    if(site != null) {
        site.name = req.body.name;
        site.updated_by_id = logged_user.id;
        site.save(function(err) {
            if(err) {
                logger.error(err);
                next(err);
            } else {
                var updated_by_info = {id: logged_user.id, name: logged_user.name};
                res.writeHead(200, {'content-type': 'text/json' });
                var site_hash = { _id: site._id, name: site.name, url: site.url, key: site.key, updated_by: updated_by_info};
                res.write(JSON.stringify(site_hash));
                res.end('\n');
            }
        }); 
    } else {
        next(new Error("Can't find site"));
    }
}

exports.remove_site = function(req, res, next) {
    
    var logged_user = req.user;
    var actor = req.actor;
    var site = req.site;
    var site_pages;
    // need to transform string to ObjectId before querying.
    var site_id = mongoose.Types.ObjectId(site.id);

    //TODO: Add err hyandling if something wrong happens when deleting helpsets or pages
    // so site is not removed.
    async.series([ 
        function remove_site_pages(callback) {
            Page.find({ site_id: site_id}, function(err, pages) {
                if(err) {
                    callback(err);
                } else {
                    async.each(pages, function(page, each_callback) {
                        var page_id = page.id;
                        page.remove(function(err) {
                            if(err) {
                                logger().error(err);
                                each_callback(err);
                            }
                            each_callback(err);
                        });
                    }, callback
                    );
                }
            });
        }
    ], function(err, results) {
        if (err) {
            res.send({ error: "Oops. Something went wrong. Please try again." });
        } else {
            // remove site from db.
            site.remove(function(err) {
                if (err) {
                    res.send({ error: "Oops. Something went wrong. Please try again." });
                } else {
                    res.send({ del: true });
                }
            });
        }
    });


    
}