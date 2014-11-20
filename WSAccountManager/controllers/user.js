var sjcl = require('sjcl');
var Secret_Passphrase = "afrgaer#dkWPEOKF";

/* GET Userlist page. */
exports.userList = function(req, res, next) {
    var db = req.db;
    db.clients.find(function(err, docs) {
        res.json(docs);
    });
}

/* GET New User page. */
exports.newUser = function(req, res, next) {
    res.render('newuser', { title: 'Invite New User' });
}

exports.inviteUser = function(req, res) {
    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var userName = req.body.username;
    var userEmail = req.body.useremail;
    var encrypt_password = sjcl.encrypt(Secret_Passphrase, req.body.userpassword);
    var is_admin = false;
    if (typeof req.body.admin_checkbox != "undefined" && req.body.admin_checkbox != null) {
        is_admin = true;
    };

    // Submit to the DB
    db.users.insert({
        "username" : userName,
        "email" : userEmail,
        "password" : encrypt_password,
        "is_admin" : is_admin
    }, function (err, doc) {
        if (err) {
            // If it failed, return error
            res.send("There was a problem adding the information to the database.");
        }
        else {
            // If it worked, set the header so the address bar doesn't still say /adduser
            res.location("userlist");
            // And forward to success page
            res.redirect("userlist");
        }
    });
}

exports.userInfo = function(req, res, next) {
	var db = req.db;
	var userId = req.db.ObjectId(req.params.id);

	db.users.findOne({ "_id" : userId }, function(err, users)
	{
		if (err) return;
		res.render('userInfo', {
            "userInfo" : users
        });
	});
}