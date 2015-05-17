/*!
 * Module dependencies.
 */
var config = require('./config'),
    express = require('express'),
    fs = require('fs'),
    mongoose = require('mongoose'),
    path = require('path');

/**
 * Role permissions. 
 */
require('../lib/authorization/roles');

/**
 * Controllers
 */
var main = require('../controllers/main')
  , company = require('../controllers/company')
  , site = require('../controllers/company.site') // company sites
  , page = require('../controllers/company.page') // company or site pages
  , actor = require('../controllers/company.actor') // company actors
  , profile = require('../controllers/profile')
  , api = require('../controllers/api') // api for widget
  , faq = require('../controllers/company.faq') // company faqs
  , client = require('../controllers/company.client') // company clients
  , client_details = require('../controllers/company.client.detail') // client details
  , auth = require('../middlewares/authorization')
  , credentials = require('../controllers/company.credentials') // client credentials
  , utils = require('../lib/utils');

var Actor = mongoose.model('Actor');

/**
 * Route middlewares.
 */
var company_auth = [auth.requiresLogin, auth.company.can_edit(true)];
var edit_site_auth = [auth.requiresLogin, auth.site.can_edit(true)];
var view_site_auth = [auth.site.can_edit(false)];
var actor_auth = [auth.requiresLogin, auth.actor.can_edit(true)];
var faq_auth = [auth.requiresLogin, auth.faq.can_edit(true)];
var template_auth = [auth.requiresLogin, auth.template.can_edit(true)];
var client_auth = [auth.requiresLogin];

var router = new express.Router();

/**
 * Expose routes
 */
module.exports = function (app, passport) {

    // main routes.
    router.get("/", utils.set_active_area("login"), main.login);
    router.get("/login_success", utils.set_active_area("login"), main.login_success);  
    
    router.get('/login', utils.set_active_area("login"), main.login);
    router.get('/sessions', main.sessions);
    router.get('/logout', main.logout);
    router.post('/sessions', main.create);
    
    router.post('/sessions/session', function(req, res, next) {
            // check if the login was made from the widget.
            if(typeof req.body.remote !== "undefined") {
              req.flash('widget', true);
            } 
            next();
        }, function(req, res, next) {
            // http://stackoverflow.com/questions/22858699/nodejs-and-passportjs-redirect-middleware-after-passport-authenticate-not-being
            passport.authenticate('local', function(err, user, info) {
                if (err) { return next(err); }
                // Redirect if it fails
                if (!user) { 
                  if (req.body.remote == "true") {
                    return res.json({ success: false });

                  } else if (typeof info.message != "undefined" || info.message != null ) {
                    req.flash('message', info.message);
                  };
                  return res.redirect(res.locals.url_mount('/login')); 

                }

                //if user came from widget check permissions
                if (req.body.remote == "true") {
                   var have_permission = Actor.attr(user.permissions, "obj_id", req.body.company_id);
                   if (have_permission == null) {
                      req.logout();
                      return res.json({ permissions: false });
                   }
                }

                req.logIn(user, function(err) {
                  if (err) { return next(err); }
                  req.session.widget_url = req.body.widget_url;
                  // Redirect if it succeeds
                  return res.redirect(res.locals.url_mount('/login_success'));
                });

            })(req, res, next);
        }
    );
    
    /*router.get('/auth/facebook',
      passport.authenticate('facebook', {
        scope: [ 'email', 'user_about_me'],
        failureRedirect: '/login'
      }), main.signin);
    router.get('/auth/facebook/callback',
      passport.authenticate('facebook', {
        failureRedirect: '/login'
      }), main.authCallback);*/
    router.get('/auth/github',
      passport.authenticate('github', {
        failureRedirect: '/login'
      }), main.signin)
    router.get('/auth/github/callback',
      passport.authenticate('github', {
        failureRedirect: '/login'
      }), main.authCallback);
    /*router.get('/auth/twitter',
      passport.authenticate('twitter', {
        failureRedirect: '/login'
      }), main.signin);
    router.get('/auth/twitter/callback',
      passport.authenticate('twitter', {
        failureRedirect: '/login'
      }), main.authCallback);*/
    router.get('/auth/google',
      passport.authenticate('google', {
        failureRedirect: '/login',
        scope: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email'
        ]
      }), main.signin);
    router.get('/auth/google/callback',
      passport.authenticate('google', {
        failureRedirect: '/login'
      }), main.authCallback);
  
    router.param('userId', main.user);
    
  //*************************//
  //     Company routes      //
  //*************************//
  // show company dashboard.
  router.get("/company/:c_id/dashboard", company_auth, utils.set_active_area("company"), company.new_dashboard); 
  // show company information.
  router.get("/company/:c_id", company_auth, utils.set_active_area("company"), company.edit_company_info); 
  // update company information.
  router.put("/company/:c_id", company_auth, utils.set_active_area("company"), company.update_company_info); 
  
  router.param('c_id', company.load);
  
  //*************************//
  //     Company actors      //
  //*************************//
  router.get('/company/:c_id/users/:page?', company_auth, utils.set_active_area("actors"), actor.index);
  router.post('/company/:c_id/user', company_auth, actor.invite);
  router.put('/company/:c_id/user/:actor_id', company_auth, actor.update);
  router.delete('/company/:c_id/user/:actor_id', company_auth, actor.remove);
  
  router.param('actor_id', actor.load);
  
  // ****************** //
  //       Profile      //
  // ****************** //
  // show profile info.
  router.get("/profile/:actor_id", actor_auth, profile.show); 
  
  // show my profile dashboard.
  router.get("/profile/", actor_auth, utils.set_active_area("home"), profile.show_active_profile_dashboard); 
  
  // flag this profile.
  router.post('/profile/:actor_id/flag', actor_auth, profile.flag_profile);
  
  // deactivate this profile.
  router.put('/profile/:actor_id/deactivate', actor_auth, profile.deactivate_profile);
  
  // show profile dashboard.
  router.get("/profile/:actor_id/dashboard", actor_auth, utils.set_active_area("home"), profile.show_profile_dashboard); 
  
  router.get('/profile/:actor_id/main', actor_auth, profile.main_info);
  router.put('/profile/:actor_id/main', actor_auth, profile.update_main_info);
  
  // manage contacts.
  router.get('/profile/:actor_id/contacts', actor_auth, profile.contacts);
  router.post('/profile/:actor_id/contacts/add', actor_auth, profile.add_contact);
  router.put('/profile/:actor_id/contacts/:contact_id', actor_auth, profile.update_contact);
  router.delete('/profile/:actor_id/contacts/:contact_id', actor_auth, profile.remove_contact);
  // change primary e-mail area: An e-mail is sent to the user new e-mail address so he/she can validate it.
  router.get("/confirm/:token_id", profile.change_main_contact); 
  //   Pass Area 
  router.get("/profile/:actor_id/password", actor_auth, profile.show_change_profile_password); 
  router.post("/profile/:actor_id/password", actor_auth, profile.change_profile_password); 
  
  router.get("/forgot_pass", profile.show_forgot_password); 
  router.post("/forgot_pass", profile.forgot_password); 
  router.get("/reset_pass/:token_id", profile.show_reset_password); 
  router.post("/reset_pass/:token_id", profile.reset_password); 
  router.get("/invitation/:token_id", profile.show_invitation); 
  router.post("/invitation/:token_id", profile.complete_invitation);
  
  router.param('token_id', profile.load_from_token);
  
    // ******************** //
   //    Company Clients   //
  // ******************** //
  // load client
  router.param('client_id', client.load);
  // show more info
  router.get('/company/:c_id/clients/more_info/:page?', company_auth, utils.set_active_area("clients"), client.show_more_info);
  // show clients
  router.get('/company/:c_id/clients/:page?', company_auth, utils.set_active_area("clients"), client.show);
  // add new client
  router.post('/company/:c_id/clients', edit_site_auth, client.add, client_details.add);
  // remove client
  router.delete('/company/:c_id/client/:client_id', client_auth, client.remove);
  // update client
  router.put('/company/:c_id/client/:client_id', client_auth, client.update);
  // show more info
  router.get('/company/:c_id/client/:client_id/more_info/:page?', company_auth, utils.set_active_area("clients"), client.show_more_info);

    // ******************** //
   //    Client Details    //
  // ******************** //
  // show client details
  router.get('/company/:c_id/client/:client_id/details', company_auth, utils.set_active_area("clients"), client_details.show_details);
  // add new client detail
  router.post('/company/:c_id/client/:client_id/details', edit_site_auth, client_details.add);
  // remove client detail
  router.delete('/company/:c_id/client/:client_id/details/:details_id', client_auth, client_details.remove);
  // update client detail
  router.put('/company/:c_id/client/:client_id/details/:details_id', client_auth, client_details.update);

    // ******************** //
   //  Client Credentials  //
  // ******************** //
  // show client credentials
  router.get('/company/:c_id/client/:client_id/credentials', company_auth, utils.set_active_area("clients"), credentials.show);
  // add new client credentials
  router.post('/company/:c_id/client/:client_id/credentials', edit_site_auth, credentials.add);
  // update client credentianls
  router.put('/company/:c_id/client/:client_id/credential/:credentials_id', client_auth, credentials.update);
  // remove client credentials
  router.delete('/company/:c_id/client/:client_id/credential/:credentials_id', client_auth, credentials.remove);

    // ******************** //
   //  Header Credentials  //
  // ******************** //
  // show client credentials
  router.get('/company/:c_id/credentials', company_auth, utils.set_active_area("clients"), credentials.show_header);

  if (fs.existsSync(__dirname + "/routes.saas.js")) {
        // set routes.
        require('./routes.saas.js')(router);
  }
  
  app.use(config.default_mount_url, router.middleware);
  app.use(router.middleware);
  
  // assume "not found" in the error msgs
  // is a 404. this is somewhat silly, but
  // valid, you can do whatever you like, set
  // properties, use instanceof etc.
  app.use(function(err, req, res, next) {
    // treat as 404
    if (err.message
      && (~err.message.indexOf('not found')
      || (~err.message.indexOf('Cast to ObjectId failed')))) {
      return next();
    }

    // log it
    // send emails if you want
    console.error(err.stack);

    // error page
    res.status(500).render('500', { error: err.stack });
    
  })

  // assume 404 since no middleware responded
  app.use(function(req, res, next) {
    res.status(404).render('404', {
      url: req.originalUrl,
      error: 'Not found'
    })
  });
  
  // uncomment following lines to see all get routes.
  // console.log();
  // router.map.get.forEach(function(route){
  //   console.log('  \033[90m%s \033[36m%s\033[0m', route.method.toUpperCase(), route.path);
  // });
  // console.log();
  
}
