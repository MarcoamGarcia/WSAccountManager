var  mongoose = require('mongoose')
    , _ = require('underscore')
    , async = require('async')
    , logger = require('../config/logger').logger();

var Credencial = mongoose.model('Credencial');

exports.show = function(req, res, next) {
    var logged_user = req.user;
    var company = req.company;
    var client = req.client_model;
    // need to transform string to ObjectId before querying.
    var client_id = mongoose.Types.ObjectId(client.id);

    Credencial.find({client_id: client_id}, {}, function(err, credencials) {
        if (err) {next(err);}

        var credencials_hash = [];
        // create page hash with owner information.
        credencials.forEach(function(credencial) {
            var credencial_info = {_id: credencial.id, credencial_name: credencial.credencial_name 
            , credencial_description: credencial.credencial_description , credencial_username: credencial.credencial_username
            , credencial_password: credencial.credencial_password };
            credencials_hash.push(credencial_info);
        });

        res.render('credencials/credencials', {
            actor: logged_user,
            company: company,
            client_model: client,
            title: client.name + ' credencials',
            existent_tasks: Credencial.existent_tasks,
            credencials: credencials_hash
        });

    });
}

exports.add = function(req, res, next) {
    var logged_user = req.user;
    var actor = req.actor;
    var credencial_name = req.body.credencial_name;
    var credencial_description = req.body.credencial_description;
    var credencial_username = req.body.credencial_username;
    var credencial_password = req.body.credencial_password;
    
    if(credencial_name === undefined || credencial_name === "") {
        res.send({ errors: { credencial_name: "This field is required." } });
    }else if(credencial_description === undefined || credencial_description === ""){
        res.send({ errors: { credencial_description: "This field is required." } });
    }else if(credencial_username === undefined || credencial_username === ""){
        res.send({ errors: { credencial_username: "This field is required." } });
    }else if(credencial_password === undefined || credencial_password === ""){
        res.send({ errors: { credencial_password: "This field is required." } });
    }
    else {
        Credencial.findOne({ credencial_name: credencial_name, client_id: req.client_id }, function(err, credencial) {
            if (err) {
                logger.error(err);
                res.send({ errors: {general: "Oops. Something went wrong. Please try again." } });
            } else if(credencial != null) {
                logger.error(new Error("Credencial " + credencial_name + " already exists."));
                res.send({ errors: {credencial_name: "Someone already has claimed that name." } });
            } else {
                var credencial = new Credencial();
                credencial.credencial_name = credencial_name;
                credencial.credencial_description = credencial_description;
                credencial.credencial_username = credencial_username;
                credencial.credencial_password = credencial_password;
                credencial.company_id = req.company._id;
                credencial.client_id = req.client_model._id;
                credencial.save(function(err){
                    if (err) {
                        logger.debug(err);
                        res.send({ errors: {general: "Oops. Something went wrong. Please try again." } });
                    } else {
                        var updated_by_info = {id: logged_user.id, name: logged_user.name};
                        res.writeHead(200, {'content-type': 'text/json' });
                        var credencial_hash = { _id: credencial._id, credencial_name: credencial.credencial_name
                            , credencial_description: credencial.credencial_description
                            , credencial_username: credencial.credencial_username
                            , credencial_password: credencial.credencial_password };

                        res.write(JSON.stringify(credencial_hash));
                        res.end('\n');
                    }
                });
            }
        });
    }
}

exports.update = function(req, res, next) {

    // the credencial has to be sought by ID because 'credencial' is a variable used by Websockets
    Credencial.findOne({ _id: req.params.credencial_id }, function(err, credencial) {
        if(credencial != null) {
            credencial.company_name = req.body.company_name;
            credencial.first_name = req.body.first_name;
            credencial.last_name = req.body.last_name;
            credencial.first_contact = req.body.first_contact;
            credencial.default_task = req.body.default_task;
            credencial.second_contact = req.body.second_contact;

            credencial.save(function(err) {
                if(err) {
                    logger.error(err);
                    next(err);
                } else {
                    res.writeHead(200, {'content-type': 'text/json' });
                    var credencial_hash = { _id: credencial._id, company_name: credencial.company_name, first_name: credencial.first_name
                        , last_name: credencial.last_name, first_contact: credencial.first_contact, second_contact: credencial.second_contact
                        , default_task: credencial.default_task};

                    res.write(JSON.stringify(credencial_hash));
                    res.end('\n');
                }
            }); 
        } else {
            next(new Error("Can't find credencial"));
        }
    });

}

exports.remove = function(req, res, next) {
    var logged_user = req.user;
    var actor = req.actor;

    async.series([ 
        //delete details associated with the credencial
        function remove_credencial_details(callback) {
            var credencial_id = mongoose.Types.ObjectId(req.params.credencial_id);
            ClientDetail.find({ credencial_id: credencial_id }, function(err, credencialDetails) {
                if(err) {
                    next(err);
                } else {
                    if(credencialDetails.length > 0) {
                        async.each(credencialDetails, function(credencialDetail, callback) {
                            // remove credencial from db.
                            credencialDetail.remove(function(err) {
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
        //delete the credencial
        function removing_credencial(callback) {
            // the credencial has to be sought by ID because 'credencial' is a variable used by Websockets
            Credencial.findOne({ _id: req.params.credencial_id }, function(err, credencial) {
                if (err) {
                    res.send({ error: "Oops. Something went wrong. Please try again." });
                } else {
                    // remove credencial from db.
                    credencial.remove(function(err) {
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