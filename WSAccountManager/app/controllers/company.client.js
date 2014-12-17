var  mongoose = require('mongoose')
    , _ = require('underscore')
    , logger = require('../config/logger').logger();

var Client = mongoose.model('Client');

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