/**
 * Module dependencies.
 */
var config = require('../config/config'),
    mongoose = require('mongoose'),
    url = require('url'),
    path = require('path'),
    Step = require('step'),
    async = require('async'),
    crypto = require('crypto'),
    fs = require('fs'),
    logger = require('../config/logger').logger(),
    utils = require('../lib/utils'),
    cube = require("cube"),
    _ = require("underscore");

var client = cube.emitter("ws://"  + config.host + ":" + config.collector.http_port);

var Actor = mongoose.model('Actor');
var Role = mongoose.model('Role');
var HelpSet = mongoose.model('HelpSet');
var Site = mongoose.model('Site');
var Page = mongoose.model('Page');
var Company = mongoose.model('Company');
//var Client = mongoose.model('Client');

var encrypt_pass = "AB77F7A051AF7722AB77F7A0";

function get_widget_file(file, extension){
    
    var files;
    var file_path = './public/assets/';
    var path = "";
    var widget_file = new RegExp("^" + file + "-[a-zA-Z0-9]*." + extension + "$");
    files = fs.readdirSync("./public/assets/");
    var flag = false;
    

    //Needed to sort the files in the folder to get the most recent asset created
    //http://stackoverflow.com/questions/10559685/using-node-js-how-do-you-get-a-list-of-files-in-chronological-order
    files = files.sort(function(a, b) {
        return fs.statSync(file_path + b).mtime.getTime() - 
               fs.statSync(file_path + a).mtime.getTime();
    });
    files.forEach(function(file) {
        if(!flag){
            if(file.match(widget_file)){
                flag = true;
                console.log('Matched file:' + file);
                path = '/assets/' + file;
            }
        }
    });

    return path;

}

exports.create_css_file = create_css_file;
function create_css_file(file){
    return function(req, res, next){

        var site = req.site;
        var path = get_widget_file(file, 'css');
        var check_site_template = false;
        var css_template = "";
        var template_file = "";
        var css_file = "";

        if(req.site.name === undefined || req.site.name === null || req.site.name == "") {
            req.template_file = path;
            next();
        } else {
            Template.findOne({site_id: site.id}, function(err, site_template){
                if(err){
                    logger.error(err);
                    next(err);
                } else if(site_template === null || site_template === undefined || site_template == ""){
                    req.template_file = path;
                    next();
                } else {
                    css_template = req.site.id + '_' + site_template.__v;
                    check_site_template = true;
                    template_file = './public/assets/' +  css_template + '.css';
                    css_file = '/assets/' + css_template + '.css';
                    if(!fs.existsSync(template_file)){

                        var file_css = '';
                         
                        var template_settings = site_template.settings;

                        template_settings = _.reject(template_settings, function(entry){
                            return (typeof entry.value === undefined || entry.value === null);
                        });

                        template_settings.forEach(function(entry){
                            switch(entry.type){
                                case Template.WIDGET_BUTTONS:
                                    file_css += '.help_button a, .help_widget a { color:' + entry.value + ' !important; } ';
                                    file_css += 'span.help_create { color:' + entry.value + ' !important;}';
                                    file_css += '.help_button a:hover, .help_widget a:hover { color: ' + entry.value + ' !important; }';
                                    file_css += 'div.help_widget:after { border-color: transparent transparent ' + entry.value + ' transparent !important; }';
                                    break;
                                case Template.WIDGET_BACKGROUND:
                                    file_css += 'div.help_widget_inner { background: ' + entry.value + ' !important; }';
                                    file_css += 'div.help_widget { background: ' + entry.value + ' !important; }';
                                    file_css += '.help_button a, .help_widget a { background:' + entry.value + ' !important; } ';
                                    file_css += '.help_button { background-color: ' + entry.value + ' !important; } ';
                                    break;
                                case Template.WIDGET_LOCATION:
                                    if(entry.value == 'North') {
                                        file_css += '.help_button { left: 50% !important; top: 0% !important; margin-left: -20px !important; }';
                                        file_css += 'div.help_widget { top: 42px !important; left: 49% !important; }';
                                        //file_css += 'div.help_widget:after { left: 50% !important; }';
                                    } else if(entry.value == 'NorthEast') {
                                        file_css += '.help_button { left:auto !important; right:10px !important; top: 0% !important; }'
                                        file_css += 'div.help_widget { left: auto !important; top: 42px !important; right: 10px !important;}';
                                        file_css += 'div.help_widget:after { left: auto !important; right: 20px !important; }';
                                    } else if(entry.value == 'NorthWest') {
                                        file_css += '.help_button { left:10px !important; top: 0% !important; }'   
                                    } else {
                                        file_css += '.help_button { left:10px !important; top: 0% !important; }'
                                    }

                                    break;
                                case Template.WIDGET_FOREGROUND:
                                    file_css += '.cleanslate { color: ' + entry.value + ' !important; }';
                                    file_css += 'div.current_help { color: ' + entry.value + ' !important; }';
                                    break;
                                case Template.BUBBLE_TITLE_BACKGROUND:
                                    file_css += 'div.help_title { background-color:' + entry.value + ' !important; } ';
                                    file_css += 'div.help_tooltip_north:after { border-color: ' + entry.value  + ' transparent transparent transparent !important top: 100% !important;left: 10px !important; }';
                                    file_css += 'div.help_tooltip_south:after { border-color: transparent transparent ' + entry.value  + ' transparent !important; top: -16px !important; left: 10px !important; }';
                                    file_css += 'div.help_tooltip_west:after { border-color: transparent ' + entry.value  + ' transparent transparent !important; top: 10px !important; left: -16px !important; }';
                                    file_css += 'div.help_tooltip_east:after { border-color: transparent transparent transparent ' + entry.value  + ' !important; top: 10px !important; left: 100% !important; }';
                                    break;
                                case Template.BUBBLE_FOOTER_BACKGROUND:
                                    file_css += 'div.help_bottom, span.help_bottom, a.help_bottom, button.help_bottom { background-color:'+ entry.value + ' !important; }';
                                    break;
                                case Template.BUBBLE_BODY_BACKGROUND:
                                    file_css += 'div.help_description { background-color: ' + entry.value + ' !important; }';
                                    break;
                                case Template.BUBBLE_TITLE_FOREGROUND:
                                    file_css += 'div.help_title { font color:' + entry.value + ' !important; } ';
                                    break;
                                case Template.BUBBLE_FOOTER_FOREGROUND:
                                    file_css += 'element.style { color: ' + entry.value + ' !important; }';
                                    break;
                                case Template.BUBBLE_BODY_FOREGROUND:
                                    file_css += 'div.help_description { font color: ' + entry.value + ' !important; }';
                                    break;   
                                case Template.BUBBLE_BUTTONS_COLOR:
                                    file_css += 'div.help_tooltip a { color:' + entry.value + ' !important; }';
                                    file_css += 'div.help_tooltip .close { color: ' + entry.value + ' !important; }';
                                    file_css += 'div.help_tooltip a:hover { color:' + entry.value + ' !important; }';
                                    //file_css += 'div.help_tooltip .close:focus { color: ' + entry.value + ' !important; }';
                                    break;
                            }
                        });
                        
                        var widget_css_info = fs.readFileSync('./public' + path).toString();

                        var concatenated_files = widget_css_info + file_css;
                        
                        fs.openSync(template_file, 'w');

                        var out = fs.writeFileSync(template_file, concatenated_files);

                        req.template_file = css_file;
                        next();
                    }else {
                        req.template_file = css_file;
                        next();
                    }
                }

            });
        }
        if(!check_site_template) {
            req.template_file = path;
        }
    }
}

exports.start = function(req, res, next) {
    var file_link = get_widget_file('start', 'js');
    return res.sendfile('./public' + file_link);
}

exports.site_api_home = function(req, res, next) { 
    
    
    var site = req.site;
    var page = req.page;
    
    var site_id = "";
    var page_id = "";
    var default_helpset = null;
    var show_first_time_only = null;
    if(site != null) {
        site_id = site.id;
    }
    if(page != null) {
        page_id = page.id;
        if(req.default_helpset != null) {
            default_helpset = req.default_helpset.encryptJSON();
            show_first_time_only = page.default_first_time_only;
        }
    }
    
    var port = config.port;
    if(req.protocol == "https") {
        port = config.secure_port;
    }
    
    var base_url = req.site_host + config.default_mount_url;
    var link_to = base_url + "/widget/" + site_id;
    if(site != null && page != null) {
        link_to = base_url + "/widget/" + site_id + "/" + page_id;
    }
    
    // set extra information in session.
    if(req.query.extra) {
        req.session.extra = JSON.parse(req.query.extra);
    }

    HelpSet.find({site_id: site_id, page_id: req.page.id, sub_type: HelpSet.CONTEXT}, {}, {}, function(err, helpsets){
        console.log("Helpsets: ----------> " + JSON.stringify(helpsets));
        console.log("Site id: " + site_id);
        console.log("Page id: " + req.page.id);
        console.log("Context: " + HelpSet.CONTEXT);
        var obj = {};
        obj.context_helpsets = helpsets;
        res.render('widget/_button', {
                 link_to: link_to
                },
                function(err, html) {
            
            if (err) {
                logger.error(err.message);
                obj.error = err.message;
            } else {

                console.log("Site :" + site);
                // send full link to widget css
                obj.css = "<link rel='stylesheet' href='" + base_url + req.template_file + "'></link>";
                obj.js = "<script src='" + base_url + get_widget_file('widget', 'js') + "'></script>";
                obj.html = html;
                obj.html = html;
                obj.link_to = link_to;
                obj.site_id = site.id;
                obj.page_id = page.id;
                obj.default_helpset = default_helpset;
                obj.show_first_time_only = show_first_time_only;
            }

            logger.debug('site_key: ' + req.params.site_key);
            logger.debug('params: ' + JSON.stringify(req.params));
            logger.debug('body: ' + JSON.stringify(req.body));
            logger.debug('query: ' + JSON.stringify(req.query));
            logger.debug('_button: ' + html);

            res.header('Content-type','application/json');
            res.header('Charset','utf8');
            // callback is added so it is bytesToStringggered in the client side with jQuery.
            res.send(req.query.callback + '('+ JSON.stringify(obj) + ');');
        });
    });
}


//Open widget and get page helpsets.
//Called with JSONP.
exports.site_helpsets_api = function(req, res, next) { 
    
    logger.debug('widget: ' + req.params.site_id);
    
    var result_obj = {};
    result_obj.loggedIn = req.isAuthenticated();
    result_obj.permissions = req.permissions;
    // if its logged in add actor id, so we can check directly in every non-official helpset if the user is allowed to change it.
    if(req.isAuthenticated()) {
        result_obj.actor = req.user.id;
    }
    
    var button_position = 'left';
    // check button position.
    if(req.query.position == 'right') {
        button_position = 'right';
    } else if(req.query.position == 'center') {
        button_position = 'center';
    }
    
    // show login per default.
    var show_login = true;
    if(req.query.show_login == false || req.query.show_login == 'false') {
        show_login = false;
    }
    
    var logged_user = req.user;

    var limit = utils.small_paginate_limit();
    
    if(req.site && req.page) {
        
        var site = req.site;
        var site_id = site.id;
        var page = req.page;
        var page_id = req.page.id;

        // need to transform string to ObjectId before querying.
        site_id = mongoose.Types.ObjectId(site_id);

        var query = { page_id: page_id, is_flagged: false};
        //verify if has permissions to see draft helpsets
        var state = HelpSet.PUBLISHED;
        if(req.can_edit_site) {
            state = HelpSet.DRAFT;
        } else {
            query.sub_type = HelpSet.TUTORIAL;
        }

        query.state = {$gte: state};

        // find HelpSet using page_id but don't show flagged helpsets.
        HelpSet.find(query, {}, { sort: ({"official": 1}, {"downcase_name": 1}), limit: limit + 1 }, function(err, helpsets) {
            if(err) {
                next(err);
            } else {
                res.render('widget/_widget',  {
                        show_login: show_login
                        , position: button_position
                    }, function(err, html) {
                            
                    if(err) {
                        logger.error(err.message);
                        next(err);
                    } else {
                        result_obj.page = {_id: page.id, name: page.name, description: page.description, default_helpset: page.default_helpset};
                        var helpsets_array = [];
                        helpsets.forEach(function(helpset) {
                            helpsets_array.push(helpset.encryptJSON());
                        });
                        
                        // set flag to true if there are more helpsets in the db.
                        if(helpsets.length == limit + 1) {
                            result_obj.has_more = true;
                            // remove last element from helpset, because it was added only to check if there are more helpsets in db. 
                            helpsets_array.pop();
                        } else {
                            result_obj.has_more = false;
                        }
                        
                        result_obj.helpsets = helpsets_array;
                        
                        result_obj.page_id = page.id;
                        result_obj.append = html;
                        res.header('Content-type','application/json');
                        res.header('Charset','utf8');
                        // callback is added so it is triggered in the client side with jQuery.
                        res.send(req.query.callback + '('+ JSON.stringify(result_obj) + ');');
                    }
                });
            }
        });
    } else if(req.params.site_id) {
        
        // TODO: add option to search using page_url regex.
        var site_id = req.params.site_id;
        
        // find HelpSet using its site id.
        // need to transform string to ObjectId before querying.
        site_id = mongoose.Types.ObjectId(site_id);
        // find HelpSet using site_id but don't show flagged helpsets.
        HelpSet.find({ site_id: site_id, is_flagged: false}, {}, { sort: [["official",1], ["downcase_name",1]], limit: limit+ 1 }, function(err, helpsets) {
            if(err) {
                next(err);
            } else {
                res.render('widget/_widget', {
                    show_login: show_login
                    , position: button_position
                    }, function(err, html) {
                        
                    if(err) {
                        logger.error(err.message);
                        next(err);
                    } else {
                        
                        // set flag to true if there are more helpsets in the db.
                        if(helpsets.length == limit + 1) {
                            result_obj.has_more = true;
                            // remove last element from helpset, because it was added only to check if there are more helpsets in db. 
                            helpsets_array.pop();
                        } else {
                            result_obj.has_more = false;
                        }
                        
                        result_obj.helpsets = helpsets;
                        result_obj.append = html;
                        // if there isn't a page id then it was launched with a bookmarklet so we need to set the page id.
                        // TODO: divide site launched with bookmarklet in several areas (maybe tags or page url regex?).
                        result_obj.help_page_id = "0";
                        res.header('Content-type','application/json');
                        res.header('Charset','utf8');
                        // callback is added so it is triggered in the client side with jQuery.
                        res.send(req.query.callback + '('+ JSON.stringify(result_obj) + ');');
                    }
                });
            }
        });
    } else {
        // if we cannot find the site, its a new one.
        res.render('widget/_widget', {}, {
                show_login: show_login
                , position: button_position
                }, function(err, html) {
                    
            if(err) {
                logger.error(err.message);
                next(err);
            } else {
                result_obj.helpsets = [];
                result_obj.has_more = false;
                result_obj.append = html;
                res.header('Content-type','application/json');
                res.header('Charset','utf8');
                // callback is added so it is triggered in the client side with jQuery.
                res.send(req.query.callback + '('+ JSON.stringify(result_obj) + ');');
            }
        });
    }
}

// get next helpsets from the database.
exports.get_more_helpsets = function(req, res, next) {
    
 var result_obj = {};
 
 var page = parseInt(req.params.page) || 1;
 res.locals.page = page;
 
 var logged_user = req.user;

 var limit = utils.small_paginate_limit();
 var from = (page - 1) * limit;
    
 if(req.site && req.page) {
        
        var site = req.site;
        var site_id = site.id;
        var page = req.page;
        var page_id = req.page.id;

        // need to transform string to ObjectId before querying.
        site_id = mongoose.Types.ObjectId(site_id);

        //verify if has permissions to see draft helpsets
        var state = HelpSet.PUBLISHED;
        if(req.can_edit_site) {
            state = HelpSet.DRAFT;
        }

        // find HelpSet using page_id but don't show flagged helpsets.
        HelpSet.find({page_id: page_id, is_flagged: false, state: {$gte: state}}, {}, { sort: [["official",1], ["downcase_name",1]], limit: limit + 1, skip: from }, function(err, helpsets) {
            if(err) {
                next(err);
            } else {
                result_obj.page = {_id: page.id, name: page.name, description: page.description, default_helpset: page.default_helpset};
                var helpsets_array = [];
                helpsets.forEach(function(helpset) {
                    helpsets_array.push(helpset.encryptJSON());
                });
                
                // set flag to true if there are more helpsets in the db.
                if(helpsets.length == limit + 1) {
                    result_obj.has_more = true;
                    // remove last element from helpset, because it was added only to check if there are more helpsets in db. 
                    helpsets_array.pop();
                } else {
                    result_obj.has_more = false;
                }
                result_obj.helpsets = helpsets_array;
                res.header('Content-type','application/json');
                res.header('Charset','utf8');
                // callback is added so it is triggered in the client side with jQuery.
                res.send(req.query.callback + '('+ JSON.stringify(result_obj) + ');');
            }
        });
    } else if(req.params.site_id) {
        
        // TODO: add option to search using page_url regex.
        var site_id = req.params.site_id;
        
        // find HelpSet using its site id.
        // need to transform string to ObjectId before querying.
        site_id = mongoose.Types.ObjectId(site_id);
        // find HelpSet using site_id but don't show flagged helpsets.
        HelpSet.find({ site_id: site_id, is_flagged: false}, {}, { sort: [["official",1], ["downcase_name",1]], limit: limit + 1, skip: from }, function(err, helpsets) {
            if(err) {
                next(err);
            } else {
                
                // set flag to true if there are more helpsets in the db.
                if(helpsets.length == limit + 1) {
                    result_obj.has_more = true;
                    // remove last element from helpset, because it was added only to check if there are more helpsets in db. 
                    helpsets_array.pop();
                } else {
                    result_obj.has_more = false;
                }
                
                result_obj.helpsets = helpsets;
                // if there isn't a page id then it was launched with a bookmarklet so we need to set the page id.
                // TODO: divide site launched with bookmarklet in several areas (maybe tags or page url regex?).
                result_obj.help_page_id = "0";
                res.header('Content-type','application/json');
                res.header('Charset','utf8');
                // callback is added so it is triggered in the client side with jQuery.
                res.send(req.query.callback + '('+ JSON.stringify(result_obj) + ');');
            }
        });
    }
}

// Get current pages in site.
//Called with JSONP.
exports.site_pages_api = function(req, res, next) {
  
  var result_obj = {};
  result_obj.loggedIn = req.isAuthenticated();
  
  var button_position = 'left';
  // check button position.
  if(req.query.position == 'right') {
      button_position = 'right';
  } else if(req.query.position == 'center') {
      button_position = 'center';
  }
  
  if(req.site) {
      
      if(!req.can_edit_site) {
          logger.debug("You're not authorized to see site " + req.site.id + " pages.");
          return res.json({ errors: {general: "Oops. You're not authorized to do this." } }, 403);
      }
      
      var site = req.site;
      var site_id = site.id;
      // need to transform string to ObjectId before querying.
      site_id = mongoose.Types.ObjectId(site_id);
      // find HelpSet using page_id.
      Page.find({ site_id: site_id}, function(err, pages) {
          if(err) {
              next(err);
          } else {
              
              // reorder pages that where found.
              pages = _.sortBy(pages, function(page){ return req.site.page_ordering.indexOf(page.id) });
              
              res.render('widget/_pages', {position: button_position}, function(err, html){
                  if(err) {
                      logger.error(err.message);
                      next(err);
                  } else {
                      result_obj.pages = pages;
                      result_obj.append = html;
                      res.header('Content-type','application/json');
                      res.header('Charset','utf8');
                      // callback is added so it is triggered in the client side with jQuery.
                      res.send(req.query.callback + '('+ JSON.stringify(result_obj) + ');');
                  }
              });
          }
      });
  } else {
      logger.debug("can't find site with id: " + req.params.site_id);
      next(new Error("can't find site"));
  }
}

exports.create_page_if_needed = function(req, res, next) {
    // if can't find page, create a new one using its key or url.
    if(req.page == null) {
        var page = new Page();
        if(req.params.page_key) {
            page.key = req.params.page_key;
            page.site_id = req.site.id;
            page.save(function(err) {
                if(err) {
                    next(err);
                } else {
                    req.page = page;
                    next();
                }
            });
        } else if(req.query.url) {
            // create page using its url (used in sites that don't have a page id).
            var url_parts = url.parse(req.query.url, true);
            // Use the entire URL to create the new page. To ignore the "{param}" in backoffice have to be configured.
            var pathname = url_parts.href.replace(url_parts.protocol + "//", "");
            pathname = pathname.replace(url_parts.host, "");
        
            page.name = 'Generated by Helppier' + ' (' + pathname.substr(0, 10) + ')';
            page.url_regex = pathname;
            page.site_id = req.site.id;
            if(req.site.company_id != null) {
                page.company_id = req.site.company_id;
            }
            page.save(function(err) {
                if(err) {
                    next(err);
                } else {
                    req.page = page;
                    next();
                }
            });
        } else {
            next(new Errror("Can't create page"));
        }
    } else {
        next();
    }
    
}

exports.create_site_if_needed = function(req, res, next) {
    // if can't find site, create a new one using its url
    // (used if the server side code iwas set using the compsany id or for sites that don't have server side code).
    if(req.site == null && req.base_url) {
        // create site if it does not exist.
        var site = new Site();
        if(req.company) {
            site.company_id = req.company.id;
            // create new api token.
            var crypt = crypto.randomBytes(16).toString('hex');
            site.key = crypt;
        }
        site.url = req.base_url;
        site.name = "Generated by Helppier";
        site.save(function (err) {
            if(err) {
                next(err);
            } else {
                req.site = site;
                next();
            } 
        });
    } else {
        next();
    }
}

exports.external_register_and_login = function(req, res, next) {
    if(req.isAuthenticated()) {
        if(req.user.facebook != null || req.user.twit != null) {
            if(req.user.roles.length == 0) {
                // TODO: add normal role.
                Role.findOne({ rtype: 1}, function(err, normal_role) {
                    if(err) {
                        logger.error("Couldn't find normal role: " + err);
                        return;
                    }
                    req.user.roles.push({role_id: normal_role._id});
                    req.user.save(function(err) {
                        if(err) {
                            logger.error("Couldn't add normal user role to external user: " + err);
                        } else {
                            logger.debug("oauth_close 1");
                            res.render('oauth_close', {
                                layout: false
                            });
                        }
                    });
                });
            } else {
                logger.debug("oauth_close 2");
                res.render('oauth_close', {
                    layout: false
                });
            }
        } 
    } else {
        if(req.xhr) {
            res.json({ success: false }, 401);
        } else {
            
        }
        
    }
    return;
}

exports.add_helpset = function(req, res, next) {
    
    if(req.page != null) {
        
        var name = req.body.name;
        var description = req.body.description;
        var state = req.body.state;
        //var description = Crypto.AES.decrypt(req.body.name, crypto_key);
        //description = Crypto.charenc.UTF8.bytesToString(description);
        var sub_type = req.body.sub_type;
        
        var helpset = new HelpSet();
        helpset.name = name;
        helpset.description = description;
        helpset.state = state;
        // TODO: Finish type.
        //helpset.type = model.type;
        helpset.sub_type = sub_type;
        helpset.page_id = req.page.id;
        helpset.site_id = req.site.id;
        helpset.company_id = req.site.company_id;
        helpset.created_by_id = req.user.id;
        helpset.updated_by_id = req.user.id;
        
        // if the user can edit site or company info,
        // then its an official user, so the helpset is set to official also.
        if(req.can_edit_site) {
            helpset.official = true;
        }
        
        helpset.b_seven = encrypt_pass;
        helpset.helps = req.body.helps;
        
        // add user to the helpset permissions set.
        helpset.permissions.push(req.user.id);
        
        helpset.save(function(err) {
            if(err) {
                logger.error(err);
                res.json({ error: "Oops. can't add help. Please try again latter" }, 500);
                return;
            } else {
                var helpset_hash = helpset.encryptJSON();
                res.json(helpset_hash);
            } 
        }); 
    } else {
        res.json({ error: "Oops. can't add help. Please try again latter" }, 400);
    }
}

exports.update_helpset = function(req, res, next) {
    
    if(req.site != null && req.helpset != null) {
        
        var actor = req.user;
        
        var name = req.body.name;
        var description = req.body.description;
        var sub_type = req.body.sub_type;
        var helpset = req.helpset;
        var state = req.body.state;
        helpset.name = name;
        helpset.description = description;
        helpset.state = state;
        // TODO: Finish type.
        //helpset.type = model.type;
        helpset.sub_type = sub_type;
        helpset.updated_by_id = req.user.id;
        helpset.helps = req.body.helps;
        helpset.save(function(err) {
            if(err) {
                logger.error(err);
                next(err);
            } else {
                var helpset_hash = helpset.encryptJSON();
                res.json(helpset_hash);
            }
        }); 
        
    } else {
        res.json({ error: "Oops. can't update help. Please try again latter" }, 400);
    }
}

// Find permissions for current user in the site/page and add them to the request.
exports.get_permissions = function(req, res, next) {

    var page_id = "";
    if(req.params.page_id !== undefined) {
        page_id = req.params.page_id;
    }
            
    if(req.isAuthenticated()) {
        
        var actor_permissions = req.user.permissions;
        var permissions_to_send = [];
        // check if the user and change site helpsets.
        var site_permission = Actor.two_attrs(actor_permissions, "type", Actor.PERMISSION_SITE, "obj_id", req.site.id);
        if(site_permission != null) {
            permissions_to_send.push(req.site.id);
        } else if(typeof req.site.company_id !== undefined && req.site.company_id != null) {
            // check if the user can change all company site helpsets.
            var all_sites_permission = Actor.two_attrs(actor_permissions, "type", Actor.PERMISSION_ALL_COMPANY_SITES, "obj_id", req.site.company_id);
            if(all_sites_permission != null) {
                permissions_to_send.push(req.site.id);
            } else {
                // or if it is a company admin.
                var site_permission = Actor.two_attrs(actor_permissions, "type", Actor.PERMISSION_COMPANY_ADMIN, "obj_id", req.site.company_id);
                if(site_permission != null) {
                    permissions_to_send.push(req.site.id);
                }
            }
        } else {
            // TODO: Temporary code to work with the bookmarklet.
            permissions_to_send.push(req.site.id);
        }
        req.permissions = permissions_to_send;
        next();
        
    } else {
        req.permissions = [];
        next();
    }
}

//Get current site and page helpset permissions for current user.
//Called with JSONP.
exports.send_permissions = function(req, res, next) {
  
  logger.debug('widget: ' + req.params.site_id);
  
  var result_obj = {};
  result_obj.loggedIn = req.isAuthenticated();
  result_obj.permissions = req.permissions;
  //if its logged in add actor id, so we can check directly in every non-official helpset if the user is allowed to change it.
  if(req.isAuthenticated()) {
      result_obj.actor = {id: req.user.id, name: req.user.name};
  }
  
  res.header('Content-type','application/json');
  res.header('Charset','utf8');
  // callback is added so it is triggered in the client side with jQuery.
  res.send(req.query.callback + '('+ JSON.stringify(result_obj) + ');');
  
}

// TODO: Pages are added in a separated collection but ordering is done in Site collection. 
// Should be consider adding pages inside the Site collection to avoid an extra query to the database 
// (and instead iterating the page array inside the Site collection to find the page)?
// In this way the routing mecanism might be faster because we don't need to query db to find all pages in this site. 
// The drawback is that the Site record will be larger and we will have to load all the Pages inside it.
exports.set_page_order = function(req, res, next) {
    if(req.site != null) {
        var order = req.body.order;
        // don't need to check if the pages exist because the query to find th page is limited to the pages that have this site id.
        req.site.page_ordering = order;
        req.site.save(function(err) {
            if(err) {
                logger.error(err);
                res.json({ error: "Oops. can't change page order. Please try again latter." }, 500);
                return;
            } else {
                res.json({ success: true });
            }
        });
    }
}

// add view stat to helpset.
exports.view_state_help_and_helpset = function(req, res, next) {
    if(req != null) {
        
        // for the time being just save stat for the first help.
        // TODO: Change code to save also help step without breaking the helpset count. 
        if(typeof req.params.first == "undefined" || req.params.first == null) {
            return res.json({ success: true });
        }
        
        var data = {
            type: "view",
            time: new Date(),
            data: {
                company_id: req.company.id,
                page_id: req.page.id,
                helpset_id: req.helpset.id
            }
        };
        
        var extra = req.session.extra;
        if(extra) {
             _.each(extra, function(value, key, list) {
                data.data[key] = value;
             }); 
        }
        
        // increment index for helpset with cube.
        //https://github.com/square/cube/wiki/Emitter
        client.send(data);
        //client.close();

        res.json({ success: true });
    } else {
        logger.error("Oops. Can't find helpset");
        res.json({ error: "Oops. can't find help. Please try again latter." }, 500);
        return;
    }
    
}

// score help up and down with cube.
exports.score_help_and_helpset = function(req, res, next) {
    if(req != null) {
        
        var help_score = parseInt(req.body.score);
        
        if(help_score != -1 && help_score != 1) {
            logger.error("Oops. Can't score help with value " + help_score);
            res.json({ error: "Oops. Something went wrong. Please try again." }, 500);
            return;
        }
        
        var data = {
            time: new Date(),
            data: {
                company_id: req.company.id,
                page_id: req.page.id,
                helpset_id: req.helpset.id
                //help: help.id
            }
        };
        
        var extra = req.session.extra;
        if(extra) {
             _.each(extra, function(value, key, list) {
                data.data[key] = value;
             }); 
        }
        
        if(help_score == 1) {
            //if help_score is 1 then save on DB on score_up collection with cube
            data.type = "score_up";
        } else {
            ////if help_score is 0 then save on DB on score_down collection with cube
            data.type = "score_down";
        }
        //https://github.com/square/cube/wiki/Emitter
        client.send(data);
        
        res.json({ success: true });
        
    } else {
        logger.error("Oops. Can't find helpset");
        res.json({ error: "Oops. can't find help. Please try again latter." }, 500);
        return;
    }
    
}

// flag helpset. 
exports.flag_helpset = function(req, res, next) {
    if(req.helpset != null) {
        
        var flag = null;
        var flag_type = req.body.type;
        var flag_reason = req.body.reason;
        
        var errors = {};
        if(flag_reason == null || flag_reason == "") {
            logger.error("flag reason cannot be empty");
            errors["password"] = 'password cannot be empty';
        } 
        if(flag_type == null || flag_type == "") {
            logger.error("flag type cannot be empty");
            errors["password"] = 'password cannot be empty';
        } 
        
        if(_.size(errors) > 0) {
            res.send({ error: "Oops, something when wrong. Please add a flag type and the reason to report it." });
            return;
        }
        
        if(!req.isAuthenticated()) {
            var email = req.body.email;
            if(!utils.email_filter().test(email)) {
                logger.error("tyrying to flag helpset without a valid email.");
                res.json({ error: "Please enter a valid Email." });
                return;
            }
            var now = new Date();
            flag = {type: flag_type, reason: flag_reason, created_by_id: null, created_by_email: email, createdAt: now, updatedAt: now};
        } else {
            var logged_user = req.user;
            var now = new Date();
            flag = {type: flag_type, reason: flag_reason, created_by_id: logged_user.id, createdAt: now, updatedAt: now};
        }
        
        var helpset = req.helpset;
        
        // TODO: must change mongoose so the embebbed object is returned 
        // as a new param in the save callback.
        // http://groups.google.com/group/mongoose-orm/browse_thread/thread/94c0888671f63fb9/0d607086fd3d7d44?lnk=gst&q=document+id#
        helpset.flags.push(flag);
        helpset.is_flagged = true;
        helpset.save(function(err){
            if (err) {
                logger.error(err.message);
                res.send({ error: "Oops, something when wrong. Please try again." });
            } else {
                res.json({ success: true });
            }
            
        });
        
    } else {
        logger.error("Oops. Can't find helpset");
        res.json({ error: "Oops. can't find help. Please try again latter." }, 500);
        return;
    }
    
}
