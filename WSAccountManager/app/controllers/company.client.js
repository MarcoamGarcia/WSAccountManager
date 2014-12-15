var async = require('async')
    , mongoose = require('mongoose')
    , utils = require('../lib/utils')
    , fs = require('fs')
    , _ = require('underscore')
    , logger = require('../config/logger').logger()
    , actor_middleware = require('../middlewares/actor_middleware');

var Client = mongoose.model('Client');
var Actor = mongoose.model('Actor');
var Site = mongoose.model('Site');
var Company = mongoose.model('Company');

exports.load_with_site = function(req, res, next, client_id) {
    
    Client.findById(client_id, function (err, client) {
        if(err) {
            console.err(err);
            return next(err);
        }
        if(client == null) {
            console.err("Can't find client");
            return next(new Error("Can't find client"));
        }
        req.client = client;
        res.client = client;

        Site.findById(client.site_id, function(err, site) {
            if(err) {
                next(err);
            } else if(site == 'null') {
                console.err("Cannot find site");
                next(new Error("Cannot find site for this client : " + client.id + "!"));
            } else {
                req.site = site;
                res.site = site;
                next();
            }
        });
        
    });
    
}

exports.show_site_clients = function(req, res, next) {

	var page = parseInt(req.params.page) || 1;
    res.locals.page = page;
    
    var actor = req.actor;
    var site = req.site;
    var company = req.company;
    // need to transform string to ObjectId before querying.
    var site_id = mongoose.Types.ObjectId(site.id);
    
    var from = (page - 1) * utils.paginate_limit();

	Client.find({site_id: site_id}, {},{skip: from, limit: utils.paginate_limit }, function(err, clients) {
        if(err) {
            next(err);
        } else {

        	var client_actor_ids = [];
            clients.forEach(function(client) {
                if(client.updated_by_id != null) {
                    client_actor_ids.push(client.updated_by_id);
                }
            });

            client_actor_ids = _.uniq(client_actor_ids);
            async.parallel([
            	function get_updated_by_id_actors(callback) {
            	    Actor.find({ '_id': {"$in": client_actor_ids}}, callback);
            	},
            ], 	function(err, results) {
	            	if(err) {
	                	next(err);
                	} else {
                		var actors_by_id = get_actors_by_id(results[0]);               

                        var clients_hash = [];
                        // create page hash with owner information.
                        clients.forEach(function(client) {
                            var client_info = {_id: client.id, company_name: client.company_name
                                            	, first_name: client.first_name, last_name: client.last_name
                                                , first_contact: client.first_contact
                                                , second_contact: client.second_contact};
                            clients_hash.push(client_info);
                        });

                        res.render('clients/clients', {
                            actor: actor,
                            company: company,
                            title: company.name + ' clients',
                            clients: clients_hash
                        });
                	}
                }
       		);
        }
    });

}

exports.show = function(req, res, next) {
    var logged_user = req.user;
    var company = req.company;
    // need to transform string to ObjectId before querying.
    var company_id = mongoose.Types.ObjectId(company.id);

    Client.find({company_id: company_id}, {}, function(err, clients) {
        if (err) {next(err);}

        var clients_hash = [];
        // create page hash with owner information.
        clients.forEach(function(client) {
            var client_info = {_id: client.id, company_name: client.company_name , first_name: client.first_name
            , last_name: client.last_name, first_contact: client.first_contact, second_contact: client.second_contact };
            clients_hash.push(client_info);
        });

        res.render('clients/clients', {
            actor: logged_user,
            company: company,
            title: company.name + ' clients',
            clients: clients_hash
        });

    });
}

function get_actors_by_id(actors_list) {
    var actors_by_id = [];
    actors_list.forEach(function(actor) {
        actors_by_id[actor.id] = actor;
    });
    return actors_by_id;
}

function get_updated_by_info(updated_by_id, client) {
    var updated_by = updated_by_id[client.updated_by_id];
    var updated_by_info;
    if(updated_by != null) {
        updated_by_info = {id: updated_by.id, name: updated_by.name};
    } else {
        updated_by_info = {id: "", name: ""};
    }
    return updated_by_info;
}

function get_site_info(sites_id, client) {
    var site = sites_id[client.site_id];
    var site_info;
    if(site != null) {
        site_info = {id: site.id, name: site.name, url: site.url};
    } else {
        site_info = {id: "", name: "", url: ""};
    }
    return site_info;
}

exports.add = function(req, res, next) {
    var logged_user = req.user;
    var actor = req.actor;
    var company_name = req.body.company_name;
    var first_name = req.body.first_name;
    var last_name = req.body.last_name;
    var first_contact = req.body.first_contact;
    var second_contact = req.body.second_contact;
    
    if(first_name === undefined || first_name === "") {
        res.send({ errors: { first_name: "This field is required." } });
    }else if(company_name === undefined || company_name === ""){
        res.send({ errors: { company_name: "This field is required." } });
    }
    else {
        Client.findOne({ first_name: first_name }, function(err, client) {
            if (err) {
                logger.error(err);
                res.send({ errors: {general: "Oops. Something went wrong. Please try again." } });
            } else if(client != null) {
                logger.error(new Error("Client " + first_name + " already exists."));
                res.send({ errors: {first_name: "Someone already has claimed that name." } });
            } else {
                var client = new Client();
                client.company_name = company_name;
                client.first_name = first_name;
                client.last_name = last_name;
                client.first_contact = first_contact;
                client.second_contact = second_contact;
                client.company_id = req.company._id;
                client.save(function(err){
                    if (err) {
                        logger.debug(err);
                        res.send({ errors: {general: "Oops. Something went wrong. Please try again." } });
                    } else {
                        res.writeHead(200, {'content-type': 'text/json' });
                        var client_hash = { _id: client._id, company_name: client.company_name, first_name: client.first_name
                            , last_name: client.last_name, first_contact: client.first_contact, second_contact: client.second_contact};

                        res.write(JSON.stringify(client_hash));
                        res.end('\n');
                    }
                });
            }
        });
    }
}

exports.update = function(req, res, next) {

    // the client has to be sought by ID because 'client' is a variable used by Websockets
    Client.findOne({ _id: req.params.client_id }, function(err, client) {
        if(client != null) {
            client.company_name = req.body.company_name;
            client.first_name = req.body.first_name;
            client.last_name = req.body.last_name;
            client.first_contact = req.body.first_contact;
            client.second_contact = req.body.second_contact;

            client.save(function(err) {
                if(err) {
                    logger.error(err);
                    next(err);
                } else {
                    res.writeHead(200, {'content-type': 'text/json' });
                    var client_hash = { _id: client._id, company_name: client.company_name, first_name: client.first_name
                        , last_name: client.last_name, first_contact: client.first_contact, second_contact: client.second_contact};

                    res.write(JSON.stringify(client_hash));
                    res.end('\n');
                }
            }); 
        } else {
            next(new Error("Can't find client"));
        }
    });

}

exports.remove = function(req, res, next) {

    var logged_user = req.user;
    var actor = req.actor;
    
    // the client has to be sought by ID because 'client' is a variable used by Websockets
    Client.findOne({ _id: req.params.client_id }, function(err, client) {
        if (err) {
            res.send({ error: "Oops. Something went wrong. Please try again." });
        } else {
            // remove client from db.
            client.remove(function(err) {
                if (err) {
                    res.send({ error: "Oops. Something went wrong. Please try again." });
                } else {
                    res.send({ del: true });
                }
            });
        }
    });
}