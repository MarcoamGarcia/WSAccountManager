var  mongoose = require('mongoose')
    , _ = require('underscore')
    , async = require('async')
    , logger = require('../config/logger').logger();

var Client = mongoose.model('Client');
var ClientDetail = mongoose.model('ClientDetail');

exports.load = function(req, res, next, client_id) {
    Client.findById(client_id, function (err, client) {
        if(err) {
            return next(err);
        }
        if(client == null) {
            return next(new Error("can't find company"));
        } 
        req.client_model = client;
        req.client_id = client_id;
        // set company object in result.
        res.locals.client_model = client;
        next();
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
            , last_name: client.last_name, first_contact: client.first_contact, second_contact: client.second_contact
            , default_task: client.default_task, created_by_name: client.created_by_name
            , updated_by_name: client.updated_by_name, nif: client.nif, niss: client.niss };
            clients_hash.push(client_info);
        });

        res.render('clients/clients', {
            actor: logged_user,
            company: company,
            title: company.name + ' clients',
            existent_tasks: Client.existent_tasks,
            clients: clients_hash
        });

    });
}

exports.show_more_info = function(req, res, next) {
    var logged_user = req.user;
    var company = req.company;
    var client_model = req.client_model;
    // need to transform string to ObjectId before querying.
    var client_id = mongoose.Types.ObjectId(client_model.id);

    Client.find({_id: client_id}, {}, function(err, clients) {
        if (err) {next(err);}

        var clients_hash = [];
        // create page hash with owner information.
        clients.forEach(function(client) {
            var client_info = {_id: client.id, company_name: client.company_name , first_name: client.first_name
            , last_name: client.last_name, first_contact: client.first_contact, second_contact: client.second_contact
            , nif: client.nif, niss: client.niss, default_task: client.default_task, address: client.address };
            clients_hash.push(client_info);
        });

        res.render('clients_more_info/clients_more_info', {
            actor: logged_user,
            company: company,
            client_id: client_id,
            title: company.name + ' clients',
            existent_tasks: Client.existent_tasks,
            clients: clients_hash
        });

    });
}

exports.add = function(req, res, next) {
    var logged_user = req.user;
    var actor = req.actor;
    var company_name = req.body.company_name;
    var first_name = req.body.first_name;
    var last_name = req.body.last_name;
    var first_contact = req.body.first_contact;
    var default_task = req.body.default_task;
    var second_contact = req.body.second_contact;
    var nif = req.body.nif;
    var niss = req.body.niss;
    var address = req.body.address;
    
    if(first_name === undefined || first_name === "") {
        res.send({ errors: { first_name: "This field is required." } });
    }else if(company_name === undefined || company_name === ""){
        res.send({ errors: { company_name: "This field is required." } });
    }
    else {
        Client.find({ first_name: first_name }, function(err, client) {
            if (err) {
                logger.error(err);
                res.send({ errors: {general: "Oops. Something went wrong. Please try again." } });
            } else if(client.length > 0) {
                var local_is_unique = true;
                client.forEach(function(local_client) {
                    if (local_client.company_id.toString() == req.params.c_id) {
                        local_is_unique = false;
                    };
                });
                // check is unique for this company
                if (local_is_unique == false) {
                    logger.error(new Error("Client " + first_name + " already exists."));
                    res.send({ errors: {first_name: "Someone already has claimed that name." } });
                } else {
                    var client = new Client();
                    client.company_name = company_name;
                    client.first_name = first_name;
                    client.last_name = last_name;
                    client.first_contact = first_contact;
                    client.default_task = default_task;
                    client.second_contact = second_contact;
                    client.nif = nif;
                    client.niss = niss;
                    client.address = address;
                    client.company_id = req.company._id;
                    client.created_by_name = logged_user.name;
                    client.created_by_id = logged_user.id;
                    client.updated_by_name = logged_user.name;
                    client.updated_by_id = logged_user.id;
                    client.save(function(err){
                        if (err) {
                            logger.debug(err);
                            res.send({ errors: {general: "Oops. Something went wrong. Please try again." } });
                        } else {
                            //res.writeHead(200, {'content-type': 'text/json' });
                            var client_hash = { _id: client._id, company_name: client.company_name, first_name: client.first_name
                                , last_name: client.last_name, first_contact: client.first_contact, second_contact: client.second_contact
                                , default_task: client.default_task, nif: client.nif, niss: client.niss, address: client.address
                                , created_by_name: client.created_by_name, created_by_id: client.created_by_id
                                , updated_by_name: client.updated_by_name, updated_by_id: client.updated_by_id};

                            //res.write(JSON.stringify(client_hash));
                            //res.end('\n');
                            req.client_created = client;
                            req.client_default_task = default_task;
                            next();
                        }
                    });
                }
            } else {
                var client = new Client();
                client.company_name = company_name;
                client.first_name = first_name;
                client.last_name = last_name;
                client.first_contact = first_contact;
                client.default_task = default_task;
                client.second_contact = second_contact;
                client.nif = nif;
                client.niss = niss;
                client.address = address;
                client.company_id = req.company._id;
                client.created_by_name = logged_user.name;
                client.created_by_id = logged_user.id;
                client.updated_by_name = logged_user.name;
                client.updated_by_id = logged_user.id;
                client.save(function(err){
                    if (err) {
                        logger.debug(err);
                        res.send({ errors: {general: "Oops. Something went wrong. Please try again." } });
                    } else {
                        //res.writeHead(200, {'content-type': 'text/json' });
                        var client_hash = { _id: client._id, company_name: client.company_name, first_name: client.first_name
                            , last_name: client.last_name, first_contact: client.first_contact, second_contact: client.second_contact
                            , default_task: client.default_task, nif: client.nif, niss: client.niss, address: client.address
                            , created_by_name: client.created_by_name, created_by_id: client.created_by_id
                            , updated_by_name: client.updated_by_name, updated_by_id: client.updated_by_id };

                        //res.write(JSON.stringify(client_hash));
                        //res.end('\n');
                        req.client_created = client;
                        req.client_default_task = default_task;
                        next();
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
            client.default_task = req.body.default_task;
            client.second_contact = req.body.second_contact;
            client.updated_by_name = req.user.name;
            client.updated_by_id = req.user.id;
            client.updated_by_date = new Date();
            client.nif = req.body.nif;
            client.niss = req.body.niss;


            client.save(function(err) {
                if(err) {
                    logger.error(err);
                    next(err);
                } else {
                    res.writeHead(200, {'content-type': 'text/json' });
                    var client_hash = { _id: client._id, company_name: client.company_name, first_name: client.first_name
                        , last_name: client.last_name, first_contact: client.first_contact, second_contact: client.second_contact
                        , default_task: client.default_task, nif: client.nif, niss: client.niss };

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

    async.series([ 
        //delete details associated with the client
        function remove_client_details(callback) {
            var client_id = mongoose.Types.ObjectId(req.params.client_id);
            ClientDetail.find({ client_id: client_id }, function(err, clientDetails) {
                if(err) {
                    next(err);
                } else {
                    if(clientDetails.length > 0) {
                        async.each(clientDetails, function(clientDetail, callback) {
                            // remove client from db.
                            clientDetail.remove(function(err) {
                                if (err) {
                                    res.send({ error: "Oops. Something went wrong. Please try again." });
                                }
                            });
                        });
                    }
                }

            });
            callback(null);
        },
        //delete the client
        function removing_client(callback) {
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
                            callback(null);
                        }
                    });
                }
            });
        }

    ]);
}

exports.create_defalt_tasks = function(default_task) {
    var title = "Automatically Generated";
    var description = "Automatically Generated";
    var aux_date = "21/";
    var month = new Date().getMonth() + 1;
    var year = new Date().getFullYear();
    var end_date = aux_date + month + "/" + year;
    var alert = true;
    
    if(title === undefined || title === "") {
        res.send({ errors: { title: "This field is required." } });
    }else if(description === undefined || description === ""){
        res.send({ errors: { description: "This field is required." } });
    }else if(end_date === undefined || end_date === ""){
        res.send({ errors: { end_date: "This field is required." } });
    }
    else {
        ClientDetail.find({ title: title }, function(err, clientDetail) {
            if (err) {
                logger.error(err);
                res.send({ errors: {general: "Oops. Something went wrong. Please try again." } });
            } else if(clientDetail.length > 0) {
                var local_is_unique = true;
                clientDetail.forEach(function(local_clientDetail) {
                    if (local_clientDetail.company_id.toString() == req.params.c_id) {
                        local_is_unique = false;
                    };
                });
                // check is unique for this company
                if (local_is_unique == false) {
                    logger.error(new Error("Client detail " + title + " already exists."));
                    res.send({ errors: {title: "Someone already has claimed that name." } });
                } else {
                    var client_id = mongoose.Types.ObjectId(req.params.client_id);
                    Client.find({ _id: client_id }, function(err, client) {
                        var clientDetail = new ClientDetail();
                        clientDetail.company_name = client[0].company_name;
                        clientDetail.title = title;
                        clientDetail.description = description;
                        clientDetail.end_date = end_date;
                        clientDetail.alert = alert;
                        clientDetail.company_id = req.company._id;
                        clientDetail.client_id = req.params.client_id;
                        clientDetail.save(function(err){
                            if (err) {
                                logger.debug(err);
                                res.send({ errors: {general: "Oops. Something went wrong. Please try again." } });
                            } else {
                                res.writeHead(200, {'content-type': 'text/json' });
                                var clientDetail_hash = { _id: clientDetail._id, title: clientDetail.title
                                    , description: clientDetail.description , end_date: clientDetail.end_date
                                    , alert: clientDetail.alert, company_name: clientDetail.company_name };

                                res.write(JSON.stringify(clientDetail_hash));
                                res.end('\n');
                            }
                        });
                    });
                }
            } else {
                var client_id = mongoose.Types.ObjectId(req.params.client_id);
                Client.find({ _id: client_id }, function(err, client) {
                    var clientDetail = new ClientDetail();
                    clientDetail.company_name = client[0].company_name;
                    clientDetail.title = title;
                    clientDetail.description = description;
                    clientDetail.end_date = end_date;
                    clientDetail.alert = alert;
                    clientDetail.company_id = req.company._id;
                    clientDetail.client_id = req.params.client_id;
                    clientDetail.save(function(err){
                        if (err) {
                            logger.debug(err);
                            res.send({ errors: {general: "Oops. Something went wrong. Please try again." } });
                        } else {
                            res.writeHead(200, {'content-type': 'text/json' });
                            var clientDetail_hash = { _id: clientDetail._id, title: clientDetail.title
                                , description: clientDetail.description , end_date: clientDetail.end_date
                                , alert: clientDetail.alert, company_name: clientDetail.company_name };

                            res.write(JSON.stringify(clientDetail_hash));
                            res.end('\n');
                        }
                    });
                });
            }
        });
    }
}