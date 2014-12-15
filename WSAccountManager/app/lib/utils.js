// ***************** //
//  General helpers  //
// ***************** //

var mongoose = require('mongoose'),
    async = require('async'),
    _ = require("underscore"),
    authorized = require('./authorization/authorized'),
    logger = require('../config/logger').logger(),
    fs = require('fs');
    
/**
 * Formats mongoose errors into proper array
 *
 * @param {Array} errors
 * @return {Array}
 * @api public
 */

exports.errors = function (errors) {
  var keys = Object.keys(errors)
  var errs = []

  // if there is no validation error, just display a generic error
  if (!keys) {
    console.log(errors);
    return ['Oops! There was an error']
  }

  keys.forEach(function (key) {
    errs.push(errors[key].type)
  })

  return errs
}

var Actor = mongoose.model('Actor');
var Role = mongoose.model('Role');
var Company = mongoose.model('Company');
var Site = mongoose.model('Site');
var Page = mongoose.model('Page');
var HelpSet = mongoose.model('HelpSet');
var FAQ = mongoose.model('FAQ');

// Flag state:
FLAG_REJECTED = 0;
FLAG_CONFIRMED = 1;
// Flag types.
FLAG_CONTAINS_OFFENSIVE = 0;
FLAG_OUTDATED = 1;
FLAG_WRONG_INFO = 2;

// Items per page (used in all site paginated pages).
var limit = 20;
exports.paginate_limit = function() {
    return limit;
}

//Items per page (used in all widget paginated pages).
var limit = 10;
exports.small_paginate_limit = function() {
    return limit;
}

// Max number of elements to get from mongo database.
var max_query_limit = 500;
exports.max_query_limit = function() {
    return max_query_limit;
}

// Clone object.
// http://stackoverflow.com/questions/5055746/cloning-an-object-in-node-js
// http://onemoredigit.com/post/1527191998/extending-objects-in-node-js
// TODO: Not working at this time for arrays. Need to solve this issue.
// TODO: Replace with underscore 'clone'? http://documentcloud.github.com/underscore
Object.defineProperty(Object.prototype, "extend", {
 enumerable: false,
 value: function(from) {
     var props = Object.getOwnPropertyNames(from);
     var dest = this;
     props.forEach(function(name) {
         if (name in dest) {
             var destination = Object.getOwnPropertyDescriptor(from, name);
             Object.defineProperty(dest, name, destination);
         }
     });
     return this;
 }
});

// TODO: Replace with underscore 'uniq'. http://documentcloud.github.com/underscore/#uniq
// Remove duplicates in array.
// http://dreaminginjavascript.wordpress.com/2008/08/22/eliminating-duplicates/
// Note:
// Code in http://stackoverflow.com/questions/840781/easiest-way-to-find-duplicate-values-in-a-javascript-array
// works with integers but does not work with ObjectsIds 
Array.prototype.unique = function () {
    var i,
    len=this.length,
    out=[],
    obj={};

    for (i=0;i<len;i++) {
      obj[this[i]]=0;
    }
    for (i in obj) {
      out.push(i);
    }
    return out;
}

// Remove white space in strings.
// http://jrgns.net/content/21
exports.trim = trim;
function trim(string) {
    return string.replace(/^\s*|\s*$/, '')
}


// email regex.
exports.email_filter = email_filter;
function email_filter() {
    var filter = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i;
    return filter;
}

//url regex.
// http://stackoverflow.com/questions/1303872/trying-to-validate-url-using-javascript
// changed to ignore http or https.
exports.url_filter = url_filter;
function url_filter(value) {
    var urlregex = new RegExp(
            "^[A-Za-z0-9_-]+\.+[A-Za-z0-9.\/%&=\?_:;-]+$");
    if(urlregex.test(value))
    {
      return(true);
    }
    return(false);
  }

//email regex dir where images are saved.
exports.strip = strip_string;
function strip_string(str) {
    return str.replace(/^(\s*)((\S+\s*?)*)(\s*)$/,"$2");
}

// random array sort.
exports.randomSort = randomSort;
function randomSort(a,b) {
    // Get a random number between 0 and 10
    var temp = parseInt( Math.random()*10 );

    // Get 1 or 0, whether temp is odd or even
    var isOddOrEven = temp%2;

    // Get +1 or -1, whether temp greater or smaller than 5
    var isPosOrNeg = temp>5 ? 1 : -1;

    // Return -1, 0, or +1
    return( isOddOrEven*isPosOrNeg );
}

// set active area, so the correct link is highlighted in the layout website header.
exports.set_active_area = set_active_area;
function set_active_area(area_name) { 
    return function(req, res, next) {
        res.locals.active_area = area_name;
        next();
    }
}

// get flag type as string.
exports.get_flag_type_str = get_flag_type_str;
function get_flag_type_str(flag_type) {
     if(flag_type == FLAG_CONTAINS_OFFENSIVE) {
         return "contains offensive language";
     } else if(flag_type == FLAG_OUTDATED) {
         return "is outdated";
     } else if(flag_type == FLAG_WRONG_INFO) {
         return "contains wrong information";
     } else {
         return "";
     }
}

// update base url using server config.
exports.update_base_url = update_base_url;
function update_base_url(host, port, secure_port) {
  
  var replace_str = host;
  if(port != 80 && port != 443) {
    replace_str = replace_str + ':' + port;
  }
  
  var filename = __dirname + "/../assets/javascripts/app/start.js";
  var file = fs.readFileSync(filename);
  var file_content = file.toString();
  var http_regexp = new RegExp('widget.dev.host.port', "g");
  file_content = file_content.replace(http_regexp, replace_str);
  var https_regexp = new RegExp('widget.dev.host.secure_port', "g");
  file_content = file_content.replace(https_regexp, replace_str);
  fs.writeFileSync(filename, file_content);
  
  filename = __dirname + "/../assets/stylesheets/app/widget.css";
  var file = fs.readFileSync(filename);
  var file_content = file.toString();
  var http_regexp = new RegExp('widget.dev.host.port', "g");
  file_content = file_content.replace(http_regexp, replace_str);
  var https_regexp = new RegExp('widget.dev.host.secure_port', "g");
  file_content = file_content.replace(https_regexp, replace_str);
  fs.writeFileSync(filename, file_content);
    
}