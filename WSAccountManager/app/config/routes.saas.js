/*!
 * Module dependencies.
 */
var path = require('path');

/**
 * Role permissions. 
 */
require('../lib/authorization/roles');

/**
 * Controllers
 */
var demo = require('../controllers/demo_app') // demo application
  , admin = require('../controllers/admin') // admin application
  , admin_actor = require('../controllers/admin.actor') // admin actor application
  , admin_company = require('../controllers/admin.company') // admin company application
  , admin_authorization = require('../middlewares/admin.authorization') // admin authorization
  , admin_register = require('../controllers/admin.register') // register routes
  , auth = require('../middlewares/authorization')
  , utils = require('../lib/utils');

/**
 * Route middlewares.
 */
var admin_auth = [auth.requiresLogin, admin_authorization.can];

/**
 * Expose routes
 */

module.exports = function (router) {

  // ****************** //
  //        Demo        //
  // ****************** //
  router.get("/demo", demo.index); 
  router.get("/demo/projects", demo.projects); 
  router.get("/demo/tasks", demo.tasks); 
  router.get("/demo/messages", demo.messages); 
  router.get("/demo/ajax", demo.ajax_call);
  
  // ************** //
  //      Admin     //
  // ************** //
  router.get("/admin", admin_auth, utils.set_active_area("admin"), admin.index);
  router.get("/admin/companies", admin_auth, utils.set_active_area("admin"), admin_company.companies);
  router.get('/admin/users/:page?', admin_auth, utils.set_active_area("admin"), admin_actor.index);
  router.post('/admin/user/', admin_auth, admin_actor.invite);
  router.put('/admin/user/:actor_id', admin_auth, admin_actor.update);
  router.delete('/admin/user/:actor_id', admin_auth, admin_actor.remove);
  
  // ***************** //
  //      Register     //
  // ***************** //
  router.post("/", utils.set_active_area("register"), admin_register.register); 
  router.get("/thank_you", utils.set_active_area("home"), admin_register.thank_you);  
  router.get("/terms", utils.set_active_area("home"), admin_register.show_terms);
  router.get("/privacy_policy", utils.set_active_area("home"), admin_register.show_privacy_policy);
    
}
