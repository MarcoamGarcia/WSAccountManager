var env = process.env.NODE_ENV || "development",
  _= require("lodash"),
  fs = require('fs'),
  default_config = require("./config.defaults.js");
  app_config_as_json =  fs.readFileSync(__dirname + "/../../config/config.json");
  
var app_config = JSON.parse(app_config_as_json)[env];

var merged_config = _.merge(default_config,app_config);
module.exports = merged_config;
