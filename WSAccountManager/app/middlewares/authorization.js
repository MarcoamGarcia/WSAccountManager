

var mongoose = require('mongoose'),
  authorized = require('../lib/authorization/authorized');

var Actor = mongoose.model('Actor');
var Role = mongoose.model('Role');
var Site = mongoose.model('Site');
var Company = mongoose.model('Company');
var HelpSet = mongoose.model('HelpSet');
    
/*
 *  Generic require login routing middleware
 */

exports.requiresLogin = function (req, res, next) {
  console.log("requiresLogin req.params = " + req.params);
  if (!req.isAuthenticated() && (req.site != null && req.session.widget_url != null && req.site.url == req.session.widget_url)) {
    req.session.returnTo = req.originalUrl
    return res.redirect(res.locals.url_mount('/login'));
  }
  next()
}

/*
 *  Company authorization routing middlewares
 */
exports.company = {
  // Check if user is authorized to edit company.
  // if block_access is true a non authorized error should be showed.
  // This method is inserted in the middleware in site.js, actor.js, helpset.js.
  can_edit: function (redirect_if_not_authorized) {
    return function(req, res, next) {
      if(req.isAuthenticated()) {
      var isAuthorized = authorized.authorized(req, 'update', 'company', req.company);
      if(isAuthorized) {
        req.can_edit_company = true;
        res.locals.can_edit_company = true;
        next();
      } else {
          if(redirect_if_not_authorized) {
            if(req.xhr) {
              return res.json({ errors: {general: "Oops. You're not authorized to do this." } }, 403);
            } else {
               // show 403 page.
               return res.send('Not authorized', 403);
            }
          }
          next();
      }
    } 
    else {
      if(req.xhr) {
        return res.json({ errors: {general: "Oops. You're not authorized to do this." } }, 403);
      } else {
        // show 403 page.
        return res.send('Not authorized', 403);
     }
    }
    }
  }
}

/*
 *  Site authorization routing middlewares
 */
exports.site = {
  // Check if user is authorized to edit company.
  // if block_access is true a non authorized error should be showed.
  // This method is inserted in the middleware in site.js, actor.js, helpset.js.
  can_edit: function (redirect_if_not_authorized) {
    return function(req, res, next) {
       req.can_edit_site = false;
       if(req.isAuthenticated()) {
          // check if the user can change site.
          var isAuthorized = authorized.authorized(req, 'update', 'site', req.site);
          if(isAuthorized) {
              req.can_edit_site = true;
              res.locals.can_edit_site = true;
              next();
          } else {
              if(typeof req.company != "undefined" && req.company != null) {
                  // check if user can change company.
                  isAuthorized = authorized.authorized(req, 'update', 'company', req.company);
                  if(isAuthorized) {
                      req.can_edit_site = true;
                      res.locals.can_edit_site = true;
                      next();
                  } else {
                      if(redirect_if_not_authorized) {
                          if(req.xhr) {
                              return res.json({ errors: {general: "Oops. You're not authorized to do this." } }, 403);
                          } else {
                              // show 403 page.
                              return res.send('Not authorized', 403);
                          }
                      }
                      next();
                  }
              } else {
                  if(redirect_if_not_authorized) {
                      if(req.xhr) {
                          return res.json({ errors: {general: "Oops. You're not authorized to do this." } }, 403);
                      } else {
                          // show 403 page.
                          return res.send('Not authorized', 403);
                      }
                  }
                  next();
              }
              
          }
      } 
      else {
          if(redirect_if_not_authorized) {
            if(req.xhr) {
                return res.json({ errors: {general: "Oops. You're not authorized to do this." } }, 403);
            } else {
                // show 403 page.
                return res.send('Not authorized', 403);
            }
          }
           next();
      }
    }
  }
}

/*
 *  Helpset authorization routing middlewares
 */
exports.helpset = {
  //Check if user is authorized to edit helpset.
  //if block_access is true a non authorized error should be showed.
  //This method is inserted in the middleware in helpset.js and api.js.
  can_edit: function (redirect_if_not_authorized) {
      return function(req, res, next) {
          authorized_in_site(req, res, next, redirect_if_not_authorized, req.helpset, "can_edit_helpset");
      }
  }
}
/*
 *  FAQ authorization routing middlewares
 */
exports.faq = {
  //Check if user is authorized to edit helpset.
  //if block_access is true a non authorized error should be showed.
  //This method is inserted in the middleware in faq.js and api.js.
  can_edit: function (redirect_if_not_authorized) {
      return function(req, res, next) {
          authorized_in_site(req, res, next, redirect_if_not_authorized, req.faq, "can_edit_faq");
      }
  }
}

/*
 *  Template  authorization routing middlewares
 */
exports.template = {
  can_edit: function (redirect_if_not_authorized) {
      return function(req, res, next) {
          var t = authorized_in_site(req, res, next, redirect_if_not_authorized, req.template, "can_edit_template");
          console.log("It's me Mario: " + t);
          return t;
      }
  }
}

/*
 *  Client  authorization routing middlewares
 */
exports.client = {
  can_edit: function (redirect_if_not_authorized) {
      return function(req, res, next) {
          var t = authorized_in_site(req, res, next, redirect_if_not_authorized, req.client, "can_edit_client");
          return t;
      }
  }
}

/*
 *  Actor authorization routing middlewares
 */
exports.actor = {
  //Check if user is authorized to edit account.
  //if block_access is true a non authorized error should be showed.
  //This method is inserted in the middleware in profile.js.
  can_edit: function(redirect_if_not_authorized) { 
    return function(req, res, next) { 
       var actor = req.actor;
       if(req.isAuthenticated()) {
           // check if the user can edit this account.
           var isAuthorized = authorized.authorized(req, 'update', 'profile', actor);
            res.locals.can_edit = isAuthorized;
           if(isAuthorized || !redirect_if_not_authorized) {
               res.can_edit = isAuthorized;
               next();
           }
           else {
               if(req.xhr) {
                   return res.json({ errors: {general: "Oops. You're not authorized to do this." } }, 403);
               } else {
                   // show 403 page.
                   return res.send('Not authorized', 403);
               }
           }
       }
       else {
           if(!redirect_if_not_authorized) {
               res.can_edit = false;
               next();
           } else {
               if(req.xhr) {
                   return res.json({ errors: {general: "Oops. You're not authorized to do this." } }, 403);
               } else {
                   // show 403 page.
                   return res.send('Not authorized', 403);
               }
           }
       }
   }
  }
}

function check_site_permissions(req, object, callback) {

  if(req.isAuthenticated) {
    // check if user has permissions to change this helpset.
    if(typeof object.permissions != "undefined" && object.permissions.indexOf(req.user.id) > -1) {
        return callback(null, true);
    }
    
    var actor_permissions = req.user.permissions;
    // check if the user can change site objects.
    var site_permission = Actor.two_attrs(actor_permissions, "type", Actor.PERMISSION_SITE, "obj_id", req.site.id);
    if(site_permission != null) {
      console.log("Site_permission: " + site_permission);
        return callback(null, true);
    } else {
        // if the site does not belong to any company or isn't an official object send an error.
        if(req.site.company_id == null || (typeof object.official != "undefined" && !object.official)) {
            console.log("Req.site.company_id: " + req.site.company_id);
            return callback(null, false);
        } 
        
        // check if the user can change all company site objects.
        var all_sites_permission = Actor.two_attrs(actor_permissions, "type", Actor.PERMISSION_ALL_COMPANY_SITES, "obj_id", req.site.company_id);
        if(all_sites_permission != null) {
            console.log("All sites permission: " + all_sites_permission);
            return callback(null, true);
        } else {
            // or if it is a company admin.
            var company_permission = Actor.two_attrs(actor_permissions, "type", Actor.PERMISSION_COMPANY_ADMIN, "obj_id", req.site.company_id);
            if(company_permission != null) {
                console.log("Company_permission: " + company_permission);
                return callback(null, true);
            }
        }
        return callback(null, false);
    }
  } else {
      return callback(null, false);
  }  
  
}


function authorized_in_site(req, res, next, redirect_if_not_authorized, obj, variable) {
    check_site_permissions(req, obj, function(err, can_edit) {
      if(err) {
            return next(new Error('Not authorized'));
          }
          req[variable] = can_edit;
          if(req[variable]) {
              next();
          } else {
              if(redirect_if_not_authorized) {
                  if(req.xhr) {
                      return res.json({ errors: {general: "Oops. You're not authorized to do this." } }, 403);
                  } else {
                      // show 403 page.
                      return res.send('Not authorized', 403);
                  }
              } else {
                  next();
              }
          }
    });

}

