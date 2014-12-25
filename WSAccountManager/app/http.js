var fs = require('fs');

var is_saas = false;
fs.readFile('./flavour.min.js', function (err, data) {
  if (data == "saas") {
    is_saas = true;
  };
}); 

if (is_saas) {
  require('newrelic');
};

var env = process.env.NODE_ENV || 'development'
  // need to add connect-assets in this file otherwise 'connect-assets'
  // throws the error: 'TypeError: Cannot set property 'asset_data_uri' of undefined'
  , assets = require('connect-assets')
  , mongoose = require('mongoose')
  , http = require('http')
  , express = require('express')
  , passport = require('passport');
   
var default_mount_url = '/wsam';

       
var assets_dir = __dirname + '../public/assets';  
//Clean AssetManager Folder
if(env == 'development'){
  if(fs.existsSync(assets_dir)){
    fs.chmodSync(assets_dir, '777');
    var files = fs.readdirSync(assets_dir + '/');
    files.forEach(function(file) {
          fs.chmodSync(assets_dir + '/' + file, '777');
          fs.unlinkSync(assets_dir + '/' + file);
      });
    fs.rmdir(assets_dir);
  }
}

// launch configurator.
if (!fs.existsSync(__dirname + "/../config/config.json")) {
  require("./installer/main");
} else {

  var config = require('./config/config');
     
  
  var mongo_connect_string = 'mongodb://'
      + config.mongo.db.username + ':'
      + config.mongo.db.password + '@'
      + config.mongo.db.host + ':'
      + config.mongo.db.port + '/'
      + config.mongo.db.db;
  console.log("mongo_connect_string: " + mongo_connect_string);
  // connect to mongo db
  mongoose.connect(mongo_connect_string);
  
  // init queue.
  var monq = require('monq');
  if(typeof client == "undefined" || client == null) {
    client = monq(mongo_connect_string);
  }
  
  // create models
  var models_path = __dirname + '/models';
  fs.readdirSync(models_path).forEach(function (file) {
    if (~file.indexOf('.js')) require(models_path + '/' + file);
  });
  
  // update base dir for widget.
  var utils = require('./lib/utils.js');
  utils.update_base_url(config.host, config.port, config.secure_port);
  
  // init passport
  require('./config/passport')(passport);
  
  // init express
  var app = express();
  require('./config/express')(app, passport);
  
  // set routes.
  require('./config/routes')(app, passport);
  
  // start app.
  var http_server = http.createServer(app);
  http_server.listen(config.app_port);
  console.log('App started on port '+ config.app_port);
  
  // expose app
  exports = module.exports = http_server

}
