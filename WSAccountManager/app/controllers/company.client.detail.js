var  mongoose = require('mongoose')
    , _ = require('underscore')
    , logger = require('../config/logger').logger();

var ClientDetail = mongoose.model('ClientDetail');
var Client = mongoose.model('Client');


exports.show_details = function(req, res, next) {
    var logged_user = req.user;
    var company = req.company;
    // need to transform string to ObjectId before querying.
    var company_id = mongoose.Types.ObjectId(company.id);
    var clientDetail_id = req.params.client_id;
    var client = req.params.client_id;

    ClientDetail.find({company_id: company_id}, {}, function(err, clientDetails) {
        if (err) {next(err);}

        var clientDetails_hash = [];
        
        clientDetails.forEach(function(each_clientDetail) {
            if (each_clientDetail.client_id) {
                if (clientDetail_id == each_clientDetail.client_id.toString()) {
                    client = each_clientDetail.client_id;
                    var local_company_name = each_clientDetail.company_name;
                    // create page hash with owner information.
                    var clientDetail_info = {_id: each_clientDetail.id, title: each_clientDetail.title
                        , description: each_clientDetail.description, end_date: each_clientDetail.end_date
                        , alert: each_clientDetail.alert, created: each_clientDetail.created
                        , company_name: each_clientDetail.company_name, created_by_name: each_clientDetail.created_by_name
                        , updated_by_name: each_clientDetail.updated_by_name, resolved: each_clientDetail.resolved };
                    clientDetails_hash.push(clientDetail_info);
                };
            };
        });

        if (!local_company_name) {
            var local_company_name = "Client";
        };

        res.render('clients/client_detail', {
            actor: logged_user,
            company: company,
            client: client,
            title: local_company_name + ' details',
            clientDetails: clientDetails_hash
        });
    });
}

exports.add = function(req, res, next) {
    if (req.client_created) {
        var clientDetail_client_id = req.client_created._id;
        var logged_user = req.user;
        var actor = req.actor;
        var title = "Automatically created by WSAM: " + req.client_created.company_name + "-" + req.client_default_task;
        var description = "Automatically created by WSAM";
        var end_date = "04/10/2015";
        var alert = true;
    } else {
        var clientDetail_client_id = req.params.client_id;
        var logged_user = req.user;
        var actor = req.actor;
        var title = req.body.title;
        var description = req.body.description;
        var end_date = req.body.end_date;
        var alert = req.body.alert;
    }
    
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
                    var client_id = mongoose.Types.ObjectId(clientDetail_client_id);
                    Client.find({ _id: client_id }, function(err, client) {
                        var clientDetail = new ClientDetail();
                        clientDetail.company_name = client[0].company_name;
                        clientDetail.title = title;
                        clientDetail.description = description;
                        clientDetail.end_date = end_date;
                        clientDetail.alert = alert;
                        clientDetail.company_id = req.company._id;
                        clientDetail.client_id = clientDetail_client_id;
                        clientDetail.created_by_name = logged_user.name;
                        clientDetail.created_by_id = logged_user.id;
                        clientDetail.updated_by_name = logged_user.name;
                        clientDetail.updated_by_id = logged_user.id;
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
                var client_id = mongoose.Types.ObjectId(clientDetail_client_id);
                Client.find({ _id: client_id }, function(err, client) {
                    var clientDetail = new ClientDetail();
                    clientDetail.company_name = client[0].company_name;
                    clientDetail.title = title;
                    clientDetail.description = description;
                    clientDetail.end_date = end_date;
                    clientDetail.alert = alert;
                    clientDetail.company_id = req.company._id;
                    clientDetail.client_id = clientDetail_client_id;
                    clientDetail.created_by_name = logged_user.name;
                    clientDetail.created_by_id = logged_user.id;
                    clientDetail.updated_by_name = logged_user.name;
                    clientDetail.updated_by_id = logged_user.id;
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

exports.update = function(req, res, next) {

    ClientDetail.findOne({ _id: req.params.details_id }, function(err, clientDetail) {
        if(clientDetail != null) {
            clientDetail.title = req.body.title;
            clientDetail.description = req.body.description;
            clientDetail.end_date = req.body.end_date;
            clientDetail.alert = req.body.alert;
            clientDetail.updated_by_name = req.user.name;
            clientDetail.updated_by_id = req.user.id;
            clientDetail.updated_by_date = new Date();

            if ((req.body.resolved != clientDetail.resolved) && req.body.resolved == true) {
                clientDetail.resolved_by_name = req.user.name;
            };

            clientDetail.resolved = req.body.resolved;

            clientDetail.save(function(err) {
                if(err) {
                    logger.error(err);
                    next(err);
                } else {
                    res.writeHead(200, {'content-type': 'text/json' });
                    var clientDetail_hash = { _id: clientDetail._id, title: clientDetail.title
                        , description: clientDetail.description , end_date: clientDetail.end_date
                        , alert: clientDetail.alert, resolved: clientDetail.resolved
                        , resolved_by_name: clientDetail.resolved_by_name };

                    res.write(JSON.stringify(clientDetail_hash));
                    res.end('\n');
                }
            }); 
        } else {
            next(new Error("Can't find client detail"));
        }
    });

}

exports.remove = function(req, res, next) {

    var logged_user = req.user;
    var actor = req.actor;
    
    ClientDetail.findOne({ _id: req.params.details_id }, function(err, clientDetail) {
        if (err) {
            res.send({ error: "Oops. Something went wrong. Please try again." });
        } else {
            // remove client from db.
            clientDetail.remove(function(err) {
                if (err) {
                    res.send({ error: "Oops. Something went wrong. Please try again." });
                } else {
                    res.send({ del: true });
                }
            });
        }
    });
}