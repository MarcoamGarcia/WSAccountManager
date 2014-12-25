var env = process.env.NODE_ENV || 'development'
  , config = require('./config')
  , monq = require('monq')
  , logger = require('./logger').logger()
  , fs = require('fs');


var mongo_connect_string = 'mongodb://'
    + config.mongo.db.username + ':'
    + config.mongo.db.password + '@'
    + config.mongo.db.host + ':'
    + config.mongo.db.port + '/'
    + config.mongo.db.db;
console.log("mongo_connect_string: " + mongo_connect_string);

// connect to mongo db
var connection = null;
var client = null;
var worker = null;

// connect queue to mongo.
connect();

function connect() {
    if (connection == null) {
         connection = monq(mongo_connect_string);
    }
    return connection;
};

exports.get_client = get_client;
function get_client() {
    connect();
    if (client == null) {
        client = connection.queue('wsam');
    }
    return client;
}

exports.get_worker = get_worker;
function get_worker() {
    connect();
    if (worker == null) {
        worker = connection.worker(['wsam']);
    }
    return worker;
}
