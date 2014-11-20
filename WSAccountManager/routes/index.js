var express = require('express');
var router = express.Router();
var passport = require('passport');

var user = require('../controllers/user')
    , client = require('../controllers/client');

// As with any middleware it is quintessential to call next()
// if the user is authenticated
var isAuthenticated = function (req, res, next) {
  if (req.isAuthenticated())
    return next();
  res.redirect('/');
}

router.get('/', function(req, res) {
	// Display the Login page with any flash message, if any
	res.render('login', { message: req.flash('message') });
});

/* Handle Login POST */
router.post('/login', passport.authenticate('login', {
	successRedirect: '/home',
	failureRedirect: '/',
	failureFlash : true 
}));

/* GET Registration Page */
/*router.get('/signup', function(req, res){
res.render('register',{message: req.flash('message')});
});*/

/* Handle Registration POST */
/*router.post('/signup', passport.authenticate('signup', {
successRedirect: '/home',
failureRedirect: '/signup',
failureFlash : true 
}));*/

/* Handle Logout */
router.get('/signout', function(req, res) {
  req.logout();
  res.redirect('/');
});

/* GET Home Page */
router.get('/home', isAuthenticated, function(req, res){
  res.render('showAlerts', { user: req.user });
});

/* GET home page. */
router.get('/company', isAuthenticated, function(req, res) {
    req.db.users.find(function(err, users) {
        if(err) return;
        var data = JSON.stringify(users);
        res.render("index", {
            appData: data
        });
    });
});

/* GET Clientlist page. */
router.get('/clientlist', isAuthenticated, client.clientList);
/* GET New User page. */
router.get('/company/newuser', isAuthenticated, user.newUser);
/* POST to Add User Service */
router.post('/inviteuser', isAuthenticated, user.inviteUser);
/* GET New Client page. */
router.get('/company/newclient', isAuthenticated, client.newClient);

//router.get('/user/:id', user.userInfo);

module.exports = router;