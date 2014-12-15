var env = process.env.NODE_ENV || 'development'
  , config = require('./config')

var tracer_logger = null;
if(env == 'development') {
    tracer_logger = require('tracer').colorConsole();
} else {
    tracer_logger = require('tracer').dailyfile({root:'./logs', level: config.log_level});
}
 
exports.logger = function() {
    return tracer_logger;
};