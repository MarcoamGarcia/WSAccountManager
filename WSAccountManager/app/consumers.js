var config = require('./config/config')
  , async = require('async')
  , crypto = require('crypto')
  , mongoose = require('mongoose')
  , http = require('http')
  , express = require('express')
  , fs = require('fs')
  , jade = require('jade')
  , logger = require('./config/logger').logger()
  , nodemailer = require('nodemailer'),
  queue = require('./config/queue')
  , path = require('path')
  , monq = require('monq')
  , Step = require('step')
  , sgTransport = require('nodemailer-sendgrid-transport')
  , _ = require("underscore");

var emailclient = nodemailer.createTransport(config.transport);

var mongo_connect_string = 'mongodb://'
    + config.mongo.db.username + ':'
    + config.mongo.db.password + '@'
    + config.mongo.db.host + ':'
    + config.mongo.db.port + '/'
    + config.mongo.db.db;
console.log("mongo_connect_string: " + mongo_connect_string);
mongoose.connect(mongo_connect_string);

// Bootstrap models
var models_path = __dirname + '/models'
fs.readdirSync(models_path).forEach(function (file) {
  if (~file.indexOf('.js')) require(models_path + '/' + file)
});

var Actor = mongoose.model('Actor');
var Role = mongoose.model('Role');
var Company = mongoose.model('Company');

var client = monq(mongo_connect_string);
// connect to mongo db
var worker = client.worker(['helppier']);

worker.register({
  // send e-mail using the defined template.
  send_mail: function (params, callback) {
    try {
      var email_subject = params.subject;
      var email_template = params.template;
      var actor_id = params.actor_id;
      var email_to = params.to;

      // user that started this (did a password reset, invited someone, etc).
      var user_id = null;
      if(params.user_id) {
          user_id = params.user_id;
      }
      var host = params.host;

      // check if messsage is present.
      var messsage = null;
      if(params.messsage) {
          messsage = params.messsage;
      }

      // check if values is present.
      var values = null;
      if(params.values) {
          values = params.values;
      }

      logger.log('---- data ----');
      logger.log('host = ' + host);
      logger.log('email_subject = ' + email_subject);
      logger.log('email_template = ' + email_template);
      logger.log('email_to = ' + email_to);
      logger.log('actor_id = ' + actor_id);
      logger.log('user_id = ' + user_id);
      logger.log('messsage = ' + messsage);
      logger.log('values = ' + values);

      var check_user = false;
      if(user_id != undefined && user_id != null) {
          check_user = true;
      }

      var actor = null;
      var user = null;

      Step(
        function find_user() {
            if(check_user) {
                Actor.findById(user_id, this);
            } else {
                return null;
            }
        }, 
        function find_actor(err, user_in_db) {
            if(err) {
                throw err; 
            } else if(check_user && user_in_db == null) {
                throw new Error("cannot find user with id " + user_id);
            } else {
                user = user_in_db;
                logger.log('found user ' + user_id + ' in db');
                Actor.findById(actor_id, this);
            }
        }, 
        function get_template(err, actor_in_db) {
            if(err) {
                throw err; 
            } else if(actor_in_db == null) {
               throw new Error("cannot find actor with id " + actor_id);
            } else {
                actor = actor_in_db;
                logger.log('found actor ' + actor_id + ' in db');
                
                var template_file = __dirname + '/views/mails/' +  email_template + '.jade';
                logger.log('opening template file: %s', template_file);
                fs.readFile(template_file, this);
                
            }
        },
        function send_mail(err, data) {
            if(err) {
                callback(err);
            } else {

                var jade_template = jade.compile(data.toString());

                var server = config.host;
                
                try{
                    logger.log('creating email template...');
                    logger.log('config: ' + JSON.stringify(config));
                    var html = jade_template({
                        actor: actor,
                        user: user,
                        values: values,
                        server: server,
                        url_mount: function(url) { 
                          return  config.default_mount_url + url;
                          }
                    });

                } catch(e) {
                    logger.debug('Caught Exception',e);
                    callback(e);
                    return;
                }
                
                logger.log('created template: %s', html);
                
                 // Message object
                 var message = {
                     from: config.sender_email,
                     to: email_to,
                     subject: email_subject,
                     html: html
                 };
                 
                 logger.log('sending e-mail to: %s', actor.email);

                 // Callback to be run after the sending is completed
                 var mail_callback = function(error, success){
                     if(error){
                         logger.debug('Error occured');
                         logger.debug(error.message);
                         callback(err);
                         return;
                     }
                     if(success){
                         logger.debug('Message sent successfully!');
                         logger.log('email successully sent!');
                         callback(null, true);
                     }else{
                         logger.debug('Message failed, reschedule!');
                         logger.log('email sent failed!');
                         callback(null, true);
                     }
                 };
                 // Catch uncaught errors
                 process.on('uncaughtException', function(e){
                     logger.debug('Uncaught Exception', e.stack);
                     callback(e);
                 });

                 // Send the e-mail
                 try{
                     logger.log('sending email...');

                    emailclient.sendMail(message, mail_callback);
                 } catch(e) {
                     logger.debug('Caught Exception',e);
                     callback(e);
                 }
             }
        }
      );
      
    } catch (err) {
        callback(err);
    }
  },
  // create company after the user registration.
  create_company_and_link_it_to_actor: function (params, callback) {
      try {
        logger.log('---- data ----');
        
        var actor_id = params.actor_id;
        var company_name = params.company_name;
        
        logger.log('actor_id = ' + actor_id);
        logger.log('company_name = ' + company_name);
        
        Company.findOne({'name': company_name}, function(err, company) {
            if (err) {
                logger.log("error: something went wrong when trying to find company with name " + company_name + ' in db.');
                logger.log("error: " + err.message);
                callback(err);
            } else if(company != null) {
                var err_msg = 'company ' + company.name + ' already exists in db.';
                logger.log('error: ' + err_msg);
                callback(new Error(err_msg));
            } else {
                Actor.findById(actor_id, function(err, actor) {
                    if (err) {
                        logger.log("error: something went wrong when trying to find actor with id " + id + ' in db.');
                        logger.log("error: " + err.message);
                        callback(err);
                    } else if(actor == null) {
                        var err_msg = "can't find user with id " + actor_id + ' in db.';
                        logger.log('error: ' + err_msg);
                        return callback(new Error(err_msg));
                    } else {
                        logger.log('found user ' + actor.email + ' in db.');
                    }
                    
                    var company = new Company();
                    company.name = company_name;
                    // create new api token.
                    var crypt = crypto.randomBytes(16).toString('hex');
                    company.key = crypt;
                    company.actor_id = actor.id;
                    company.save(function(err) {
                        if (err) {
                            logger.log("error: something went wrong when trying to save company " + company_name + ' in db.');
                            logger.log("error: " + err.message);
                            callback(err);
                        } else {
                            logger.log('saved company ' + company_name + ' in db.');
                            actor.company_id = company.id;
                            var permissions_to_add = [{type: 0, obj_id: company.id}, {type: 1, obj_id: company.id}];
                            actor.permissions = permissions_to_add;
                            actor.save(function(err) {
                                if (err) {
                                    logger.log("error: something went wrong when trying to save actor " + actor.email + ' in db.');
                                    logger.log("error: " + err.message);
                                    callback(err);
                                } else {
                                    logger.log('added company to actor ' + actor.email + ' in db.');
                                    // finish.
                                    callback(null, true);
                                }
                            });
                        }
                    });
                    
                });
            }
        });
        
    } catch (err) {
        logger.log("error: " + err.message);
        callback(err);
    }
  },
  //send e-mail using the defined template.
  send_admin_mail: function (params, callback) {
      try {
        var email_subject = params.subject;
        var email_template = params.template;
        // admin user that started this.
        var logged_user_id = params.user_id;
        var email_to = params.to;
        var actors_state = params.state;
        
        var host = params.host;
        
        // check if messsage is present.
        var messsage = null;
        if(params.actors_state) {
            messsage = params.messsage;
        }
        
        // check if values is present.
        var values = null;
        if(params.values) {
            values = job.data.values;
        }
        
        logger.log('---- data ----');
        logger.log('host = ' + host);
        logger.log('email_subject = ' + email_subject);
        logger.log('email_template = ' + email_template);
        logger.log('user_id = ' + logged_user_id);
        
        var template_file = __dirname + '/views/mails/' +  email_template + '.jade';
        logger.log('opening template file: %s', template_file);
        var data = fs.readFileSync(template_file);
        var jade_template = jade.compile(data.toString({
                url_mount: function(url) { 
                  return  config.default_mount_url + url;
                }
        }));
        
        Actor.find({type: Actor.USER, state: actors_state}, function(err, actors) {
            
            var actors_with_extra_params = [];
            actors.forEach(function (actor) {
                var actor_with_params = {};
                actor_with_params["actor"] = actor;
                actor_with_params["template"] = jade_template;
                actor_with_params["job"] = job;
                actor_with_params["logged_user_id"] = logged_user_id;
                actor_with_params["email_subject"] = email_subject;
                actors_with_extra_params.push(actor_with_params);
            });
            
            // this must be done in series to avoid sending emails at the same time.
            async.forEachSeries(actors_with_extra_params, invite_imported_users, function(err) {
                if(err) {
                    callback(e);
                } else {
                    callback(null, true);
                }
            });
        })
        
    } catch (err) {
        callback(err);
    }
  },
  // remove permission in all actors.
  remove_permission: function (params, callback) {
    try {
        var permission_id = params.permission_id;
        // admin user that started this.
        var logged_user_id = params.user_id;
        
        // find all actor that have the permission.
        Actor.find({permissions: permission_id}, function(err, actors) {
            if(error){
                logger.debug(error.message);
                callback(err);
                return;
            }
            // iterate actors and remove the permission (if it still exists).
            actors.forEach(function (actor) {
                var actor_permissions = actor.permissions;
                var permission_index = actor_permissions.indexOf(permission_id);
                if(permission_index > -1) {
                    actor.permissions.slice(permission_index, 1);
                }
            });
            
        });
    } catch (err) {
        callback(err);
    }
  }
});

worker.on('dequeued', function (data) {});
worker.on('failed', function (data) {});
worker.on('complete', function (data) {});
worker.on('error', function (err) {
        logger.log(err);        
});

worker.start();