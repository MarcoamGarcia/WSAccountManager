/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Step = require('step'),
    async = require('async'),
    logger = require('../config/logger').logger(),
    utils = require('../lib/utils');

var Actor = mongoose.model('Actor');
var Role = mongoose.model('Role');
var Site = mongoose.model('Site');
var Company = mongoose.model('Company');
var HelpSet = mongoose.model('HelpSet');
var ClientDetail = mongoose.model('ClientDetail');


exports.load_using_key = function(req, res, next, company_key) {
    // find company using its key.
    Company.findOne({ key: company_key}, function(err, company) {
        if(err) {
            return next(err);
        }
        if(company == null) {
            return next(new Error("can't find company"));
        } 
        req.company = company;
        // set company object in result.
        res.locals.company = company;
        next();
        
    });
}

exports.load = function(req, res, next, company_id) {
    Company.findById(company_id, function (err, company) {
        if(err) {
            return next(err);
        }
        if(company == null) {
            return next(new Error("can't find company"));
        } 
        req.company = company;
        // set company object in result.
        res.locals.company = company;
        next();
    });
}

exports.dashboard = function(req, res, next) {
    console.log("show_company_dashboard");
    var company = req.company;
    var company_id = company.id;
    if(req.company == null) {
        logger.error("cannot find company");
        res.redirect(res.locals.url_mount("/404"));
    } else {
        async.parallel([
                function count_helpsets(callback) {
                    HelpSet.count({ company_id: company_id}, callback);
                },
                function count_sites(callback) {
                    Site.count({ company_id: company_id}, callback);
                },
                function count_actors(callback) {
                    Actor.count({ company_id: company_id}, callback);
                },
            ], function(err, results) {
                if(err) {
                    logger.error(err);
                    res.redirect(res.locals.url_mount("/500"));
                } else {
                    var number_of_helpsets = results[0];
                    var number_of_sites = results[1];
                    var number_of_actors = results[2];
                    res.render('company/dashboard', {
                        title: company.name + ' dashboard',
                        company: company,
                        number_of_helpsets: number_of_helpsets,
                        number_of_sites: number_of_sites,
                        number_of_actors: number_of_actors
                    }); 
                }
            }
        );
    }
    
}

exports.new_dashboard = function(req, res, next) {
    console.log("show_company_dashboard");
    var logged_user = req.user;
    var company = req.company;
    var company_id = company.id;
    if(req.company == null) {
        logger.error("cannot find company");
        res.redirect(res.locals.url_mount("/404"));
    } else {

      // find client details sort by end_date
      ClientDetail.find({company_id: company_id}, {}).sort('end_date').exec(function(err, clientDetails) {
          if (err) {next(err);}

          var clientDetails_hash = [];
          
          clientDetails.forEach(function(each_clientDetail) {
            var splited_date = each_clientDetail.end_date.split("/");
            var today = new Date();
            var current_month = today.getMonth();
            var current_year = today.getFullYear();
            var current_day = today.getDate();

            var year_result = parseInt(splited_date[2]) - current_year;
            var month_result = parseInt(splited_date[1]) - (current_month + 1);
            var day_result = parseInt(splited_date[0]) - current_day;

            // only shows the details that have alert, that are not resolved and that are to 5 days
            // or less to the end date
            if ((year_result == 0) && (month_result == 0) && (day_result <= 5) && 
            each_clientDetail.alert == true && each_clientDetail.resolved != true) {

              // create page hash with owner information.
              var clientDetail_info = {_id: each_clientDetail.id, title: each_clientDetail.title
                  , description: each_clientDetail.description, end_date: each_clientDetail.end_date
                  , alert: each_clientDetail.alert, created: each_clientDetail.created
                  , company_name: each_clientDetail.company_name };
              clientDetails_hash.push(clientDetail_info);
            };
          });

          res.render('company/dashboard', {
              actor: logged_user,
              company: company,
              title: company.name + ' alerts',
              clientDetails: clientDetails_hash
          });
      });
    }
    
}

//edit company info.
exports.edit_company_info = function(req, res, next) { 
    
    res.locals.main = main_info_hash(req);
    
    var company = req.company;
    res.render('company/edit_company', {
        title: company.name + ' dashboard',
        company: company
    }); 
    
}

//update main info.
exports.update_company_info = function(req, res, next) {
    
  var logged_user = req.user;
  var company = req.company;
  
  // don't allow to change data without security.
  if(req.body.security === undefined || isNaN(req.body.security) || parseInt(req.body.security) < 0 || parseInt(req.body.security) > 2 ) {
      
      res.send({ error: { general: "security level cannot be empty" }}, 500);
      return;
  }
  
  company.security = req.body.security;
  
  var errors = {};
  var has_errors = false;
  if(req.body.name !== undefined) {
      company.name = req.body.name;
  } else {
      logger.error("invalid name " + name);
      errors["name"] = "This field is required.";
      has_errors = true;
  }
  if(req.body.address !== undefined) {
      company.address = req.body.address;
  }
  if(req.body.url !== undefined) {
      if(!utils.url_filter(req.body.url)) {
          errors["name"] = "Please enter a valid URL.";
      } else {
          company.url = req.body.url;
      }
  }
  
  var email = req.body.email;
  errors["email"] = "penis: " + email;
  // check if email has changed.
  if(email != "" && email != company.email) {
      // remove spaces in email string.
      var email = email.replace(/ /g,"");
      // check if the email is valid.
      var email_filter = utils.email_filter();
      if (!email_filter.test(email)) {
          logger.error("invalid e-mail " + email);
          errors["email"] = "Oops. The email you added in not valid. Please change it and try again.";
          has_errors = true;
      } else {
          company.email = req.body.email;
      }
  } 
      
  if(has_errors) {
      res.send({ errors: errors}, 500);
      return;
  }
  company.updated_by_id = logged_user.id;
  company.save(function (err) {
      if (err) {
          logger.error(err);
          res.send({ errors: { general: "Oops. Something went wrong. Please try again." } }, 500);
      } else {
          var company_hash = main_info_hash(req);
          res.writeHead(200, {'content-type': 'text/json' });
          res.write(JSON.stringify(company_hash));
          res.end('\n');
      }
  });
  
}

function main_info_hash(req) { 
    
    var company = req.company;
    
    if(company.name === undefined) {
        company.name = "";
    }
    if(company.address === undefined || company.address == null) {
        company.address = "";
    }
    if(company.email === undefined || company.email == null) {
        company.email = "";
    }
    if(company.url === undefined || company.url == null) {
        company.url = "";
    }
    
    var company_hash = { _id: company.id, name: company.name
         , address: company.address
         , email: company.email
         , url: company.url};
    
    return company_hash;
    
}

exports.get_script = function(req, res, next) {
  var company_key = req.company.key;
  var site_host = req.site_host;
  var company_name = req.company.name;

  var script = "<!-- begin embed code -->\nscript.\n\t/*{literal}<![CDATA[*/\n\tfunction getScript(url,success) {\n" +
  "\t\tvar script = document.createElement('script');\n\t\tscript.src = url;\n" +
  "\t\tvar head = document.getElementsByTagName('head')[0], done=false;\n\t\t" +
  "script.onload = script.onreadystatechange = function(){\n\t" +
  "\t\tif (!done && (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete')) {\n\t"+
  "\t\t\tdone=true;\n" +
  "\t\t\t\tsuccess();\n" +
  "\t\t\t\tscript.onload = script.onreadystatechange = null;\n" +
  "\t\t\t\thead.removeChild(script);\n" +
  "\t\t\t}\n" +
  "\t\t};\n" +
  "\t\thead.appendChild(script);\n" +
  "\t}\n" +
  "\tgetScript('" + site_host + "/javascripts/embed.js', function() {\n" +
  "\t\t/*** embed.js ***/\n" +
  "\t\twindow.help_company_key = '" + company_key + "';\n" +
  "\t\twindow.help_vars = {\"user\": \"#{user.email}\"};\n" +
  "\t\t/*window.help_site_key = 'SITE_KEY';*/\n" +
  "\t\t/*window.help_page_key = \"SITE_PAGE_KEY\";*/\n" +
  "\t\twindow.helplib = helpjs.require(\"helplib\", \"" + site_host + "/api/files/start\");\n" +
  "\t});\n" +
  "\t/*]]>{/literal}*/\n" +
  "<!-- end embed code -->"

  res.render('company/company_script', {
      company: company_name,
      title: "Company Script",
      script: script
  });

}