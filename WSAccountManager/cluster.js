var env = process.env.NODE_ENV || 'default'
   , fs = require('fs')
   , path = require('path')
   , cluster = require('cluster');
   
var winston = require('winston');
var winston_filerotatedate = require('winston-filerotatedate');

// Use node cluster so we can benefit from multi-core systems 
// and to restart any children that throw an exception and log the error
// http://shapeshed.com/uncaught-exceptions-in-node/
var workers = 1;

// need to change process dir, otherwise it does not work if its launched with a windows service.
process.chdir(__dirname);

var logs_dir = path.join(__dirname, 'logs');
var log_file = 'ui.log';
if(!fs.existsSync(logs_dir)) {
    fs.mkdirSync(logs_dir);
}

if (cluster.isMaster) {
    winston.add(winston.transports.FileRotateDate, { filename: log_file, 'maxsize': 10000000, 'dirname': logs_dir, 'timestamp': true });
    cluster.setupMaster({ silent: true }); // Keep cluster from automatically grabbing stdin/out/err
    winston.info('start cluster with %s workers', workers);
    for (var i = 0; i < workers; ++i) {
        var worker = cluster.fork({file: "app/http.js"}).process;
        worker.stdout.on('data', function(chunk) {
            winston.info('worker ' + i + ': ' + chunk);
        });
        worker.stderr.on('data', function(chunk) {
            winston.error('worker ' + i + ': ' + chunk);
        });
        console.log('worker %s started.', worker.pid);
    }
    /*
    if (fs.existsSync(__dirname + "/config/config.json")) {
        var worker = cluster.fork({file: "app/evaluator.js"}).process;
        worker.stdout.on('data', function(chunk) {
            winston.info('worker ' + i + ': ' + chunk);
        });
        worker.stderr.on('data', function(chunk) {
            winston.error('worker ' + i + ': ' + chunk);
        });
        winston.info('worker %s started.', worker.pid);
        var worker = cluster.fork({file: "app/consumers.js"}).process;
        worker.stdout.on('data', function(chunk) {
            winston.info('worker ' + i + ': ' + chunk);
        });
        worker.stderr.on('data', function(chunk) {
            winston.error('worker ' + i + ': ' + chunk);
        });
        winston.info('worker %s started.', worker.pid);
    }*/
  
    cluster.on('exit', function(worker) {
      winston.error('worker %s died. restart...', worker.process.pid);
      cluster.fork();
    });
} else {
   winston.info('process.env.file %s started.', process.env.file);
   if(process.env.file) {
      var script = require('path').join(__dirname, process.env.file);
      require(script);
    }
}