/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Step = require('step'),
    async = require('async'),
    fs = require('fs'),
    logger = require('../config/logger').logger(),
    actor_middleware = require('../middlewares/actor_middleware'),
    utils = require('../lib/utils'),
    _ = require("underscore");

// Parse ISO 8601.
// https://github.com/JerrySievert/node-date-utils
// http://legitimatesounding.com/blog/Node_js_Date_Utils.html
require('date-utils');
   
var Actor = mongoose.model('Actor');
var Site = mongoose.model('Site');
var Page = mongoose.model('Page');
var Company = mongoose.model('Company');
var FAQ = mongoose.model('FAQ');
var ViewScore = mongoose.model('ViewScore');
var UpScore = mongoose.model('UpScore');
var DownScore = mongoose.model('DownScore');


exports.load_with_site_and_company = function(req, res, next, faq_id) {
    
    FAQ.findById(faq_id, function(err, faq) {
        
        if(err) {
            logger.error(err);
            return next(err);
        } else if(faq == null) {
            return next(new Error("cannot find faq"));
        }
        
        req.faq = faq;
        // set faq object in result.
        res.locals.faq = faq;
        
        async.parallel([
                function get_company(callback) {
                    Company.findById(req.faq.company_id, callback);
                },
                function get_site(callback) {
                    Site.findById(req.faq.site_id, callback);
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

exports.show_site_faqs = function(req, res, next) {
    
    var company = req.company;
    var page = parseInt(req.params.page) || 1;
    res.locals.page = page;
    
    var actor = req.actor;
    var site = req.site;
    // need to transform string to ObjectId before querying.
    var site_id = mongoose.Types.ObjectId(site.id);
    
    var from = (page - 1) * utils.paginate_limit();
    
    FAQ.find({ site_id: site_id}, {},{ sort: [["name",1]], skip: from, limit: utils.paginate_limit }, function(err, faqs) {
        if(err) {
            next(err);
        } else {
            
            // get faq updated_by_id ids.
            var faq_actor_ids = [];
            faqs.forEach(function(faq) {
                if(faq.updated_by_id != null) {
                    faq_actor_ids.push(faq.updated_by_id);
                    if(faq.flags != null) {
                        faq.flags.forEach(function(flag) {
                            if(flag.created_by_id != null) {
                                faq_actor_ids.push(flag.created_by_id);
                            }
                        });
                    }
                }
            });
            
            // removed duplicates.
            faq_actor_ids = _.uniq(faq_actor_ids);
            
            async.parallel([
                            function get_updated_by_id_actors(callback) {
                                Actor.find({ '_id': {"$in": faq_actor_ids}}, callback);
                            },
                            // get help scores from redis
                            function get_scoring(callback) {
                                get_faqs_stats(faqs, callback);
                            },
                        ], function(err, results) {
                            if(err) {
                                next(err);
                            } else {
                                
                                var actors_by_id = get_actors_by_id(results[0]);
                                var faq_stats = results[1];
                                
                                var faqs_hash = [];
                                // create faq hash with actors and sites.
                                faqs.forEach(function(faq) {
                                    
                                    var updated_by_info = get_updated_by_info(actors_by_id, faq);
                                    var page_info = get_page_info(pages_id, faq);
                                    var flags = get_faq_flags(actors_by_id, faq);
                                    var scores = get_faq_stats(faq_stats, faq);
                                    
                                    var site_info = {id: site.id, name: site.name};

                                    var faq_info = {_id: faq.id, name: faq.name
                                            , description: faq.description, page: page_info[0]
                                            , site: site_info, updated_by: updated_by_info
                                            , view: scores[0], up: scores[1], down: scores[2]};
                                    faqs_hash.push(faq_info);
                                });
                                
                                res.render('faqs/site_faqs', {
                                    actor: actor,
                                    company: company,
                                    title: company.name + ' FAQs',
                                    faqs: faqs_hash
                                });
                                
                            }
                        }
            );
        }
    });
}

exports.show_company_faqs = function(req, res, next) {
    
    var page = parseInt(req.params.page) || 1;
    res.locals("page", page);
    
    var actor = req.user;
    var company = req.company;
    // need to transform string to ObjectId before querying.
    var company_id = mongoose.Types.ObjectId(company.id);
    
    var from = (page - 1) * utils.paginate_limit();

    FAQ.find({ company_id: company_id}, {},{ sort: {"name": 1}, skip: from, limit: utils.paginate_limit }, function(err, faqs) {
        if(err) {
            next(err);
        } else {

            // get faq links to ids (updated_by_id or flag ids).
            var faq_actor_ids = [];
            faqs.forEach(function(faq) {
                if(faq.updated_by_id != null) {
                    faq_actor_ids.push(faq.updated_by_id);
                }
                if(faq.flags != null) {
                    faq.flags.forEach(function(flag) {
                        if(flag.created_by_id != null) {
                            faq_actor_ids.push(flag.created_by_id);
                        }
                    });
                }
            });
            
            // removed duplicates.
            faq_actor_ids = _.uniq(faq_actor_ids);
            
            async.parallel([
                    function get_updated_by_id_actors(callback) {
                        Actor.find({ '_id': {"$in": faq_actor_ids}}, callback);
                    },
                    function get_sites(callback) {
                        actor_middleware.get_sites(actor, company, callback);
                    },
                    // get help scores from redis
                    function get_scoring(callback) {
                        get_faqs_stats(faqs, callback);
                    },
                ], function(err, results) {
                    if(err) {
                        next(err);
                    } else {
                        var actors_by_id = get_actors_by_id(results[0]);
                        
                        var sites = results[1];
                        var sites_id = [];
                        var sites_to_json = [];
                        sites.forEach(function(site) {
                            sites_id[site.id] = site;
                            sites_to_json.push({id: site.id, name: site.name});
                        });
                        
                        var faq_stats = results[2];
                        
                        var faqs_hash = [];
                        // create faq hash with actors and sites.
                        faqs.forEach(function(faq) {
                            
                            var updated_by_info = get_updated_by_info(actors_by_id, faq);
                            var site_info = get_site_info(sites_id, faq);
                            var scores = get_faq_stats(faq_stats, faq);
                            
                            var faq_script = create_faq_script(req.site_host, faq);
                            
                            var faq_info = {id: faq.id, name: faq.name
                                    , description: faq.description
                                    , script: faq_script
                                    , site: site_info, updated_by: updated_by_info
                                    , view: scores[0], up: scores[1], down: scores[2]};
                            faqs_hash.push(faq_info);
                        });
                        
                        res.render('faqs/faqs', {
                            actor: actor,
                            company: company,
                            title: company.name + ' FAQs',
                            faqs: faqs_hash,
                            sites: sites_id
                        });
                    }
                }
            );
        }
    });
    
}

function create_faq_script(site_host, faq) {
    var script = "<!-- begin embed code -->\n" + 
    "<script src=" + site_host + "'/javascripts/embed.js'></script>" +
    "<script type='text/javascript'>" + 
        "/*{literal}<![CDATA[*/" + 
        "window.faq_site_key = '" + faq.id + "';" +
        "window.helplib = helpjs.require('helplib', '" + site_host + "/api/files/faq');" +
        "/*]]>{/literal}*/" + 
    "</script>";
    return script;
}

function get_pages_by_id(pages) {
    var pages_id = [];
    pages.forEach(function(page) {
        pages_id[page.id] = page;
    });
    return pages_id;
}

function get_actors_by_id(actors_list) {
    var actors_by_id = [];
    actors_list.forEach(function(actor) {
        actors_by_id[actor.id] = actor;
    });
    return actors_by_id;
}

function get_updated_by_info(updated_by_id, faq) {
    var updated_by = updated_by_id[faq.updated_by_id];
    var updated_by_info;
    if(updated_by != null) {
        updated_by_info = {id: updated_by.id, name: updated_by.name};
    } else {
        updated_by_info = {id: "", name: ""};
    }
    return updated_by_info;
}

function get_site_info(sites_id, faq) {
    var site = sites_id[faq.site_id];
    var site_info;
    if(site != null) {
        site_info = {id: site.id, name: site.name};
    } else {
        site_info = {id: "", name: ""};
    }
    return site_info;
}

function get_faq_stats(faq_stats, faq) {
    var view_stat = 0;
    var up_score = 0;
    var down_score = 0;
    var scores = faq_stats[faq.id];
    if(scores != null) {
        view_stat = scores[0];
        if(view_stat == null) {
            view_stat = 0;
        }
        up_score = scores[1];
        if(up_score == null) {
            up_score = 0;
        }
        down_score = scores[2];
        if(down_score == null) {
            down_score = 0;
        }
    }
    return [view_stat, up_score, down_score];
}

//get help scores from cubejs
function get_faqs_stats(faqs, callback) {
    var faq_stats = [];
    var view_stats = 0;
    var up_score = 0;
    var down_score = 0;
    
    // get all results in parallel.
    async.forEach(faqs
        , function(faq, each_callback) {
            // get up and down scores in parallel.
            async.parallel([
                    //get the view scores from db
                    function get_view_scores(callback) {
                        ViewScore.count({ 'd.faq_id': faq.id }, callback);
                    },
                    //get the up scores from db
                    function get_up_scores(callback) {
                        UpScore.count({ 'd.faq_id': faq.id }, callback);
                    },
                    //get the down scores from db
                    function get_down_scores(callback) {
                        DownScore.count({ 'd.faq_id': faq.id }, callback);
                    },
                ], function(err, results) {
                    if(err) {
                        each_callback(err);
                    } else {
                        var view_stats = results[0];
                        var up_score = results[1];
                        var down_score = results[2];
                        
                        faq_stats[faq.id] = [view_stats, up_score, down_score];
                        each_callback();
                    }
                }
            );
            
        }, function(err){
            if(err) {
                callback(err);
            } else {
                callback(null, faq_stats);
            }
        }
    );
    
}

exports.show_add = function(req, res, next) {
    
    var actor = req.user;
    var company = req.company;

    var faq = new FAQ();
    faq.name = "";
    faq.description = "";
    
    async.parallel([
            function get_sites(callback) {
                actor_middleware.get_sites(actor, company, callback);
            },
        ], function(err, results) {
        
            var sites = results[0];
            
            var faq_info = {id: faq.id, name: faq.name
                , description: faq.description
                , site: []
                , entries: faq.entries
                , isNew: faq.isNew
            };
            
            res.render('faqs/edit_faq', {
                title: 'New FAQ',
                faq: faq_info,
                sites: sites,
                errors: []
            });
        
        }
    );
        
}

// add faq.
exports.add = function(req, res, next) {
    
    if(req.site != null) {
        
        // don't allow to set a site that does not belong to the user's company.
        if(req.site.company_id != req.company.id) {
            res.json({ error: "Oops. can't add faq. Please try again latter" }, 400);
            return;
        }
        var name = req.body.name;
        var description = req.body.description;
        var entries = req.body.entries;
        
        if(typeof name == "undefined" || name == "") {
            logger().error("Can't add faq without a name");
            if(widget) {
                res.json({ error: "Oops. can't add FAQ without a name." }, 500);
            } else {
                res.json({ errors: { name: "Oops. can't add FAQ without a name." } }, 500);
            }
            return;
        }
        
        var faq = new FAQ();
        faq.name = name;
        faq.description = description;
        faq.site_id = req.site.id;
        if(req.site.company_id != null) {
            faq.company_id = req.site.company_id;
        }
        faq.created_by_id = req.user.id;
        faq.updated_by_id = req.user.id;
        
        var entries = req.body.entries;
        entries.forEach(function(entry) {
            var db_entry = { name: entry.name, description: entry.description };
            faq.entries.push(db_entry);
        });
        
        faq.save(function(err) {
            if(err) {
                logger().error(err);
                res.json({ errors: { general: "Oops. can't add faq. Please try again latter." } }, 500);
                return;
            } else {
                res.json(faq);
            }
        });
        
    } else {
        res.json({ errors: { general: "Oops. can't add faq. Please try again latter." } }, 500);
    }
}

exports.edit = function(req, res, next) {
    
    var faq = req.faq;
    var company = req.company;
    
    async.parallel([
            function get_sites(callback) {
                Site.find({ company_id: req.company.id }, {}, callback);
            }
        ], function(err, results) {
        
            var sites = results[0];
            
            var site_info = get_site_info(faq.site_id, faq);
            
            var faq_info = {id: faq.id, name: faq.name
                , description: faq.description
                , site: site_info
                , entries: faq.entries
            };
            
            res.render('faqs/edit_faq', {
                title: 'Edit FAQ',
                faq: faq_info,
                sites: [],
                company: company,
                errors: []
            });
        
        }
    );
        
}

exports.show = function(req, res, next) {
    
    var faq = req.faq;
    var company = req.company;
    res.partial('faqs/preview_faq', {
        title: faq.name,
        faq: faq,
        sites: [],
        company: company,
        errors: [],
        preview: false
        }, function(err, html) {
        res.json({html: html});
    });
    
}

exports.preview = function(req, res, next) {
    
    var faq = req.faq;
    var company = req.company;
    
    var title = 'Preview FAQ ' + faq.name;
    res.render('faqs/preview_faq', {
        title: title,
        faq: faq,
        sites: [],
        company: company,
        errors: [],
        preview: true
    });
    
}

// update faq information.
exports.update = function(req, res, next) {
    
    var faq = req.faq;
    if(faq != null) {
        
        var actor = req.user;
              
        var name = req.body.name;
        var description = req.body.description;
        
        faq.name = name;
        faq.description = description;
        
        faq.entries = [];
        
        var entries = req.body.entries;
        entries.forEach(function(entry) {
            var db_entry = { name: entry.name, description: entry.description };
            faq.entries.push(db_entry);
        });
        faq.updated_by_id = req.user.id;
        faq.save(function(err) {
            if(err) {
                logger().error(err);
                next(err);
            } else {
                
                var updated_by_info = {id: actor.id, name: actor.name};
                    
                var site_info;
                var site = req.site;
                if(site != null) {
                    site_info = {id: site.id, name: site.name};
                } else {
                    site_info = {id: "", name: ""};
                }
                var faq_hash = {id: faq.id, name: faq.name
                    , description: faq.description
                    , site: site_info, updated_by: updated_by_info
                };
                res.json(faq_hash);
                
            }
            
        });
    } else {
        res.json({ error: "Oops. can't update faq. Please try again latter" }, 400);
    }
    
}

exports.remove = function(req, res, next) {
    var logged_user = req.user;
    var faq = req.faq;
    // remove faq from db.
    faq.remove(function(err) {
        if (err) {
            res.send({ error: "Oops. Something went wrong. Please try again." });
        } else {
            res.send({ del: true });
        }
    });
}

