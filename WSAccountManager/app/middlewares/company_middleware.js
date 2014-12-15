/**
 * Module dependencies.
 */ 
var mongoose = require('mongoose'),
    Step = require('step'),
    async = require('async'),
    // library to generate actor_id.
    crypto = require('crypto'),
    fs = require('fs'),
    logger = require('../config/logger').logger(),
    utils = require('../lib/utils'),
    _ = require("underscore");
    
var Company = mongoose.model('Company');

// save company in db.
exports.save = save;
function save(company, callback) {
    company.save(function (err, company) {
        if(err) {
            callback(err);
        } else {
            callback(null, company);
        }
    });
}

// remove company from db.
exports.remove = remove;
function remove(company, callback) {
    var company_id = _.clone(company.id);
    company.remove(function (err) {
        if(err) {
            callback(err);
        } else {
            logger.debug("company_id: " + company_id);
            callback();
        }
    });
}


exports.state_str = state_str;
function state_str(state) {
     // if(x == undefined) is testing the value
    // if (typeof x = undefined) is testing the existence of x
    // http://bytes.com/topic/javascript/answers/594279-typeof-x-undefined-x-undefined
    if(state == undefined) {
        return "";
    }
    
    if(state.toString() == Company.ACTIVE.toString()) {
        return "Active";
    }
    else if(state.toString() == Company.DEACTIVATED.toString()) {
        return "Deactivated";
    } else {
        return ""
    }
}