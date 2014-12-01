/* GET New User page. */
exports.newClient = function(req, res, next) {
    res.render('newclient', { title: 'Add New Client' });
}

/* GET Userlist page. */
exports.clientList = function(req, res, next) {
    var db = req.db;
    db.clients.find(function(err, docs) {
        res.json(docs);
    });
}

exports.addClient = function(req, res) {
    // Set our internal DB variable
    var db = req.db;

    if ((typeof req.body.company_name != "undefined" && req.body.company_name != null && req.body.company_name != "")
        && (typeof req.body.first_contact != "undefined" && req.body.first_contact != null && req.body.first_contact != "")
        && (typeof req.body.first_name != "undefined" && req.body.first_name != null && req.body.first_name != "")
        && (typeof req.body.last_name != "undefined" && req.body.last_name != null && req.body.last_name != "")) {

	    // Get our form values. These rely on the "name" attributes
	    var companyName = req.body.company_name;
	    var firstContact = req.body.first_contact;
	    var firstName = req.body.first_name;
	    var lastName = req.body.last_name;
	    var secondContact = req.body.second_contact;

	    if (typeof req.body.admin_checkbox != "undefined" && req.body.admin_checkbox != null) {
	        is_admin = true;
	    };
	    db.clients.find({ companyname: companyName }, function(err, client) {
	    	//make sure that this company does not exists
	    	if (client.length == 0) {
		       	// Submit to the DB
			    db.clients.insert({
			        "companyname" : companyName,
			        "firstcontact" : firstContact,
			        "firstname" : firstName,
			        "lastname" : lastName,
			        "secondcontact" : secondContact
			    }, function (err, doc) {
			        if (err) {
			            // If it failed, return error
			            res.send("There was a problem adding the information to the database.");
			        }
			        else {
			            // If it worked, set the header so the address bar doesn't still say /adduser
			            res.location("/company/#clients");
			            // And forward to success page
			            res.redirect("/company/#clients");
			        }
			    });
	    	} else {
	    		// If it worked, set the header so the address bar doesn't still say /adduser
				res.location("/company/#clients");
	            // And forward to success page
	            res.redirect("/company/#clients");
	            //res.send(500, { error: "hi, there was an error" });
	    	}
	    });
	}
}