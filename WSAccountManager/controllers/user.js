/* GET Userlist page. */
exports.userList = function(req, res, next) {
    var db = req.db;
    db.users.find(function(err, docs) {
        res.json(docs);
    });
}

/* GET New User page. */
exports.newUser = function(req, res, next) {
    res.render('newuser', { title: 'Add New User' });
}

exports.addUser = function(req, res) {
    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var userName = req.body.username;
    var userEmail = req.body.useremail;

    // Submit to the DB
    db.users.insert({
        "username" : userName,
        "email" : userEmail
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