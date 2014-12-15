/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Step = require('step'),
    async = require('async'),
    _ = require("underscore"),
    utils = require('../lib/utils'),
    queue = require('../config/queue'),
    logger = require('../config/logger').logger(),
    actor_middleware = require('../middlewares/actor_middleware');

var Role = mongoose.model('Role');
var Actor = mongoose.model('Actor');
var Company = mongoose.model('Company');

exports.thank_you = function(req, res) {

    var user = req.flash('user');
    res.render('register/register_thank_you', {
        user: user[0],
        register_date: actor_middleware.timestamp(user[0].register_date),
        title:'Thanks'
    });
}

exports.show_terms = function(req, res) {
    res.render('register/terms', {
        layout: false
    });
}

exports.show_privacy_policy = function(req, res) {
    res.render('register/privacy_policy', {
        layout: false
    });
}

exports.register = function(req, res) {
    
    var actor_name = req.body.name;
    var actor_email = req.body.email;
    var company_name = req.body.company;
    var actor_password = req.body.password;
    var actor_password_conf = req.body.passwordconf;
    var accept_terms = req.body.accept_terms;
    
    var userParams = [];
    userParams["name"] = actor_name;
    userParams["email"] = actor_email;
    userParams["company"] = company_name;
    
    var errors = {};
    if(actor_name == null || actor_name == "") {
        logger.error("name cannot be empty");
        errors["name"] = 'name cannot be empty';
    }
    
    if(actor_password == null || actor_password == "") {
        logger.error("password cannot be empty");
        errors["password"] = 'password cannot be empty';
    } 
    else if(actor_password != actor_password_conf) {
        logger.error("password must be the same in the two text boxes");
        errors["passwordconf"] = "password must be the same in the two text boxes";
    }
    
    if(!accept_terms) {
        logger.error("user must accept terms");
        errors["accept_terms"] = 'You must read and accept the terms';
    }
    
    var email_filter = utils.email_filter();
    if(actor_email == null || actor_email == "") {
        logger.error("email cannot be empty");
        errors["email"] = 'email cannot be empty';
    } else if(!email_filter.test(actor_email)) {
        logger.error("invalid e-mail " + actor_email);
        errors["email"] = 'email is not valid';
    } 
    
    // company_name is mandatory.
    if(company_name == null || company_name == "") {
        logger.error("company name cannot be empty");
        errors["company"] = 'company name cannot be empty';
    }
    
    if(_.size(errors) > 0) {
        res.render('index', {
            title:'Welcome',
            errors: errors,
            userParams: userParams
        });
        return;
    }
    
    Company.findOne({'name': company_name}, function(err, company) {
        if (err) {
            errors["general"] = 'Oops. Something went wrong. Please try again.';
            res.render('index', {
                title:'Welcome',
                errors: errors,
                userParams: userParams
            });
        } else if(company != null) {
            errors["company"] = "Oops. Can't register because someone already claimed this company name.";
            res.render('index', {
                title:'Welcome',
                errors: errors,
                userParams: userParams
            });
        } else {
            Actor.findOne({'email': actor_email}, function(err, actor) {
                if (err) {
                    errors["general"] = 'Oops. Something went wrong. Please try again.';
                    res.render('index', {
                        title:'Welcome',
                        errors: errors,
                        userParams: userParams
                    });
                } else if(actor != null) {
                    errors["email"] = "Oops. Can't register because someone already claimed this email.";
                    res.render('index', {
                        title:'Welcome',
                        errors: errors,
                        userParams: userParams
                    });
                } else {
                    register_user(req, res, company_name, actor_name, actor_email, actor_password, accept_terms);
                }
            });
        }
    });
    
}

function register_user(req, res, company_name, actor_name, actor_email, actor_password, accept_terms) {
    
    var company;
    var actor;
    Step(  
            function find_normal_user_role() {
                Role.findOne({rtype: Role.NORMAL}, this);
            },
            function save_actor(err, normal_user_role) {
                if (err) {
                    throw err;
                } 
                // if we can't find its role 
                // throw an error.
                else if (normal_user_role == null) {
                    logger.debug("Register: can't find normal user role.");
                    throw new Error("Oops. Something wrong happened. Please try later.");
                }
                else {
                    
                    // create actor.
                    actor = new Actor();
                    
                    // set actor name.
                    actor.name = actor_name;
                    // set actor name.
                    actor.name = actor_name;
                    // set actor email.
                    actor.email = actor_email;
                    // set actor pass.
                    actor.password = actor_password;
                    // set actor state as registered and waiting for approval.
                    actor.state = Actor.REGISTERED;
                    // set terms flag.
                    actor.read_and_accepted_terms = accept_terms;
                    // set register provider for passport.js
                    actor.provider = 'local';
                    // set actor role.
                    actor.roles.push({role_id: normal_user_role._id});

                    var reg_date = new Date().toISOString();
                    //set the register date and first register date
                    actor.register_date = reg_date;
                    actor.first_register_date = reg_date;
                    
                    actor_middleware.save_actor(actor, this);
                    
                }
            },
            function send(err) { 
                if (err) {
                    logger.debug("err: " + err.message);
                    return next(err);
                } else {
                    
                    // add to company the actor information.
                    // create job to do this so if it fails it can be re-tried.
                   var client = queue.get_client();
                    client.enqueue('create_company_and_link_it_to_actor', {
                        title: 'create company ' + company_name + ' and link it to ' + actor.email,
                        company_name: company_name,
                        actor_id: actor.id,
                        host: req.headers.host
                    }, function (err, job) {
                        if (err) {
                            logger.error(err);
                        }
                        logger.debug('enqueued:', job.data);
                    });
                    
                    // send instructions by email.
                    // create job to send e-mail.
                    var client = queue.get_client();
                    client.enqueue('send_mail', {
                        title: 'registered: ' + actor.email,
                        to: actor.email,
                        actor_id: actor.id,
                        host: req.headers.host,
                        // e-mail subject
                        subject: 'Thanks for registering at Helppier!',
                        // template used to send e-mail
                        template: 'thanks_for_registering_user'
                   }, function (err, job) {
                        if (err) {
                            logger.error(err);
                        }
                        logger.debug('enqueued:', job.data);
                    });
                    logger.debug("An registration was sent to the user " + actor.name + " by e-mail.");

                    req.flash('user', actor);

                    //res.send({ message: "success" });
                    res.redirect(res.locals.url_mount('/thank_you'));
                }
            }     
        );
    
}