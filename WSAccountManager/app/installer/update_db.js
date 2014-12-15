var _ = require('underscore'),
  async = require('async'),
  crypto = require('crypto'),
  fs = require('fs'),
  mongoose = require('mongoose');

// get models
var models_path = __dirname + '/../models'
fs.readdirSync(models_path).forEach(function (file) {
  if (~file.indexOf('.js')) require(models_path + '/' + file)
});

var Actor = mongoose.model('Actor');
var Role = mongoose.model('Role');
var Company = mongoose.model('Company');

module.exports.init = function(company_name, user_email, user_pass, main_callback) {
  var normal_user_role = null;
  var admin_role = null;
  async.series([
      function(callback) {
        drop_collections(callback);
      },
      function(callback) {
        add_default_data(function(err, admin_role_in_db, normal_user_role_in_db) {
          normal_user_role = normal_user_role_in_db;
          admin_role = admin_role_in_db;
          return callback(err, normal_user_role);
        });
      },
      function(callback) {
        create_user_and_company(company_name, user_email, user_pass, admin_role, callback);
      }      
    ], function(err, results) {
      main_callback(err, results);
    }
  );
}
  
function add_default_data(main_callback) {
  var admin_role;
  var normal_user_role;
  async.parallel([
      function(callback) {
        admin_role = new Role();
        admin_role.name = "Admin";
        admin_role.rtype = Role.ADMIN;
        admin_role.save(callback);
      },
      function(callback) {
        normal_user_role = new Role();
        normal_user_role.name = "Normal User";
        normal_user_role.rtype = Role.NORMAL;
        normal_user_role.save(callback);
      }      
    ], function(err, results) {
      main_callback(err, admin_role, normal_user_role);
    }
  );
}

function create_user_and_company(company_name, user_email, user_pass, role, main_callback) {
  var default_company;
  var actor;
  async.series([
      function(callback) {
        default_company = new Company();
        default_company.name = company_name;
        // create new api token.
        var crypt = crypto.randomBytes(16).toString('hex');
        default_company.key = crypt;
        default_company.save(callback);
      },
      function(callback) {
        // create login.
        actor = new Actor();
        actor.email = user_email;
        actor.password = user_pass;
        actor.roles.push({role_id: role.id.toString()});
        actor.name = "Admin";
        actor.type = 0;
        actor.state = 1;
        actor.permissions.push({type: Actor.PERMISSION_COMPANY_ADMIN, obj_id: default_company.id});
        actor.permissions.push({type: Actor.PERMISSION_COMPANY, obj_id: default_company.id});
        actor.save(callback);
      },
      function(callback) {
        // create login.
        default_company.main_actor_id = actor.id;
        default_company.save(callback);
      }      
    ], function(err, results) {
      main_callback(err, results[0], results[1]);
    }
  );
}

// drop all collections in db.
// https://gist.github.com/timoxley/3189267
function drop_collections(callback) {
    var collections = _.keys(mongoose.connection.collections);
    async.forEach(collections, function(collectionName, done) {
      var collection = mongoose.connection.collections[collectionName];
      collection.drop(function(err) {
        if (err && err.message != 'ns not found') return done(err);
        console.log("dropped " + collectionName);
        done(null);
      })
    }, callback);
}
