/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Step = require('step'),
    async = require('async'),
    url = require('url'),
    logger = require('../config/logger').logger(),
    utils = require('../lib/utils'),
    route = require('../lib/router.js'),
    _ = require("underscore");

// Parse ISO 8601.
// https://github.com/JerrySievert/node-date-utils
// http://legitimatesounding.com/blog/Node_js_Date_Utils.html
require('date-utils');
   
var Actor = mongoose.model('Actor');
var Site = mongoose.model('Site');
var Page = mongoose.model('Page');
var Company = mongoose.model('Company');
var HelpSet = mongoose.model('HelpSet');

exports.load_with_site_and_company = function(req, res, next, page_id) {
    
    Page.findById(page_id, function (err, page) {
        if(err) {
            logger.error(err);
            return next(err);
        }
        if(page == null) {
            logger.error("Can't find page");
            return next(new Error("Can't find page"));
        }
        req.page = page;
        // set page object in result.
        res.locals.company_page = page;
        
        async.parallel([
                function get_company(callback) {
                    Company.findById(page.company_id, callback);
                },
                function get_site(callback) {
                    Site.findById(page.site_id, callback);
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
        
    });
    
}

exports.load_using_key = function(req, res, next, page_key) {
    
    console.log("// load_using_key");
    if(req.site === undefined) {
        next(new Error('no available site'));
    }
    var site_id = req.site.site_id;
    // need to transform string to ObjectId before querying.
    site_id = mongoose.Types.ObjectId(site_id);
    // find page using its key.
    Page.findOne({ site_id: site_id, key: page_key}, function(err, page) {
        if(err) {
            logger.error(err);
            next(err);
        } else if(page != null) {
            req.page = page;
            // try to find default page helpset.
            if(page.default_helpset_id != null) {
                HelpSet.findById(page.default_helpset_id, function(err, helpset) {
                    if(err) {
                        logger.error(err);
                        next(err);
                    } else {
                        req.default_helpset = helpset;
                        req.show_first_time_only = page.default_first_time_only;
                        next();
                    }
                });
            } else {
                next();
            }
        } else {
            next();
        }
    });
}

exports.load_using_query_url = function(req, res, next){
    
    
    if(req.site === undefined) {
        next(new Error('no available site'));
    }
    var site_id = req.site.id;
    if(req.query.url) {
        // try to find site using its url (used in sites that don't have a page id).
        var url_parts = url.parse(req.query.url, true);
        // Just the lowercased hostname portion of the host.
        // Example: 'host.com
        var base_url = url_parts.hostname;
        // The path section of the URL, that comes after the host and before the query, including the initial slash if present.
        // Example: '/p/a/t/h'
        var pathname = url_parts.pathname;
        // path: Concatenation of pathname and search.
        // Example: '/p/a/t/h?query=string'
        var path = url_parts.href.replace(url_parts.protocol + "//", "");
        path = path.replace(url_parts.host, "");
        
        Page.find({site_id: site_id}).exec(function(err, pages) {
            if(err) {
                logger.error(err);
                next(err);
            } else {
                
                // reorder pages that where found.
                pages = _.sortBy(pages, function(page) {
                    if(req.site.page_ordering != null) {
                        return req.site.page_ordering.indexOf(page.id);
                    }
                    return -1;
                });
                
                // create routing table so we can try to find route for current url.
                // add pages to route to find page using the regex.
                var match = null;
                pages.forEach(function(page) {
                    var urlroute = route.createRouter(page.url_regex);
                    if(typeof match != "undefined" && match != null) {
                        return;
                    }
                    match = urlroute.match(path);
                    if (typeof match != "undefined" && match != null) {
                        logger.debug("found page: " + page.id);
                        req.page = page;
                        // try to find default page helpset.
                        if(page.default_helpset_id != null) {
                            HelpSet.findById(page.default_helpset_id, function(err, helpset) {
                                if(err) {
                                    logger.error(err);
                                    next(err);
                                } else {
                                    req.default_helpset = helpset;
                                    req.show_first_time_only = page.default_first_time_only;
                                    next();
                                }
                            });
                        } else {
                            next();
                        }
                    }

                });
                
                if (typeof match == "undefined" || match == null) {
                    next();
                }
            } 
        });
    } 
}

exports.show_site_pages = function(req, res, next) {
    
    var company = req.company;
    var page = parseInt(req.params.page) || 1;
    res.locals.page = page;
    
    var actor = req.actor;
    var site = req.site;
    // need to transform string to ObjectId before querying.
    var site_id = mongoose.Types.ObjectId(site.id);
    
    var from = (page - 1) * utils.paginate_limit();
    
    Page.find({ site_id: site_id}, {},{ sort: {"name": 1}, skip: from, limit: utils.paginate_limit }, function(err, pages) {
        if(err) {
            next(err);
        } else {
            
            // get page updated_by_id ids.
            var updated_by_ids = [];
            pages.forEach(function(page) {
                if(page.updated_by_id != null) {
                    updated_by_ids.push(page.updated_by_id);
                }
            });
            
            // removed duplicates.
            updated_by_ids = _.uniq(updated_by_ids);
            
            async.parallel([
                            function get_updated_by_id_actors(callback) {
                                Actor.find({ '_id': {"$in": updated_by_ids}}, callback);
                            },
                            function get_pages_in_site(callback) {
                                Page.find({ site_id: site_id}, callback);
                            },
                        ], function(err, results) {
                            if(err) {
                                next(err);
                            } else {
                                
                                var updated_by_list = results[0];
                                var updated_by_id = [];
                                updated_by_list.forEach(function(updated_by) {
                                    updated_by_id[updated_by.id] = updated_by;
                                });
                                
                                var pages = results[1];
                                var pages_id = [];
                                pages.forEach(function(page) {
                                    pages_id[page.id] = page;
                                });
                                
                                var pages_per_site = {};
                                pages.forEach(function(page) {
                                    var page_site_id = page.site_id.toString();
                                    if(pages_per_site[page_site_id] == undefined) {
                                        pages_per_site[page_site_id] = {pages: []};
                                    }
                                    pages_per_site[page_site_id].pages.push({id: page.id, name: page.name});
                                });
                                
                                var pages_hash = [];
                                // create page hash with owner information.
                                pages.forEach(function(page) {
                                    var updated_by = updated_by_id[page.updated_by_id];
                                    var updated_by_info;
                                    if(updated_by != null) {
                                        updated_by_info = {id: updated_by.id, name: updated_by.name};
                                    } else {
                                        updated_by_info = {id: "", name: ""};
                                    }
                                    
                                    var site_info = {id: site.id, name: site.name};
                                    
                                    var page_info = {_id: page.id, name: page.name
                                            , description: page.description, page: page_info
                                            , site: site_info, updated_by: updated_by_info
                                            , url_regex: page.url_regex, key: page.key};
                                    pages_hash.push(page_info);
                                });
                                
                                res.render('pages/site_pages', {
                                    actor: actor,
                                    company: company,
                                    title: site.name + ' pages',
                                    pages_per_site: pages_per_site,
                                    pages: pages_hash,
                                    site_host: req.site_host
                                });
                                
                            }
                        }
            );
        }
    });
}

exports.show_company_pages = function(req, res, next) {
    
    var page = parseInt(req.params.page) || 1;
    res.locals.page = page;
    
    var actor = req.actor;
    var company = req.company;
    // need to transform string to ObjectId before querying.
    var company_id = mongoose.Types.ObjectId(company.id);
    
    var from = (page - 1) * utils.paginate_limit();

    Page.find({ company_id: company_id}, {},{ sort: {"name": 1}, skip: from, limit: utils.paginate_limit }, function(err, pages) {
        if(err) {
            next(err);
        } else {

            // get page updated_by_id ids.
            var updated_by_ids = [];
            pages.forEach(function(page) {
                if(page.updated_by_id != null) {
                    updated_by_ids.push(page.updated_by_id);
                }
            });
            
            // removed duplicates.
            updated_by_ids = _.uniq(updated_by_ids);
            
            async.parallel([
                    function get_updated_by_id_actors(callback) {
                        Actor.find({ '_id': {"$in": updated_by_ids}}, callback);
                    },
                    function get_sites(callback) {
                        Site.find({ 'company_id': company_id}, callback);
                    },
                ], function(err, results) {
                    if(err) {
                        next(err);
                    } else {
                        var updated_by_list = results[0];
                        var updated_by_id = [];
                        updated_by_list.forEach(function(updated_by) {
                            updated_by_id[updated_by.id] = updated_by;
                        });
                        
                        var sites = results[1];
                        var sites_id = [];
                        var sites_to_json = [];
                        sites.forEach(function(site) {
                            sites_id[site.id] = site;
                            sites_to_json.push({id: site.id, name: site.name});
                        });
                        
                        var pages_hash = [];
                        // create page hash with actors and sites.
                        pages.forEach(function(page) {
                            var updated_by = updated_by_id[page.updated_by_id];
                            var updated_by_info;
                            if(updated_by != null) {
                                updated_by_info = {id: updated_by.id, name: updated_by.name};
                            } else {
                                updated_by_info = {id: "", name: ""};
                            }
                            
                            var site = sites_id[page.site_id];
                            var site_info;
                            if(site != null) {
                                site_info = {id: site.id, name: site.name};
                            } else {
                                site_info = {id: "", name: ""};
                            }
                            
                            var page_info = {_id: page.id, name: page.name
                                    , description: page.description
                                    , site: site_info, updated_by: updated_by_info, key: page.key, url_regex: page.url_regex};
                            pages_hash.push(page_info);
                        });
                        
                        res.render('pages/company_pages', {
                            actor: actor,
                            company: company,
                            title: company.name + ' pages',
                            pages: pages_hash,
                            sites: sites_to_json,
                            site_host: req.site_host
                        });
                    }
                }
            );
        }
    });
    
}

//show pages where this user has permissions.
exports.profile_pages = function(req, res, next) {

    res.locals.company = "";
    
    var page = parseInt(req.params.page) || 1;
    res.locals.page = page;
    
    var actor = req.actor;
    
    var from = (page - 1) * utils.paginate_limit();
    
    var all_company_permissions = req.user.permissions.attr("type", Actor.PERMISSION_ALL_COMPANY_SITES);
    var site_permissions = req.user.permissions.attr("type", Actor.PERMISSION_SITE);
    // show all company sites if the user has the right permissions.
    if(all_company_permissions != null) {
        res.redirect(res.locals.url_mount('/company/' + all_company_permissions.obj_id + '/pages'));
        return;
    } else if(site_permissions != null) {
        // get sites from permissions.
        var site_ids = [];
        site_permissions.forEach(function(permission) {
            if(permission.obj_id != null) {
                site_ids.push(permission.obj_id);
            }
        });
    }
    
    Page.find({ '$in': {site_id: site_ids}}, {},{ sort: {"name": 1}, skip: from, limit: utils.paginate_limit }, function(err, pages) {
        if(err) {
            next(err);
        } else {
            
            // get page updated_by_id ids.
            var updated_by_ids = [];
            pages.forEach(function(page) {
                if(page.updated_by_id != null) {
                    updated_by_ids.push(page.updated_by_id);
                }
            });
            
            // removed duplicates.
            updated_by_ids = _.uniq(updated_by_ids);
            
            async.parallel([
                            function get_updated_by_id_actors(callback) {
                                Actor.find({ '_id': {"$in": updated_by_ids}}, callback);
                            },
                            function get_pages_in_site(callback) {
                                Page.find({ site_id: site_id}, callback);
                            },
                        ], function(err, results) {
                            if(err) {
                                next(err);
                            } else {
                                
                                var updated_by_list = results[0];
                                var updated_by_id = [];
                                updated_by_list.forEach(function(updated_by) {
                                    updated_by_id[updated_by.id] = updated_by;
                                });
                                
                                var pages = results[1];
                                var pages_id = [];
                                pages.forEach(function(page) {
                                    pages_id[page.id] = page;
                                });
                                
                                var pages_per_site = {};
                                pages.forEach(function(page) {
                                    var page_site_id = page.site_id.toString();
                                    if(pages_per_site[page_site_id] == undefined) {
                                        pages_per_site[page_site_id] = {pages: []};
                                    }
                                    pages_per_site[page_site_id].pages.push({id: page.id, name: page.name});
                                });
                                
                                var pages_hash = [];
                                // create page hash with owner information.
                                pages.forEach(function(page) {
                                    var updated_by = updated_by_id[page.updated_by_id];
                                    var updated_by_info;
                                    if(updated_by != null) {
                                        updated_by_info = {id: updated_by.id, name: updated_by.name};
                                    } else {
                                        updated_by_info = {id: "", name: ""};
                                    }
                                    
                                    var site_info = {id: site.id, name: site.name};
                                    
                                    var page_info = {_id: page.id, name: page.name
                                            , description: page.description, page: page_info
                                            , site: site_info, updated_by: updated_by_info
                                            , url_regex: page.url_regex, key: page.key};
                                    pages_hash.push(page_info);
                                });
                                
                                res.render('pages/site_pages', {
                                    actor: actor,
                                    title: ' pages',
                                    pages_per_site: pages_per_site,
                                    pages: pages_hash,
                                    site_host: req.site_host
                                });
                                
                            }
                        }
            );
        }
    });
}

//TODO: change widget to work the same way as site when sending errors to the UI and in this way there is no need for the widget flag.
exports.add_page = function(widget) {
    return function(req, res, next) {
        if(req.site != null) {
            
            var name = req.body.name;
            var key = req.body.key;
            var url_regex = req.body.url_regex;
            var description = req.body.description;
            
            if(typeof name == "undefined" || name == "") {
                logger().error("Can't add page without a name");
                if(widget) {
                    res.json({ error: "Oops. can't add page without a name." }, 500);
                } else {
                    res.json({ errors: { name: "Oops. can't add page without a name." } }, 500);
                }
                return;
            }
            
            if((typeof key == "undefined" || key == "") && (typeof url_regex == "undefined" || url_regex == "")) {
                logger().error("Can't add page without and url or key");
                if(widget) {
                    res.json({ error: "Oops. can't add page without and url or key." }, 500);
                } else {
                    res.json({ errors: { general: "Oops. can't add page without and url or key." } }, 500);
                }
                return;
            }
            var site_id = req.site.id;
            // need to transform string to ObjectId before querying.
            site_id = mongoose.Types.ObjectId(site_id);
            
            // check if page key or url_regex already exist.
            check_if_page_exists(site_id, key, url_regex, null, function(err, page_exists) {
                if(err) {
                    logger().error(err);
                    if(widget) {
                        res.json({ error: "Oops. can't add page. Please try again latter." }, 500);
                    } else {
                        res.json({ errors: { general: "Oops. can't add page. Please try again latter." } }, 500);
                    }
                    return;
                } else if (page_exists != null) {
                    if(key != "") {
                        if(widget) {
                            res.json({ error: "Oops. can't add page without and url or key." }, 500);
                        } else {
                            res.json({ errors: { key: "Oops. can't add page because it there is another page with the same key." } }, 500);
                        }
                    } else {
                        if(widget) {
                            res.json({ error: "Oops. can't add page because there is another page with the same url regex expression." }, 500);
                        } else {
                            res.json({ errors: { url_regex: "Oops. can't add page because there is another page with the same url regex expression." } }, 500);
                        }
                    }
                } else {
                    var page = new Page();
                    page.name = name;
                    if(key != "") {
                        page.key = key;
                    } else if(url_regex != "") {
                        page.url_regex = url_regex;
                    }
                    page.description = description;
                    page.site_id = req.site.id;
                    if(req.site.company_id != null) {
                        page.company_id = req.site.company_id;
                    }
                    page.created_by_id = req.user.id;
                    page.updated_by_id = req.user.id;
                    
                    page.save(function(err) {
                        if(err) {
                            logger().error(err);
                            if(widget) {
                                res.json({ error: "Oops. can't add page. Please try again latter." }, 500);
                            } else {
                                res.json({ errors: { general: "Oops. can't add page. Please try again latter." } }, 500);
                            }
                            return;
                        } else {
                            // TODO: MongoDB does not have transactions so this next save might not happen if there is an error
                            // so we need to move this to a job or consider adding pages inside Site collection (see function set_page_order)
                            // add page to site order.
                            req.site.page_ordering.push(page.id);
                            req.site.save(function(err) {
                                if(err) {
                                    logger().error(err);
                                    if(widget) {
                                        res.json({ error: "Oops. can't add page without and url or key." }, 500);
                                    } else {
                                        res.json({ errors: { general: "Oops. can't add page. Please try again latter." } }, 500);
                                    }
                                    return;
                                } else {
                                    res.json(page);
                                }
                            });
                        }
                    }); 
                }
            });
            
        } else {
            if(widget) {
                res.json({ error: "Oops. can't add page. Please try again latter." }, 500);
            } else {
                res.json({ errors: { general: "Oops. can't add page. Please try again latter." } }, 500);
            }
        }
    }
}

// TODO: change widget to work the same way as site when sending errors to the UI and in this way there is no need for the widget flag.
exports.update_page = function(widget) {
    return function(req, res, next) {
    
        if(req.site != null && req.page != null) {
            
            var page = req.page;
            
            var name = req.body.name;
            var key = req.body.key;
            var url_regex = req.body.url_regex;
            var description = req.body.description;
            
            if(typeof name == "undefined" || name == "") {
                logger().error("Can't change page without a name");
                if(widget) {
                    res.json({ error: "Oops. can't change page without a name." }, 500);
                } else {
                    res.json({ errors: { name: "Oops. can't change page without a name." } }, 500);
                }
                return;
            }
            
            if((typeof key == "undefined" || key == "") && (typeof url_regex == "undefined" || url_regex == "")) {
                logger().error("Can't update page without and url or key");
                if(widget) {
                    res.json({ error: "Oops. can't change page without and url or key." }, 500);
                } else {
                    res.json({ errors: { general: "Oops. can't change page without and url or key." } }, 500);
                }
                return;
            }
            
            var site_id = req.site.id;
            // need to transform string to ObjectId before querying.
            site_id = mongoose.Types.ObjectId(site_id);
            
            // check if page key or url_regex already exist.
            check_if_page_exists(site_id, key, url_regex, page, function(err, page_exists) {
                if(err) {
                    logger().error(err);
                    if(widget) {
                        res.json({ error: "Oops. can't change page without and url or key." }, 500);
                    } else {
                        res.json({ errors: { general: "Oops. can't change page without and url or key." } }, 500);
                    }
                    return;
                } else if (page_exists != null) {
                    if(key != "") {
                        if(widget) {
                            res.json({ error: "Oops. can't change page without and url or key." }, 500);
                        } else {
                            res.json({ errors: { key: "Oops. can't change page because it there is another page with the same key." } }, 500);
                        }
                    } else {
                        if(widget) {
                            res.json({ error: "Oops. can't change page because there is another page with the same url regex expression." }, 500);
                        } else {
                            res.json({ errors: { url_regex: "Oops. can't change page because there is another page with the same url regex expression." } }, 500);
                        }
                    }
                } else {
                    page.name = name;
                    page.description = description;
                    if(key != "") {
                        page.key = key;
                    } else if(url_regex != "") {
                        page.url_regex = url_regex;
                    }
                    page.updated_by_id = req.user.id;
                    
                    try {
                        page.save(function(err) {
                            if(err) {
                                logger().error(err);
                                if(widget) {
                                    res.json({ error: "Oops. can't change page. Please try again latter." }, 500);
                                } else {
                                    res.json({ errors: { general: "Oops. can't change page. Please try again latter." } }, 500);
                                }
                                return;
                            } else {
                                res.json(page);
                            }
                        }); 
                    } catch(err) {
                        logger().error(err);
                        if(widget) {
                            res.json({ error: "Oops. can't change page. Please try again latter." }, 500);
                        } else {
                            res.json({ errors: { general: "Oops. can't change page. Please try again latter." } }, 500);
                        }
                    }
                }
            });
            
        } else {
            if(widget) {
                res.json({ error: "Oops. can't change page. Please try again latter." }, 500);
            } else {
                res.json({ errors: { general: "Oops. can't change page. Please try again latter." } }, 500);
            }
        }
    }
}

exports.remove_page = function(req, res, next) {
    if(req.site != null && req.page != null) {
        var page = req.page;
        var page_id = mongoose.Types.ObjectId(page.id);
        var from = (page - 1) * utils.paginate_limit();

        async.series([ 
                //delete helpset associated with the page
                function remove_helpset_of_page(callback) {
                    HelpSet.find({ page_id: page_id}, {},{ sort: {"name": 1}, skip: from, limit: utils.paginate_limit }, function(err, helpsets) {
                        if(err) {
                            next(err);
                        } else {
                            if(helpsets.length > 0) {
                                async.each(helpsets, function(helpset, callback) {
                                    var helpset_id = helpset.id;
                                    helpset.remove(function(err) {
                                        if(err) {
                                            logger().error(err);
                                            res.json({ error: "Oops. can't delete help. Please try again latter" }, 500);
                                        }
                                    });
                                });
                            }
                        }

                    });
                    callback(null);
                },
                //delete the page
                function removing_page(callback) {
                    page.remove(function(err) {
                        if(err) {
                            logger().error(err);
                            res.json({ error: "Oops. can't delete page. Please try again latter" }, 500);
                            return;
                        } else {
                            res.json(page);
                        }
                    }); 
                    callback(null);
                }

            ]);

    } else {
        res.json({ error: "Oops. can't delete page. Please try again latter" }, 500);
    }
}

//check if page key or regex exist in db.

exports.check_if_page_exists = check_if_page_exists;
function check_if_page_exists(site_id, page_key, page_url_regex, page_to_check_against, callback) {
    if(page_key != "") {
        // try to see if the page with this key already exists,
        Page.find({site_id: site_id, key: page_key}, function(err, pages) {
            if(err) {
                logger().error(err);
                callback(err);
                return;
            } else if (pages.length > 0) {
                if(page_to_check_against != null && pages[0].id == page_to_check_against.id) {
                    callback(null, null);
                } else {
                    callback(null, true);
                }
            } else {
                callback(null, null);
            }   
        });
    } else if(page_url_regex != "") {
        // try to see if there is already a page with a url regex that matches the one that is trying to be added.
        Page.find({site_id: site_id}, function(err, pages) {
            if(err) {
                logger().error(err);
                callback(err);
            } else {
                var match = null;
                // add pages to route to find page using the regex.
                pages.forEach(function(page) {
                    // create routing table so we can try to find route for current url.
                    var urlroute = route.createRouter(page.url_regex);
                    if(typeof match != "undefined" && match != null) {
                        return;
                    }
                    match = urlroute.match(page_url_regex);
                    if (match) {
                            if(page_to_check_against != null && page.id == page_to_check_against.id) {
                                callback(null, null);
                            } else {
                                callback(null, true);
                            }
                    };
                    
                });
                if (typeof match == "undefined" || match == null) {
                    callback();
                }
            }
        });
    } else {
        callback(new Error("cannot find page key or url"));
    }
}