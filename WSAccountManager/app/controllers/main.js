/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Step = require('step'),
    async = require('async'),
    _ = require("underscore"),
    utils = require('../lib/utils'),
    queue = require('../config/queue'),
    logger = require('../config/logger').logger(),
    actor_middleware = require('../middlewares/actor_middleware');

var Role = mongoose.model('Role');
var Actor = mongoose.model('Actor');
var Company = mongoose.model('Company');
var Site = mongoose.model('Site');

exports.index = function(req, res, next) {
    res.render('index', {
        title:'Welcome',
        userParams: [] 
    });
}

exports.login_success = function(req, res, next) {
    if(req.isAuthenticated()) {
        // check if the login was made from the widget.
        // http://stackoverflow.com/questions/7751379/how-do-you-test-req-flash-in-express
        var widget_login = req.flash('widget');
        if(widget_login !== undefined && widget_login != "") {
            return res.json({ success: true });
        }
    
        // change all sites users to admin users - PERMISSION_COMPANY; to use have site users - PERMISSION_COMPANY_ADMIN
        var company_permissions = Actor.attr(req.user.permissions, "type", Actor.PERMISSION_COMPANY);
        var all_company_permissions = Actor.attr(req.user.permissions,"type", Actor.PERMISSION_ALL_COMPANY_SITES);
        var site_permissions = Actor.attr(req.user.permissions,"type", Actor.PERMISSION_SITE);
        // if user belongs to a company show global information.
        // otherwise show account dashboard.
        if(company_permissions != null) {
            req.session.active_company_id = company_permissions.obj_id.toString();
            req.session.has_access_to_sites = false;
            res.redirect(res.locals.url_mount('/company/' + req.session.active_company_id + '/dashboard'));
        } else if(all_company_permissions != null || site_permissions != null) {
            req.session.active_company_id = null;
            req.session.has_access_to_sites = true;
            res.redirect(res.locals.url_mount('/profile/' + req.user.id + '/dashboard'));
        }else {
            req.session.active_company_id = null;
            req.session.has_access_to_sites = false;
            res.redirect(res.locals.url_mount('/profile/' + req.user.id + '/dashboard'));
        }
    }
    else {
        // check if the login was made from the widget.
        // http://stackoverflow.com/questions/7751379/how-do-you-test-req-flash-in-express
        var widget_login = req.flash('widget');
        if(widget_login !== undefined && widget_login != "") {
            res.json({ success: false }, 401);
        } else {
            res.render('index', {
                title:'Welcome'
            });
        }
    }
}

var login_post = function (req, res) {
  if (req.session.returnTo) {
    res.redirect(res.locals.url_mount(req.session.returnTo))
    delete req.session.returnTo
    return
  }
  res.redirect(res.locals.url_mount('/'));
}

exports.signin = signin;
function signin(req, res) {}

/**
 * Auth callback
 */
exports.authCallback = login_post;

/**
 * Show login form
 */

exports.login = login;
function login(req, res) {
    console.log("testing...");
    var message = req.flash().message;

    if (typeof message != "undefined") {
      message = message[0];
    };

    console.log("message: "+message);
  res.render('login', {
    title: 'Login',
    email: '',
    message: message,
    remote: false // remote is only used for the widget
  })
}

/**
 * Show sign up form
 */
exports.sessions = sessions;
function sessions(req, res) {
  res.render('users/sessions', {
    title: 'Sign up',
    user: new User()
  })
}

/**
 * Logout
 */
exports.logout = logout;
function logout(req, res) {
    req.logout();
    // check if the logout was made from the widget.
    if(req.query.remote) {
        res.header('Content-type','application/json');
        res.header('Charset','utf8');
        // callback is added so it is triggered in the client side with jQuery.
        return res.send(req.query.callback + '('+ JSON.stringify({ success: true }) + ');');
    }
    res.redirect(res.locals.url_mount('/login'));
}

/**
 * Session
 */

exports.session = login

/**
 * Create user
 */

exports.create = create;
function create(req, res) {
  var user = new User(req.body)
  user.provider = 'local'
  user.save(function (err) {
    if (err) {
      return res.render('users/sessions', {
        errors: utils.errors(err.errors),
        user: user,
        title: 'Sign up'
      })
    }

    // manually login the user once successfully signed up
    req.logIn(user, function(err) {
      if (err) return next(err)
      return res.redirect(res.locals.url_mount('/'));
    })
  })
}

/**
 * Find user by id
 */
exports.user = user;
function user(req, res, next, id) {
  console.log("user testing...");
  Actor
    .findOne({ _id : id })
    .exec(function (err, user) {
      if (err) return next(err)
      if (!actor) return next(new Error('Failed to load actor ' + id));
      req.user = user;
      next();
    })
}
