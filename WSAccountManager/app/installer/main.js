var async = require('async')
  , env = process.env.NODE_ENV || 'development'
  , _ = require("underscore")
  , assets = require('connect-assets')
  , config = require("../config/config.defaults.js")
  , crypto = require('crypto')
  , express = require('express')
  , fs = require('fs')
  , mongoose = require('mongoose')
  , path = require('path');
  
var app = express();

app.use(express.favicon());

var static_middleware = express.static(config.root + "/public");
app.use(static_middleware);

// cookieParser should be above session
app.use(express.cookieParser());

// bodyParser should be above methodOverride
app.use(express.bodyParser());
app.use(express.methodOverride());

//Work around to solve issue with assets functions not being defined
//https://github.com/adunkman/connect-assets/issues/221
app.use(assets({
  paths: [ "app/assets/stylesheets", "app/assets/javascripts" ],
    helperContext: app.locals,
    buildDir: config.buildDir,
    // dont set the serve path in the 'default_mount_url' to avoid 405 http errors with post requests.
    servePath: config.servePath
  })
);

app.use(function(req, res, next) {
    res.locals.mount = "";
    if(req.url.indexOf(config.default_mount_url) == 0) {
        res.locals.mount = config.default_mount_url;
    }
    res.locals.url_mount = function(url) { 
       return res.locals.mount + url;
    }
    next();
});   

// set views path, template engine and default layout
app.set('views', config.root + '/app/installer/views');
app.set('view engine', 'jade');

app.get('/', function(req, res) {
    if(req.query.success) {
      return res.render('thanks', {
        title:'Success!'
    });
    } else {
      res.render('index', {
          title:'Welcome',
          dev_config: config,
          installer_params: [],
          errors: []
      });
    }
    
});

app.post('/', function(req, res) {
  
    var host = req.body.host;
    
    var db_host = req.body.db_host;
    var db_port = req.body.db_port;
    var db_name = req.body.db_name;
    var db_user = req.body.db_user;
    var db_pass = req.body.db_pass;

    var email_user = req.body.email_user;
    var email_pass = req.body.email_pass;
    var email_service = req.body.email_service;
    var sender_email = req.body.sender_email;
    var analytics = false;
    
    // company info.
    var company_name = req.body.company_name;
    var user_email = req.body.user_email;
    var user_pass = req.body.user_pass;
    
    var installer_params = [];
    installer_params["db_host"] = db_host;
    installer_params["db_port"] = db_port;
    installer_params["db_name"] = db_name;
    installer_params["db_user"] = db_user;
    installer_params["db_pass"] = db_pass;
    installer_params["company_name"] = company_name;
    installer_params["user_email"] = user_email;
    installer_params["user_pass"] = user_pass;
    installer_params["email_user"] = email_user;
    installer_params["email_pass"] = email_pass;
    installer_params["email_service"] = email_service;
    installer_params["sender_email"] = sender_email;
    installer_params["analytics"] = analytics;
    
    if(typeof db_host == "undefined" || db_host == null || db_host == "") {
      db_host = config.mongo.db.host;
    }
    if(typeof db_port == "undefined" || db_port == null || db_port == "") {
      db_port = config.mongo.db.port;
    }
    
    var errors = {};
    if(typeof host == "undefined" || host == null || host == "") {
      errors["host"] = "Host cannot be empty";
    }
    if(typeof db_name == "undefined" || db_name == null || db_name == "") {
      errors["db_name"] = "DB Name cannot be empty";
    }
    if(typeof db_user == "undefined" || db_user == null || db_user == "") {
      errors["db_user"] = "DB User cannot be empty";
    }
    if(typeof db_pass == "undefined" || db_pass == null || db_pass == "") {
      errors["db_pass"] = "DB Pass cannot be empty";
    }
    if(typeof company_name == "undefined" || company_name == null || company_name == "") {
      errors["company_name"] = "Company Name cannot be empty";
    }
    if(typeof user_email == "undefined" || user_email == null || user_email == "") {
      errors["user_email"] = "User Email cannot be empty";
    }
    if(typeof db_pass == "undefined" || db_pass == null || db_pass == "") {
      errors["user_pass"] = "User Pass cannot be empty";
    }
    if(typeof email_user == "undefined" || email_user == null || email_user == "") {
      errors["email_user"] = "Email user cannot be empty";
    }
    if(typeof email_pass == "undefined" || email_pass == null || email_pass == "") {
      errors["email_pass"] = "Email Pass cannot be empty";
    }
    if(typeof email_service == "undefined" || email_service == null || email_service == "") {
      errors["email_service"] = "Email service cannot be empty";
    }
    if(typeof sender_email == "undefined" || sender_email == null || sender_email == "") {
      errors["sender_email"] = "Sender email cannot be empty";
    }
    
    if(_.size(errors) > 0) {
      return res.render('index', {
          title:'Welcome',
          dev_config: config,
          installer_params: installer_params,
          errors: errors
      });
    }
    
    var mongo_connect_string = 'mongodb://'
        + db_user + ':'
        + db_pass + '@'
        + db_host + ':'
        + db_port + '/'
        + db_name;
    console.log("mongo_connect_string: " + mongo_connect_string);
    var connected = false;
    
    mongoose.connection.on('error', function (err) {
        console.log('error connection to mongo server!');
        console.log(err);
        errors["db_pass"] = "Cannot connect to Mongo database";
        return res.render('index', {
            title:'Welcome',
            dev_config: config,
            installer_params: installer_params,
            errors: errors
        });
    });
    mongoose.connection.on('connected', function (ref) {
        connected = true;
        console.log('connected to mongo server.');
        
        var db = {
          host: db_host,
          username: db_user,
          password: db_pass,
          port: db_port,
          db: db_name
        };

        var transport = {
          service: email_service,
          auth: {
            user: email_user,
            pass: email_pass
          }
        };
        
        async.parallel([
            function(callback) {
              update_config(host, db, transport, sender_email, analytics, callback);
            },
            function(callback) {
              update_host_in_assets(host, callback);
            },
            function(callback) {
              update_db(company_name, user_email, user_pass, callback);
            }      
          ], function(err, results) {
            res.redirect(res.locals.url_mount("/?success=1"));
          }
        );
        
        
    });
    // connect to mongo db
    mongoose.connect(mongo_connect_string);
    
});

function update_db(company_name, user_email, user_pass, callback) {
  require("./update_db").init(company_name, user_email, user_pass, callback);
}
  
function update_config(host, db, transport, sender_email, analytics, callback) {
  config.mongo.db = db;
  config.host = host;
  config.transport = transport;
  config.sender_email = sender_email;
  config.analytics = analytics;
  crypto.randomBytes(8, function(ex, buf) {
      config.mongo.secret = buf.toString('hex');
      var global_config_to_save = {
        development: config,
        production: config
      }
      
      fs.writeFile(__dirname + "/../../config/config.json", JSON.stringify(global_config_to_save), function(err) {
          if(err) {
              console.log(err);
              callback(err);
          } else {
              console.log("The file was saved!");
              callback();
          }
      });
  });
}

function update_host_in_assets(host, callback) {
  var source_app_dir = __dirname + "/../assets/javascripts/app/";
  var files = fs.readdirSync(source_app_dir);
  files.forEach(function(file) {
    var file_full_path = source_app_dir + file;
    if(file.match(/^.*js$/) && !fs.lstatSync(file_full_path).isDirectory()) {
      var file_content = fs.readFileSync(file_full_path).toString();
      var http_regexp = new RegExp("widget.dev.host.port", "g");
      file_content = file_content.replace(http_regexp, host);
      var https_regexp = new RegExp("widget.dev.host.secure_port", "g");
      file_content = file_content.replace(https_regexp, host);
      var out = fs.writeFileSync(file_full_path, file_content);
    }
  });
  callback();
}

app.listen(config.port);