var config = require('./config/config')
    , cube = require("cube");

var collector_options = {
  "mongo-host": config.mongo.db.host,
  "mongo-port": config.mongo.db.port,
  "mongo-database": config.mongo.db.db,
  "mongo-username": config.mongo.db.username,
  "mongo-password": config.mongo.db.password,
  "http-port": config.collector.http_port,
  "udp-port": config.collector.udp_port
};

console.log(JSON.stringify(collector_options));

var server = cube.server(collector_options);

server.register = function(db, endpoints) {
  cube.collector.register(db, endpoints);
};

server.start();
