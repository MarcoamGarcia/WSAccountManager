  
/**
 * Module dependencies.
 */

var env = process.env.NODE_ENV || 'development'
    , config = require('./config')
    , express = require('express')
    , assets = require('connect-assets')
    , MongoStore = require('connect-mongo')(express)
    , flash = require('connect-flash')
    , helpers = require('view-helpers')
    , _ = require('underscore')
    , authorized = require('../lib/authorization/authorized')
    , pkg = require('../../package.json');

//CORS middleware
var allow_cross_domain = function(req, res, next) {
    // http://backbonetutorials.com/cross-domain-sessions/
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    // following stopped working. I think it is due to the credentials part but I'm not sure.
    //res.header('Access-Control-Allow-Origin', '*');
    //res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    //res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    // 'OPTIONS' doesn't seems to the called...
    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
};


function forward(pattern, host){
      return function(req, res, next) {
          //console.log("req.url: " + req.url);
          if(req.url.match(pattern)) {
              //console.log("Match!");
              var db_path = req.url.match(pattern)[1]
                  , db_url = [host, db_path].join('/');
              db_url = [host, req.url].join('');
              req.pipe(request[req.method.toLowerCase()](db_url)).pipe(res);
          } else {
              next();
          }
      }
  }



var fs = require("fs");
var request = require("request");

  
module.exports = function (app, passport) {

  app.set('showStackError', true);

  app.enable('trust proxy');

  if (fs.existsSync(__dirname + "/routes.saas.js")) {
     app.use(forward(/\/blog\/(.*)/i, 'http://wsam.info/'));
 }

  // should be placed before express.static
  app.use(express.compress({
    filter: function (req, res) {
      return /json|text|javascript|css/.test(res.getHeader('Content-Type'))
    },
    level: 9
  }))

  app.use(express.favicon());
  
  var static_middleware = express.static(config.root + "/public");
  app.use(config.default_mount_url, static_middleware);
  app.use(static_middleware);

  // don't use logger for test env
  if (process.env.NODE_ENV !== 'test') {
    app.use(express.logger('dev'))
  }

  // set views path, template engine and default layout
  app.set('views', config.root + '/app/views');
  app.set('view engine', 'jade');

  app.configure(function () {

    // add site_host to req and res objects.
    app.use(function (req, res, next) {
      req.site_host = req.protocol + "://" + config.host;
      if(config.port != 80) {
        req.site_host += ":" + config.port;
      }
      res.locals.site_host = req.site_host;
      res.locals.analytics = config.analytics;

      req.static_middleware = static_middleware;
      res.locals._ = _;
      next();
    });

    //Work around to solve issue with assets functions not being defined
    //https://github.com/adunkman/connect-assets/issues/221
    app.use(assets({
      paths: [ "app/assets/stylesheets", "app/assets/javascripts" ],
        build: true,
        helperContext: app.locals,
        buildDir: config.buildDir,
        // dont set the serve path in the 'default_mount_url' to avoid 405 http errors with post requests.
        servePath: config.servePath
      })
    );
    
    app.use(function(req, res, next) {
      req.js = app.locals.js;
      req.css = app.locals.css;
      next();
    });

    // cookieParser should be above session
    app.use(express.cookieParser());

    // bodyParser should be above methodOverride
    app.use(express.bodyParser());
    app.use(express.methodOverride());

    // set session expire to 4 hours (default value in connect).
    app.use(express.session({ secret: config.mongo.secret, store: new MongoStore(config.mongo.db), maxAge: 14400000}));
    
    // Cross domain must be set before 'app.router' mongooseAuth middleware and otherwise it does not work.
    app.use(allow_cross_domain);
        
    // use passport session
    app.use(passport.initialize());
    app.use(passport.session());

    // connect flash for flash messages - should be declared after sessions
    app.use(flash());

    // should be declared after session and flash
    app.use(helpers(pkg.name));

    // adds CSRF support
    if (process.env.NODE_ENV !== 'test') {
      app.use(express.csrf());
    }

    app.use(function(req, res, next) {
        
        res.locals.mount = "";
        if(req.url.indexOf(config.default_mount_url) == 0) {
            res.locals.mount = config.default_mount_url;
        }
        
        res.locals.url_mount = function(url) { 
           return res.locals.mount + url;
        }
      
        res.locals.csrf_token = req.csrfToken();
        res.locals.session = req.session;
        res.locals.isLoggedIn = req.isAuthenticated();
        res.locals.active_area = "";
        if(req.flash != null) {
            res.locals.info = req.flash("info");
            res.locals.warn = req.flash("warn");
            res.locals.error = req.flash("error");
        }
        if(typeof req.user !== undefined && req.user != null) {
            res.locals.user = req.user;
        }
        // check if the logged actor is authorized to see a specific action/scope/object.
        // Example: authorized('delete', 'activity', activity)
        res.locals.authorized = function(action, scope, object) { 
              return authorized.authorized(req, action, scope, object);
          }
      
      next();
    })

    // routes should be at the last
    app.use(app.router);
    
  })
 
}
