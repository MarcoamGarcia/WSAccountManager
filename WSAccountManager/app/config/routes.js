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
  , helpset = require('..//controllers/company.helpset')
  , actor = require('../controllers/company.actor') // company actors
  , profile = require('../controllers/profile')
  , api = require('../controllers/api') // api for widget
  , faq = require('../controllers/company.faq') // company faqs
  , client = require('../controllers/company.client') // company clients
  , client_details = require('../controllers/company.client.detail') // client details
  , auth = require('../middlewares/authorization')
  , credencials = require('../controllers/company.credencials') // client credencials
  , utils = require('../lib/utils');

var Actor = mongoose.model('Actor');

/**
 * Route middlewares.
 */
var company_auth = [auth.requiresLogin, auth.company.can_edit(true)];
var edit_site_auth = [auth.requiresLogin, auth.site.can_edit(true)];
var view_site_auth = [auth.site.can_edit(false)];
var helpset_auth = [auth.requiresLogin, auth.helpset.can_edit(true)];
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
    router.get("/", utils.set_active_area("home"), main.index);
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
/*
  //----------------------------//
  //       Script routes       //
  //--------------------------//
  //   company script    //
  router.get('/company/:c_id/script', company_auth, utils.set_active_area("script"), company.get_script);

  //--------------------------//
  //       Site routes       //
  //------------------------//
  //   company sites    //
  // don't know why but the following routes does not work if 'websites' is changed to 'sites'
  // maybe it is colliding with another root?
  router.get('/company/:c_id/websites/:page?', company_auth, utils.set_active_area("sites"), site.company_sites);
  router.post('/company/:c_id/site', company_auth, site.add_site);
  //   user sites   //
  router.get('/profile/:c_id/sites/:page?', company_auth, utils.set_active_area("sites"), site.profile_sites);
    
  router.put('/site/:site_id', edit_site_auth, site.update_site);
  router.delete('/site/:site_id', edit_site_auth, site.remove_site);
    
  router.param('site_id', site.load_with_company);
  
  // ***************** //
  //       Pages       //
  // ***************** //
  // company
  router.get('/company/:c_id/pages/:page?', company_auth, utils.set_active_area("pages"), page.show_company_pages);
  // site
  router.get('/site/:site_id/pages/:page?', edit_site_auth, utils.set_active_area("pages"), page.show_site_pages);
  // user
  router.get('/profile/:actor_id/pages/:page?', edit_site_auth, utils.set_active_area("pages"), page.profile_pages);
  // updates
  router.post('/company/:c_id/site/:site_id/pages/', edit_site_auth, page.add_page(false));
  router.put('/page/:page_id', edit_site_auth, page.update_page(false));
  router.delete('/page/:page_id', edit_site_auth, page.remove_page);
    
  router.param('page_id', page.load_with_site_and_company);
  
  // ***************** //
  //     Helpsets      //
  // ***************** //
  //   my helpsets
  router.get('/profile/:actor_id/helps/:page?', actor_auth, utils.set_active_area("helps"), helpset.show_my_helpsets);
  // company helpsets
  router.get('/company/:c_id/helps/:page?', company_auth, utils.set_active_area("helps"), helpset.show_company_helpsets);
  // site helpsets 
  router.get('/site/:site_id/helps/:page?', edit_site_auth, utils.set_active_area("helps"), helpset.show_site_helpsets);
  // page helpsets
  router.get('/page/:page_id/helps/:page?', edit_site_auth, utils.set_active_area("helps"), helpset.show_page_helpsets);
  // helpset stats
  router.get('/helpsets/:helpset_id/stats/:type?', helpset_auth, utils.set_active_area("helps"), helpset.show_helpset_stats);
  // helpsets updates
  router.put('/helpsets/:helpset_id', helpset_auth, helpset.change_helpset);
  router.delete('/helpsets/:helpset_id', helpset_auth, helpset.remove_helpset);
  router.put("/helpsets/:helpset_id/flag", helpset_auth, helpset.flag_helpset);
  router.put("/helpsets/:helpset_id/unflag", helpset_auth, helpset.unflag_helpset);
    
  router.param('helpset_id', helpset.load_with_site_company_and_page);
  */
  
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
  
  // ****************** //
  //         API        //
  // ****************** //
/*
  router.get("/api/files/:file", function(req, res, next) {
    
    if(path.extname(req.params.file) == '.js') {
      req.url = req.url.replace(/^\/api\/files/, '/javascripts')
    } else if(path.extname(req.params.file) == '.css') {
      req.url = req.url.replace(/^\/api\/files/, '/stylesheets')
    }
    console.log('about to send restricted file '+ req.params.file);
    
    console.log("get------------------------------start: " + req.url);
    req.static_middleware(req, res, next);
    
  });
    
  //get static file start file from asset manager.
  router.get('/api/files/start', api.start);

  // get api for site with server side code.
  //router.get('/api/site/:site_key/:page_key', api.create_page_if_needed, api.create_css_file('widget'), api.site_api_home);
  // get api for site with server side code (without page key).
  router.get('/api/site/:site_key', page.load_using_query_url, api.create_page_if_needed,  api.create_css_file('widget'),api.site_api_home);
  // get api for site with server side code (without page key).
  router.get('/api/:company_key', site.load_using_company_and_query_url, api.create_site_if_needed, page.load_using_query_url, api.create_page_if_needed, api.create_css_file('widget'),api.site_api_home);
  // get api for site without server side code.
  router.get('/api', site.load_using_query_url, api.create_site_if_needed, page.load_using_query_url, api.create_page_if_needed, api.create_css_file('widget'), api.site_api_home);
  router.get('/widget/:site_id/:page_id?', api.get_permissions, view_site_auth, api.site_helpsets_api);
  router.get('/widget/:site_id/:page_id/more/:page?', view_site_auth, api.get_more_helpsets);
  router.get("/widget/:site_id/:page_id/perm", api.get_permissions, api.send_permissions);
  router.get("/external", api.external_register_and_login);
  // Site Helpsets //
  router.post('/widget/:site_id/:page_id/helpsets/add', edit_site_auth, api.add_helpset);
  router.put('/widget/:site_id/:page_id/helpsets/:helpset_id', helpset_auth, api.update_helpset);
  // score helpset (does not need to be loggedin).
  router.post('/widget/:site_id/:page_id/helpsets/:helpset_id/score', api.score_help_and_helpset);
  // increment view stat helpset (does not need to be loggedin).
  router.get('/widget/:site_id/:page_id/helpsets/:helpset_id/:help_index/view/:first?', api.view_state_help_and_helpset);
  // flag helpset (needs to be loggedin or add an email).
  router.post('/widget/:site_id/:page_id/helpsets/:helpset_id/flag', api.flag_helpset);
  router.delete('/widget/:site_id/:page_id/helpsets/:helpset_id', helpset_auth, helpset.remove_helpset);
  // Site Pages //
  router.get('/widget/:site_id/:page_id?/pages', edit_site_auth, api.site_pages_api);
  router.post('/widget/:site_id/pages/order', edit_site_auth, api.set_page_order);
  router.post('/widget/:site_id/pages/add', edit_site_auth, page.add_page(true));
  router.put('/widget/:site_id/pages/:page_id', edit_site_auth, page.update_page(true));
  router.delete('/widget/:site_id/pages/:page_id', edit_site_auth, page.remove_page);

  router.param('company_key', company.load_using_key);
  router.param('site_key', site.load_using_key);
  router.param('page_key', page.load_using_key);
    
  // **************** //
  // FAQs Updates //
  // **************** //
  router.get("/company/:c_id/faqs/new", company_auth, utils.set_active_area("faqs"), faq.show_add); 
  router.post('/company/:c_id/faqs', company_auth, site.find_from_params, faq.add);
  router.get("/company/:c_id/faq/:faq_id", faq_auth, utils.set_active_area("faqs"), faq.edit); 
  router.get("/company/:c_id/faq/:faq_id/preview", faq_auth, utils.set_active_area("faqs"), faq.preview); 
  router.get("/faq/:faq_id", faq.show); // show faq - no need to have authorization.
  router.put('/company/:c_id/faq/:faq_id', faq_auth, faq.update);
  router.delete('/company/:c_id/faq/:faq_id', faq_auth, faq.remove);
  // Company FAQs  //
  router.get('/company/:c_id/faqs/:page?', company_auth, utils.set_active_area("faqs"), faq.show_company_faqs);
  // Site FAQs  //
  router.get('/site/:site_id/faqs/:page?', edit_site_auth, utils.set_active_area("faqs"), faq.show_site_faqs);
  router.param('faq_id', faq.load_with_site_and_company);
*/
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
   //  Client Credencials  //
  // ******************** //
  // show client credencials
  router.get('/company/:c_id/client/:client_id/credencials', company_auth, utils.set_active_area("clients"), credencials.show);
  // add new client credencials
  router.post('/company/:c_id/client/:client_id/credencials', edit_site_auth, credencials.add);

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
