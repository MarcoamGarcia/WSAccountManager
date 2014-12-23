var  mongoose = require('mongoose')
    , _ = require('underscore')
    , logger = require('../config/logger').logger();

var ClientDetail = mongoose.model('ClientDetail');


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
                        , alert: each_clientDetail.alert, created: each_clientDetail.created };
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
    var logged_user = req.user;
    var actor = req.actor;
    var title = req.body.title;
    var description = req.body.description;
    var end_date = req.body.end_date;
    var alert = req.body.alert;
    
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
                    var clientDetail = new ClientDetail();
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
                                , alert: clientDetail.alert };

                            res.write(JSON.stringify(clientDetail_hash));
                            res.end('\n');
                        }
                    });
                }
            } else {
                var clientDetail = new ClientDetail();
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
                            , alert: clientDetail.alert };

                        res.write(JSON.stringify(clientDetail_hash));
                        res.end('\n');
                    }
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

            clientDetail.save(function(err) {
                if(err) {
                    logger.error(err);
                    next(err);
                } else {
                    res.writeHead(200, {'content-type': 'text/json' });
                    var clientDetail_hash = { _id: clientDetail._id, title: clientDetail.title
                        , description: clientDetail.description , end_date: clientDetail.end_date
                        , alert: clientDetail.alert };

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