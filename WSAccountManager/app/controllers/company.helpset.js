/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Step = require('step'),
    async = require('async'),
    fs = require('fs'),
    logger = require('../config/logger').logger(),
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
var HelpSet = mongoose.model('HelpSet');
var ViewScore = mongoose.model('ViewScore');
var UpScore = mongoose.model('UpScore');
var DownScore = mongoose.model('DownScore');

exports.load_with_site_company_and_page = function(req, res, next, helpset_id) {
    
    HelpSet.findById(helpset_id, function(err, helpset) {
        
        if(err) {
            logger().error(err);
            return next(err);
        } 
        
        if(helpset == null) {
            return next(new Error("cannot find help"));
        }
        
        req.helpset = helpset;
        res.locals.helpset = helpset;
        async.parallel([
                function get_company(callback) {
                    Company.findById(req.helpset.company_id, callback);
                },
                function get_site(callback) {
                    Site.findById(req.helpset.site_id, callback);
                },
                function get_page(callback) {
                    Page.findById(req.helpset.page_id, callback);
                },
                function get_new_page(callback) {
                    if(req.body.new_page) {
                        Page.findById(req.body.new_page, callback);
                    } else {
                        callback();
                    }
                },
            ], function(err, results) {
                if(err) {
                    next(err);
                } else {
                    req.company = results[0];
                    req.site = results[1];
                    req.page = results[2];
                    req.new_page = results[3];
                    next();
                }
            }
        );
        
    });
    
}

exports.show_my_helpsets = function(req, res, next) {

    var page = parseInt(req.params.page) || 1;
    res.locals.page = page;
    
    var actor = req.actor;
    // need to transform string to ObjectId before querying.
    var actor_id = mongoose.Types.ObjectId(actor.id);
    
    var from = (page - 1) * utils.paginate_limit();
    
    HelpSet.find({ updated_by_id: actor_id}, {}, { sort: {"name": 1}, skip: from, limit: utils.paginate_limit }, function(err, helpsets) {
        if(err) {
            next(err);
        } else {
            
            // get helpset updated_by_id ids.
            var helpset_actor_ids = [];
            // get helpset pages.
            var page_ids = [];
            // get helpset sites.
            var site_ids = [];
            helpsets.forEach(function(helpset) {
                if(helpset.updated_by_id != null) {
                    helpset_actor_ids.push(helpset.updated_by_id);
                }
                if(helpset.page_id != null) {
                    page_ids.push(helpset.page_id);
                }
                if(helpset.site_id != null) {
                    site_ids.push(helpset.site_id);
                }
                if(helpset.flags != null) {
                    helpset.flags.forEach(function(flag) {
                        if(flag.created_by_id != null) {
                            helpset_actor_ids.push(flag.created_by_id);
                        }
                    });
                }
            });
            
            // removed duplicates.
            helpset_actor_ids = _.uniq(helpset_actor_ids);
            page_ids = _.uniq(page_ids);
            site_ids = _.uniq(site_ids);
            
            async.parallel([
                    function get_updated_by_id_actors(callback) {
                        Actor.find({ '_id': {"$in": helpset_actor_ids}}, callback);
                    },
                    function get_sites(callback) {
                        Site.find({ '_id': {"$in": site_ids}}, callback);
                    },
                    function get_pages_in_sites(callback) {
                        Page.find({ 'site_id': {"$in": site_ids}}, callback);
                    },
                    // get help scores from redis
                    function get_scoring(callback) {
                        get_helpsets_stats(helpsets, callback);
                    },
                ], function(err, results) {
                    if(err) {
                        next(err);
                    } else {
                        
                        var updated_by_info = {id: actor.id, name: actor.name};
                        var actors_by_id = get_actors_by_id(results[0]);
                        var sites_id = get_sites_by_id(results[1]);
                        var pages_id = get_pages_by_id(results[2]);
                        var pages_per_site = get_pages_per_site(results[2]);
                        var helpset_stats = results[3];
                        
                        var helpsets_hash = [];
                        // create helpset hash with actors and sites.
                        helpsets.forEach(function(helpset) {
                            
                            var site_info = get_site_info(sites_id, helpset);
                            var page_info = get_page_info(pages_id, helpset);
                            var flags = get_helpset_flags(actors_by_id, helpset);
                            var scores = get_helpset_stats(helpset_stats, helpset);
                            
                            var can_update = false;
                            if(helpset.official) {
                                can_update = true;
                            }

                            var helpset_info = {_id: helpset.id, name: helpset.name
                                    , description: helpset.description, page: page_info[0]
                                    , site: site_info, updated_by: updated_by_info, official: helpset.official
                                    , is_page_default: page_info[1], can_update: can_update
                                    , flags: flags, is_flagged: helpset.is_flagged
                                    , view: scores[0], up: scores[1], down: scores[2]};
                            helpsets_hash.push(helpset_info);
                        });
                        
                        res.render('helpsets/my_helpsets', {
                            actor: actor,
                            title: actor.name + ' help list',
                            pages_per_site: pages_per_site,
                            helpsets: helpsets_hash
                        });
                    }
            });
        }
    });
}

exports.show_page_helpsets = function(req, res, next) {
    
    var company = req.company;
    var page = parseInt(req.params.page) || 1;
    res.locals.page = page;
    
    var actor = req.actor;
    var page = req.page;
    // need to transform string to ObjectId before querying.
    var page_id = mongoose.Types.ObjectId(page.id);
    
    var from = (page - 1) * utils.paginate_limit();
    
    HelpSet.find({ page_id: page_id}, {},{ sort: {"name": 1}, skip: from, limit: utils.paginate_limit }, function(err, helpsets) {
        if(err) {
            next(err);
        } else {
            
            // get helpset updated_by_id ids.
            var helpset_actor_ids = [];
            helpsets.forEach(function(helpset) {
                if(helpset.updated_by_id != null) {
                    helpset_actor_ids.push(helpset.updated_by_id);
                }
                if(helpset.flags != null) {
                    helpset.flags.forEach(function(flag) {
                        if(flag.created_by_id != null) {
                            helpset_actor_ids.push(flag.created_by_id);
                        }
                    });
                }
            });
            
            // removed duplicates.
            helpset_actor_ids = _.uniq(helpset_actor_ids);
            
            async.parallel([
                            function get_updated_by_id_actors(callback) {
                                Actor.find({ '_id': {"$in": helpset_actor_ids}}, callback);
                            },
                            // get all site pages so we can move helpset to other page.
                            function get_pages_in_site(callback) {
                                Page.find({ site_id: page.site_id}, callback);
                            },
                            // get help scores from redis
                            function get_scoring(callback) {
                                get_helpsets_stats(helpsets, callback);
                            },
                        ], function(err, results) {
                            if(err) {
                                next(err);
                            } else {
                                
                                var actors_by_id = get_actors_by_id(results[0]);
                                var pages_id = get_pages_by_id(results[1]);
                                var pages_per_site = get_pages_per_site(results[1]);
                                var helpset_stats = results[2];
                                
                                var helpsets_hash = [];
                                // create helpset hash with actors and sites.
                                helpsets.forEach(function(helpset) {
                                    
                                    var updated_by_info = get_updated_by_info(actors_by_id, helpset);
                                    var page_info = get_page_info(pages_id, helpset);
                                    var flags = get_helpset_flags(actors_by_id, helpset);
                                    var scores = get_helpset_stats(helpset_stats, helpset);
                                    
                                    var can_update = false;
                                    if(helpset.official) {
                                        can_update = true;
                                    }
                                    
                                    var site_info = {id: req.site.id, name: req.site.name};

                                    var helpset_info = {_id: helpset.id, name: helpset.name
                                            , description: helpset.description, page: page_info[0]
                                            , site: site_info, updated_by: updated_by_info, official: helpset.official
                                            , is_page_default: page_info[1], can_update: can_update
                                            , flags: flags, is_flagged: helpset.is_flagged
                                            , view: scores[0], up: scores[1], down: scores[2]};
                                    helpsets_hash.push(helpset_info);
                                });
                                
                                res.render('helpsets/page_helpsets', {
                                    actor: actor,
                                    company: company,
                                    site: req.site,
                                    title: company.name + ' help list',
                                    pages_per_site: pages_per_site,
                                    helpsets: helpsets_hash
                                });
                                
                            }
                        }
            );
        }
    });
}

exports.show_site_helpsets = function(req, res, next) {
    
    var company = req.company;
    var page = parseInt(req.params.page) || 1;
    res.locals.page = page;
    
    var actor = req.actor;
    var site = req.site;
    // need to transform string to ObjectId before querying.
    var site_id = mongoose.Types.ObjectId(site.id);
    
    var from = (page - 1) * utils.paginate_limit();
    
    HelpSet.find({ site_id: site_id}, {},{ sort: {"name": 1}, skip: from, limit: utils.paginate_limit }, function(err, helpsets) {
        if(err) {
            next(err);
        } else {
            
            // get helpset updated_by_id ids.
            var helpset_actor_ids = [];
            helpsets.forEach(function(helpset) {
                if(helpset.updated_by_id != null) {
                    helpset_actor_ids.push(helpset.updated_by_id);
                    if(helpset.flags != null) {
                        helpset.flags.forEach(function(flag) {
                            if(flag.created_by_id != null) {
                                helpset_actor_ids.push(flag.created_by_id);
                            }
                        });
                    }
                }
            });
            
            // removed duplicates.
            helpset_actor_ids = _.uniq(helpset_actor_ids);
            
            async.parallel([
                            function get_updated_by_id_actors(callback) {
                                Actor.find({ '_id': {"$in": helpset_actor_ids}}, callback);
                            },
                            function get_pages_in_site(callback) {
                                Page.find({ site_id: site_id}, callback);
                            },
                            // get help scores from redis
                            function get_scoring(callback) {
                                get_helpsets_stats(helpsets, callback);
                            },
                        ], function(err, results) {
                            if(err) {
                                next(err);
                            } else {
                                
                                var actors_by_id = get_actors_by_id(results[0]);
                                var pages_id = get_pages_by_id(results[1]);
                                var pages_per_site = get_pages_per_site(results[1]);
                                var helpset_stats = results[2];
                                
                                var helpsets_hash = [];
                                // create helpset hash with actors and sites.
                                helpsets.forEach(function(helpset) {
                                    
                                    var updated_by_info = get_updated_by_info(actors_by_id, helpset);
                                    var page_info = get_page_info(pages_id, helpset);
                                    var flags = get_helpset_flags(actors_by_id, helpset);
                                    var scores = get_helpset_stats(helpset_stats, helpset);
                                    
                                    var can_update = false;
                                    if(helpset.official) {
                                        can_update = true;
                                    }
                                    
                                    var site_info = {id: site.id, name: site.name};

                                    var helpset_info = {_id: helpset.id, name: helpset.name
                                            , description: helpset.description, page: page_info[0]
                                            , site: site_info, updated_by: updated_by_info, official: helpset.official
                                            , is_page_default: page_info[1], can_update: can_update
                                            , flags: flags, is_flagged: helpset.is_flagged
                                            , view: scores[0], up: scores[1], down: scores[2]};
                                    helpsets_hash.push(helpset_info);
                                });
                                
                                res.render('helpsets/site_helpsets', {
                                    actor: actor,
                                    company: company,
                                    title: company.name + ' help list',
                                    pages_per_site: pages_per_site,
                                    helpsets: helpsets_hash
                                });
                                
                            }
                        }
            );
        }
    });
}

exports.show_company_helpsets = function(req, res, next) {
    
    var page = parseInt(req.params.page) || 1;
    res.locals.page = page;
    
    var actor = req.actor;
    var company = req.company;
    // need to transform string to ObjectId before querying.
    var company_id = mongoose.Types.ObjectId(company.id);
    
    var from = (page - 1) * utils.paginate_limit();

    HelpSet.find({ company_id: company_id}, {},{ sort: {"name": 1}, skip: from, limit: utils.paginate_limit }, function(err, helpsets) {
        if(err) {
            next(err);
        } else {

            // get helpset links to ids (updated_by_id or flag ids).
            var helpset_actor_ids = [];
            // get helpset sites.
            var site_ids = [];
            helpsets.forEach(function(helpset) {
                if(helpset.updated_by_id != null) {
                    helpset_actor_ids.push(helpset.updated_by_id);
                }
                if(helpset.flags != null) {
                    helpset.flags.forEach(function(flag) {
                        if(flag.created_by_id != null) {
                            helpset_actor_ids.push(flag.created_by_id);
                        }
                    });
                }
                if(helpset.site_id != null) {
                    site_ids.push(helpset.site_id);
                }
            });
            
            // removed duplicates.
            helpset_actor_ids = _.uniq(helpset_actor_ids);
            site_ids = _.uniq(site_ids);
            
            async.parallel([
                    function get_updated_by_id_actors(callback) {
                        Actor.find({ '_id': {"$in": helpset_actor_ids}}, callback);
                    },
                    function get_sites(callback) {
                        Site.find({ '_id': {"$in": site_ids}}, callback);
                    },
                    // need to get all pages even if there are not present in one of the helpsets so we change helpset page.
                    function get_pages_in_sites(callback) {
                        Page.find({ 'site_id': {"$in": site_ids}}, callback);
                    },
                    // get help scores from redis
                    function get_scoring(callback) {
                        get_helpsets_stats(helpsets, callback);
                    },
                ], function(err, results) {
                    if(err) {
                        next(err);
                    } else {
                        var actors_by_id = get_actors_by_id(results[0]);
                        var sites_id = get_sites_by_id(results[1]);
                        var pages_id = get_pages_by_id(results[2]);
                        var pages_per_site = get_pages_per_site(results[2]);
                        var helpset_stats = results[3];
                        
                        var helpsets_hash = [];
                        // create helpset hash with actors and sites.
                        helpsets.forEach(function(helpset) {
                            
                            var updated_by_info = get_updated_by_info(actors_by_id, helpset);
                            var site_info = get_site_info(sites_id, helpset);
                            var page_info = get_page_info(pages_id, helpset);
                            var flags = get_helpset_flags(actors_by_id, helpset);
                            var scores = get_helpset_stats(helpset_stats, helpset);
                            
                            var can_update = false;
                            if(helpset.official) {
                                can_update = true;
                            }

                            var helpset_info = {_id: helpset.id, name: helpset.name
                                    , description: helpset.description, page: page_info[0]
                                    , site: site_info, updated_by: updated_by_info, official: helpset.official
                                    , is_page_default: page_info[1], can_update: can_update
                                    , flags: flags, is_flagged: helpset.is_flagged
                                    , view: scores[0], up: scores[1], down: scores[2]};
                            helpsets_hash.push(helpset_info);
                        });
                        
                        res.render('helpsets/company_helpsets', {
                            actor: actor,
                            company: company,
                            title: company.name + ' help list',
                            pages_per_site: pages_per_site,
                            helpsets: helpsets_hash
                        });
                    }
                }
            );
        }
    });
    
}

function get_pages_by_id(pages) {
    var pages_id = [];
    pages.forEach(function(page) {
        pages_id[page.id] = page;
    });
    return pages_id;
}

function get_sites_by_id(sites) {
    var sites_id = [];
    sites.forEach(function(site) {
        sites_id[site.id] = site;
    });
    return sites_id;
}

function get_actors_by_id(actors_list) {
    var actors_by_id = [];
    actors_list.forEach(function(actor) {
        actors_by_id[actor.id] = actor;
    });
    return actors_by_id;
}

function get_pages_per_site(pages) {
    var pages_per_site = {};
    pages.forEach(function(page) {
        var page_site_id = page.site_id.toString();
        if(pages_per_site[page_site_id] == undefined) {
            pages_per_site[page_site_id] = {pages: []};
        }
        pages_per_site[page_site_id].pages.push({id: page.id, name: page.name});
    });
    return pages_per_site;
}

function get_updated_by_info(updated_by_id, helpset) {
    var updated_by = updated_by_id[helpset.updated_by_id];
    var updated_by_info;
    if(updated_by != null) {
        updated_by_info = {id: updated_by.id, name: updated_by.name};
    } else {
        updated_by_info = {id: "", name: ""};
    }
    return updated_by_info;
}

function get_site_info(sites_id, helpset) {
    var site = sites_id[helpset.site_id];
    var site_info;
    if(site != null) {
        site_info = {id: site.id, name: site.name};
    } else {
        site_info = {id: "", name: ""};
    }
    return site_info;
}

function get_page_info(pages_id, helpset) {
    var page = pages_id[helpset.page_id];
    var page_info;
    var is_page_default = false;
    if(page != null) {
        page_info = {id: page.id, name: page.name};
        if(page.default_helpset_id == helpset.id) {
            is_page_default = true;
        }
    } else {
        page_info = {id: "", name: ""};
    }
    return [page_info, is_page_default];
}

function get_helpset_flags(updated_by_id, helpset) {
    var flags = [];
    if(helpset.flags != null) {
        helpset.flags.forEach(function(flag) {
            var flag_created_by_id = updated_by_id[flag.created_by_id];
            if(flag_created_by_id != null) {
                flags.push({id: flag.id, type: utils.get_flag_type_str(flag.type), reason: flag.reason, name: flag_created_by_id.name});
            } else if(flag.created_by_email != null) {
                flags.push({id: flag.id, type: utils.get_flag_type_str(flag.type), reason: flag.reason, name: flag.created_by_email});
            }
        });
    }
    return flags;
}

function get_helpset_stats(helpset_stats, helpset) {
    var view_stat = 0;
    var up_score = 0;
    var down_score = 0;
    var scores = helpset_stats[helpset.id];
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

//get help scores from redis
function get_helpsets_stats(helpsets, callback) {
    var helpset_stats = [];
    // get all results in parallel.
    async.forEach(helpsets
        , function(helpset, each_callback) {
            // get up and down scores in parallel.
            async.parallel([
                    //get the view scores from db
                    function get_view_scores(callback) {
                        ViewScore.count({ 'd.helpset_id': helpset.id }, callback);
                    },
                    //get the up scores from db
                    function get_up_scores(callback) {
                        UpScore.count({ 'd.helpset_id': helpset.id }, callback);
                    },
                    //get the down scores from db
                    function get_down_scores(callback) {
                        DownScore.count({ 'd.helpset_id': helpset.id }, callback);
                    },
                ], function(err, results) {
                    if(err) {
                        each_callback(err);
                    } else {
                        var view_stats = results[0];
                        var up_score = results[1];
                        var down_score = results[2];
                        
                        helpset_stats[helpset.id] = [view_stats, up_score, down_score];
                        each_callback();
                    }
                }
            );
            
        }, function(err){
            if(err) {
                callback(err);
            } else {
                callback(null, helpset_stats);
            }
        }
    );
}

// show statistics.
exports.show_helpset_stats = function(req, res, next) {
    var actor = req.user;
    var company = req.company;
    var helpset = req.helpset;
    var type = req.params.type;
    get_helpset_and_type_stats(helpset, type, function(err, stats) {
        if(err) {
            utils.logger().error(err);
            return next(err);
        } else {
            res.render('helpsets/helpset_stats', {
                actor: actor,
                company: company,
                title: company.name + ' help stats',
                stats: stats
            });
        }
    }); 
}

// get stat for one helpset and type.
function get_helpset_and_type_stats(helpset, type, callback) {
    if(type == 'up') {
        UpScore.find({ 'd.helpset_id': helpset.id }, callback);
    } else if(type == 'down') {
        DownScore.find({ 'd.helpset_id': helpset.id }, callback);
    } else {
        ViewScore.find({ 'd.helpset_id': helpset.id }, callback);
    } 
}

// update helpset main information.
exports.change_helpset = function(req, res, next) {
    
    var helpset = req.helpset;
    var page = req.page;
    if(helpset != null) {
        
        var actor = req.user;
        // check if its setting changing the default helpset to show in the page.
        if(req.body.update_default) {
            var is_page_default = req.body.is_page_default;
            var default_first_time_only = typeof req.body.default_first_time_only == "undefined" ? true : req.body.default_first_time_only;
            if(is_page_default) {
                page.default_helpset_id = helpset.id;
                page.default_first_time_only = default_first_time_only;
            } else {
                page.default_helpset_id = null;
            }
            page.save(function(err) {
                if(err) {
                    utils.logger().error(err);
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
                    
                    var page = req.page;
                    var page_info;
                    if(page != null) {
                        if(page.url != "") {
                            page_info = {id: page.id, name: page.url};
                        } else {
                            page_info = {id: page.id, name: page.key};
                        }
                    } else {
                        page_info = {id: "", name: ""};
                    }
                    
                    var is_page_default = false;
                    if(page.default_helpset_id == helpset.id) {
                        is_page_default = true;
                    }
                    
                    var helpset_hash = {_id: helpset.id, name: helpset.name
                            , description: helpset.description, page: page_info
                            , site: site_info, updated_by: updated_by_info, official: helpset.official
                            , is_page_default: is_page_default, can_update: true};
                    res.json(helpset_hash);
                }
            });
            
        } else {
            
                        
            var name = req.body.name;
            var description = req.body.description;
            helpset.name = name;
            helpset.description = description;
            var old_page_id = helpset.page_id.toString();
            if(req.new_page) {
                helpset.page_id = req.new_page.id;
                page = req.new_page;
            }
            
            // TODO: Finish type.
            //helpset.type = model.type;
            helpset.updated_by_id = req.user.id;
            helpset.save(function(err) {
                if(err) {
                    utils.logger().error(err);
                    next(err);
                } else {
                    
                    // change scoring for new page (if it exits).
                    update_helpset_page_scoring(req, res, old_page_id, function(err, scoring) {
                        if(err) {
                            utils.logger().error(err);
                            utils.logger().error("error updating scoring");
                        } 
                        
                        var updated_by_info = {id: actor.id, name: actor.name};
                        
                        var site_info;
                        var site = req.site;
                        if(site != null) {
                            site_info = {id: site.id, name: site.name};
                        } else {
                            site_info = {id: "", name: ""};
                        }
                        
                        var page_info;
                        if(page != null) {
                            page_info = {id: page.id, name: page.name};
                        } else {
                            page_info = {id: "", name: ""};
                        }
                        
                        var is_page_default = false;
                        if(page != null && page.default_helpset_id == helpset.id) {
                            is_page_default = true;
                        }
                        
                        var helpset_hash = {_id: helpset.id, name: helpset.name
                                , description: helpset.description, page: page_info
                                , site: site_info, updated_by: updated_by_info
                                , is_page_default: is_page_default};
                        res.json(helpset_hash);
                       
                    });
                    
                }
                
            });
        }
    } else {
        res.json({ error: "Oops. can't update help. Please try again latter" }, 400);
    }
    
}

// update helpset scoring in page if needed (if the helpset was moved to a new page).
function update_helpset_page_scoring(req, res, old_page_id, main_calback) {
    
    var helpset = req.helpset;
    
    // change scoring only if helpset was moved to a new page.
    if(helpset.page_id.toString() != old_page_id) {
        
        // must create variables outside of 'parallel' because we need to get the scoring and then remove the old key.
        // callback(err, score) after removing does not work.
        var global_score = null;
        var up_score = null;
        var down_score = null;
        async.parallel([
                function get_and_remove_global_score(callback) {
                    scores.member_score({keys:[old_page_id + "_score"], element: helpset.id}).run(function(err, score) {
                        global_score = score;
                        scores.remove(old_page_id + "_score", helpset.id, callback);
                    });
                },
                function get_and_remove_up_score(callback) {
                    scores.member_score({keys:[old_page_id + "_score_up"], element: helpset.id}).run(function(err, score) {
                        up_score = score;
                        scores.remove(old_page_id + "_score_up", helpset.id, callback);
                    });
                },
                function get_and_remove_down_score(callback) {
                    scores.member_score({keys:[old_page_id + "_score_down"], element: helpset.id}).run(function(err, score) {
                        down_score = score;
                        scores.remove(old_page_id + "_score_down", helpset.id, callback);
                    });
                },
            ], function(err, results) {
                if(err) {
                    main_calback(err);
                } else {
                    // create index for page.
                    scores.index(helpset.page_id + "_score", global_score, req.helpset.id);
                    // create index for page (for 'yes' selections).
                    scores.index(helpset.page_id + "_score_up", up_score, req.helpset.id);
                    // create index for page (for 'no' selections).
                    scores.index(helpset.page_id + "_score_down", down_score, req.helpset.id);
                    
                    main_calback(null);
                }
            }
        );
    } else {
        main_calback(null);
    }
}

//flag helpset.
exports.flag_helpset = function(req, res, next) {
    var logged_user = req.user;

    var flag_type = req.body.type;
    var flag_reason = req.body.reason;
    
    var helpset = req.helpset;
    
    var now = new Date();
    var flag = {type: flag_type, reason: flag_reason, created_by_id: logged_user.id, createdAt: now, updatedAt: now};
    // TODO: must change mongoose so the embebbed object is returned 
    // as a new param in the save callback.
    // http://groups.google.com/group/mongoose-orm/browse_thread/thread/94c0888671f63fb9/0d607086fd3d7d44?lnk=gst&q=document+id#
    helpset.flags.push(flag);
    helpset.is_flagged = true;
    helpset.save(function(err){
        if (err) {
            utils.logger().error(err.message);
            res.send({ error: "Oops, something when wrong. Please try again." });
        } else {
            
         // get helpset links to ids (updated_by_id or flag ids).
            var helpset_actor_ids = [];
            // get helpset sites.
            var site_ids = [];
            if(helpset.updated_by_id != null) {
                helpset_actor_ids.push(helpset.updated_by_id);
            }
            if(helpset.flags != null) {
                helpset.flags.forEach(function(flag) {
                    if(flag.created_by_id != null) {
                        helpset_actor_ids.push(flag.created_by_id);
                    }
                });
            }
            
            // removed duplicates.
            helpset_actor_ids = _.uniq(helpset_actor_ids);
               
            Actor.find({ '_id': {"$in": helpset_actor_ids}}, function(err, actors) {
                
                if (err) {
                    utils.logger().error(err.message);
                    res.send({ error: "Oops, something when wrong. Please try again." });
                    return;
                } 
                
                var updated_by_list = actors;
                var updated_by_id = [];
                updated_by_list.forEach(function(updated_by) {
                    updated_by_id[updated_by.id] = updated_by;
                });
                
                var updated_by = updated_by_id[helpset.updated_by_id];
                var updated_by_info;
                if(updated_by != null) {
                    updated_by_info = {id: updated_by.id, name: updated_by.name};
                } else {
                    updated_by_info = {id: "", name: ""};
                }
                
                var site_info;
                var site = req.site;
                if(site != null) {
                    site_info = {id: site.id, name: site.name};
                } else {
                    site_info = {id: "", name: ""};
                }

                var flags = [];
                if(helpset.flags != null) {
                    helpset.flags.forEach(function(flag) {
                        var flag_created_by_id = updated_by_id[flag.created_by_id];
                        if(flag_created_by_id != null) {
                            flags.push({id: flag.id, type: utils.get_flag_type_str(flag.type), reason: flag.reason, name: flag_created_by_id.name});
                        }
                    });
                }
                
                var page_info;
                var page = req.page;
                if(page != null) {
                    page_info = {id: page.id, name: page.name};
                } else {
                    page_info = {id: "", name: ""};
                }
                
                var is_page_default = false;
                if(page != null && page.default_helpset_id == helpset.id) {
                    is_page_default = true;
                }
                
                var helpset_hash = {_id: helpset.id, name: helpset.name
                        , description: helpset.description, page: page_info
                        , site: site_info, updated_by: updated_by_info
                        , is_page_default: is_page_default
                        , flags: flags, is_flagged: helpset.is_flagged};
                res.json(helpset_hash);
                
            });
        }
    });
}

//unflag helpset.
exports.unflag_helpset = function(req, res, next) {
    var logged_user = req.user;

    var helpset = req.helpset;
    
    // remove all flags in this helpset.
    helpset.flags = [];
    helpset.is_flagged = false;
    helpset.save(function(err){
        if (err) {
            utils.logger().error(err.message);
            res.send({ error: "Oops, something when wrong. Please try again." });
        } else {
            
            Actor.findById(helpset.updated_by_id, function(err, actor) {
                
                if (err) {
                    utils.logger().error(err.message);
                    res.send({ error: "Oops, something when wrong. Please try again." });
                } else {
                    var updated_by_info;
                    if(actor != null) {
                        updated_by_info = {id: helpset.updated_by_id, name: actor.name};
                    } else {
                        updated_by_info = {id: helpset.updated_by_id, name: ""};
                    }
                }
                
                var site_info;
                var site = req.site;
                if(site != null) {
                    site_info = {id: site.id, name: site.name};
                } else {
                    site_info = {id: "", name: ""};
                }
                
                var page_info;
                var page = req.page;
                if(page != null) {
                    page_info = {id: page.id, name: page.name};
                } else {
                    page_info = {id: "", name: ""};
                }
                
                var is_page_default = false;
                if(page != null && page.default_helpset_id == helpset.id) {
                    is_page_default = true;
                }
                
                var helpset_hash = {_id: helpset.id, name: helpset.name
                        , description: helpset.description, page: page_info
                        , site: site_info, updated_by: updated_by_info
                        , is_page_default: is_page_default
                        , flags: [], is_flagged: helpset.is_flagged};
                res.json(helpset_hash);
                
            });
        }
    });
}

exports.remove_helpset = function(req, res, next) {
    if(req.site != null && req.helpset != null) {
        var helpset_id = req.helpset.id;
        req.helpset.remove(function(err) {
            if(err) {
                logger().error(err);
                res.json({ error: "Oops. can't delete help. Please try again latter" }, 500);
            } else {
                res.json({ del: true });
            }
        });
    } else {
        res.json({ error: "Oops. can't delete help. Please try again latter" }, 400);
    }
}


