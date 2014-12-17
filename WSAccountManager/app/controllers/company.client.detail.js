var  mongoose = require('mongoose')
    , _ = require('underscore')
    , logger = require('../config/logger').logger();

var ClientDetail = mongoose.model('ClientDetail');


exports.show_details = function(req, res, next) {
    var logged_user = req.user;
    var company = req.company;
    // need to transform string to ObjectId before querying.
    var company_id = mongoose.Types.ObjectId(company.id);

    var clientDetail_id = req.params.clientDetail_id;

    ClientDetail.find({company_id: company_id}, {}, function(err, clientDetails) {
        if (err) {next(err);}

         _.each(clientDetails, function(each_clientDetail) {
            if (clientDetail_id == each_clientDetail.id) {
                var clientDetails_hash = [];
                // create page hash with owner information.
                var clientDetail_info = {_id: each_clientDetail.id, company_name: each_clientDetail.company_name
                    , first_name: each_clientDetail.first_name, last_name: each_clientDetail.last_name
                    , first_contact: each_clientDetail.first_contact, second_contact: each_clientDetail.second_contact};
                clientDetails_hash.push(clientDetail_info);

                res.render('clients/client_detail', {
                    actor: logged_user,
                    company: company,
                    title: each_clientDetail.company_name + ' details',
                    clientDetails: clientDetails_hash
                });
            };
         });
    });
}