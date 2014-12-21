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

        var clientDetails_hash = [];
        
        clientDetails.forEach(function(each_clientDetail) {
            if (clientDetail_id == each_clientDetail.id) {
                var local_company_name = each_clientDetail.company_name;
                // create page hash with owner information.
                var clientDetail_info = {_id: each_clientDetail.id, company_name: each_clientDetail.company_name
                    , first_name: each_clientDetail.first_name, last_name: each_clientDetail.last_name
                    , first_contact: each_clientDetail.first_contact, second_contact: each_clientDetail.second_contact};
                clientDetails_hash.push(clientDetail_info);
            };
        });

        if (!local_company_name) {
            var local_company_name = "Client";
        };

        res.render('clients/client_detail', {
            actor: logged_user,
            company: company,
            title: local_company_name + ' details',
            clientDetails: clientDetails_hash
        });
    });
}