var  mongoose = require('mongoose')
    , _ = require('underscore')
    , async = require('async')
    , logger = require('../config/logger').logger();

var Credential = mongoose.model('Credential');

exports.show = function(req, res, next) {
    var logged_user = req.user;
    var company = req.company;
    var client = req.client_model;
    // need to transform string to ObjectId before querying.
    var client_id = mongoose.Types.ObjectId(client.id);

    Credential.find({client_id: client_id}, {}, function(err, credentials) {
        if (err) {next(err);}

        var credentials_hash = [];
        // create page hash with owner information.
        credentials.forEach(function(credential) {
            var credential_info = {_id: credential.id, credential_name: credential.credential_name 
            , credential_description: credential.credential_description , credential_username: credential.credential_username
            , credential_password: credential.credential_password, created_by_name: credential.created_by_name
            , updated_by_name: credential.updated_by_name };
            credentials_hash.push(credential_info);
        });

        res.render('credentials/credentials', {
            actor: logged_user,
            company: company,
            client_model: client,
            title: client.company_name + ' credentials',
            existent_tasks: Credential.existent_tasks,
            credentials: credentials_hash
        });

    });
}

exports.add = function(req, res, next) {
    var logged_user = req.user;
    var actor = req.actor;
    var credential_name = req.body.credential_name;
    var credential_description = req.body.credential_description;
    var credential_username = req.body.credential_username;
    var credential_password = req.body.credential_password;
    
    if(credential_name === undefined || credential_name === "") {
        res.send({ errors: { credential_name: "This field is required." } });
    }else if(credential_description === undefined || credential_description === ""){
        res.send({ errors: { credential_description: "This field is required." } });
    }else if(credential_username === undefined || credential_username === ""){
        res.send({ errors: { credential_username: "This field is required." } });
    }else if(credential_password === undefined || credential_password === ""){
        res.send({ errors: { credential_password: "This field is required." } });
    }
    else {
        Credential.findOne({ credential_name: credential_name, client_id: req.client_id }, function(err, credential) {
            if (err) {
                logger.error(err);
                res.send({ errors: {general: "Oops. Something went wrong. Please try again." } });
            } else if(credential != null) {
                logger.error(new Error("Credential " + credential_name + " already exists."));
                res.send({ errors: {credential_name: "Someone already has claimed that name." } });
            } else {
                var credential = new Credential();
                credential.credential_name = credential_name;
                credential.credential_description = credential_description;
                credential.credential_username = credential_username;
                credential.credential_password = credential_password;
                credential.company_id = req.company._id;
                credential.client_id = req.client_model._id;
                credential.created_by_name = logged_user.name;
                credential.created_by_id = logged_user.id;
                credential.updated_by_name = logged_user.name;
                credential.updated_by_id = logged_user.id;
                credential.save(function(err){
                    if (err) {
                        logger.debug(err);
                        res.send({ errors: {general: "Oops. Something went wrong. Please try again." } });
                    } else {
                        var updated_by_info = {id: logged_user.id, name: logged_user.name};
                        res.writeHead(200, {'content-type': 'text/json' });
                        var credential_hash = { _id: credential._id, credential_name: credential.credential_name
                            , credential_description: credential.credential_description
                            , credential_username: credential.credential_username
                            , credential_password: credential.credential_password };

                        res.write(JSON.stringify(credential_hash));
                        res.end('\n');
                    }
                });
            }
        });
    }
}

exports.update = function(req, res, next) {

    // the credential has to be sought by ID because 'credential' is a variable used by Websockets
    Credential.findOne({ _id: req.params.credentials_id }, function(err, credential) {
        if(credential != null) {
            credential.credential_name = req.body.credential_name;
            credential.credential_description = req.body.credential_description;
            credential.credential_username = req.body.credential_username;
            credential.credential_password = req.body.credential_password;
            credential.updated_by_name = req.user.name;
            credential.updated_by_id = req.user.id;
            credential.updated_by_date = new Date();

            credential.save(function(err) {
                if(err) {
                    logger.error(err);
                    next(err);
                } else {
                    res.writeHead(200, {'content-type': 'text/json' });
                    var credential_hash = { _id: credential._id, credential_name: credential.credential_name
                        , credential_description: credential.credential_description
                        , credential_username: credential.credential_username
                        , credential_password: credential.credential_password };

                    res.write(JSON.stringify(credential_hash));
                    res.end('\n');
                }
            }); 
        } else {
            next(new Error("Can't find credential"));
        }
    });

}

exports.remove = function(req, res, next) {
    var logged_user = req.user;
    var actor = req.actor;

    // the credential has to be sought by ID because 'credential' is a variable used by Websockets
    Credential.findOne({ _id: req.params.credentials_id }, function(err, credential) {
        if (err) {
            res.send({ error: "Oops. Something went wrong. Please try again." });
        } else {
            // remove credential from db.
            credential.remove(function(err) {
                if (err) {
                    res.send({ error: "Oops. Something went wrong. Please try again." });
                } else {
                    res.send({ del: true });
                }
            });
        }
    });
}