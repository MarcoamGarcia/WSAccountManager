/**
 * Module dependencies.
 */
var logger = require('../config/logger').logger();
   
// admin homepage.
exports.index = function(req, res, next) { 
    var logged_user = req.user;
    res.locals("title", 'Admin');
    res.locals("logged_user", logged_user);
    res.render('admin/index');
}