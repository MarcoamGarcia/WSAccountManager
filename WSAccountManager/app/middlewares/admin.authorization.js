var mongoose = require('mongoose'),
  authorized = require('../lib/authorization/authorized');

// Check if user is authorized to check admin area.
// This method is inserted in the middleware in admin.js.
exports.can = function(req, res, next) {
    if(req.isAuthenticated()) {
        // check if user is authorized to perform the action in the admin area.
        var isAuthorized = authorized.authorized(req, 'view', 'admin', null);
        if(isAuthorized) {
            next();
        }
        else {
            if(req.xhr) {
                return res.json({ error: "Oops. Looks like you're not authorized to do this." }, 403);
            } else {
                return res.send('Not authorized', 403);
            }
        }
    } else {
        // redirect to home page if its not loggedIn.
        return res.redirect(res.locals.url_mount('/'), 301);
    }
}

