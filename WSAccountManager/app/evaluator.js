var config = require('./config/config')
    , cube = require("cube");

var evaluator_options = {
  "mongo-host": config.mongo.db.host,
  "mongo-port": config.mongo.db.port,
  "mongo-database": config.mongo.db.db,
  "mongo-username": config.mongo.db.username,
  "mongo-password": config.mongo.db.password,
  "http-port": config.evaluator.http_port
};

var server = cube.server(evaluator_options);

server.register = function(db, endpoints) {
  cube.evaluator.register(db, endpoints);
};

server.start();

