var _ = require("underscore"),
  async = require("async"),
  fs = require('fs'),
  path = require('path'),
  uglify = require('uglify-js');

var Mincer  = require('mincer');
var environment = new Mincer.Environment();

var js_mincer_path = 'app/assets/javascripts';
environment.appendPath(js_mincer_path);
var css_mincer_path = 'app/assets/stylesheets';
environment.appendPath(css_mincer_path);
var deploy_path = '../deploy/';

var license_path = 'LICENSE.txt';

// get all modules from package.json.
var package_modules = Object.keys(JSON.parse(fs.readFileSync(__dirname + "/package.json")).dependencies);
var PACKAGE_DIRS = _.map(package_modules, function(string){ return 'node_modules/' + string + '/**/*'; });

/* SAS =- Configurations for the SAS deploy */
var ALL_JS = [
    '**/*.js'
];


var ALL_OTHER_FILES_JS = [
    'app/assets/javascripts/*.js'
    , 'app/assets/javascripts/app/*.js'
    , 'app/assets/javascripts/dep/*.js'
    , 'app/assets/stylesheets/*.css'
    , 'app/assets/stylesheets/app/*.css'
    , 'app/assets/stylesheets/dep/*.css'
];

var ALL_OTHER_FILES_EXCLUDE_JS = [
    '!app/assets/javascripts/*.js'
    , '!app/assets/javascripts/app/*.js'
    , '!app/assets/javascripts/dep/*.js'
    , '!app/assets/stylesheets/*.css'
    , '!app/assets/stylesheets/app/*.css'
    , '!app/assets/stylesheets/dep/*.css'
];

var ALL_OTHER_FILES = [
    '**/*.css'
    , '**/*.jade'
    , 'public/**/*.jpg'
    , 'public/**/*.jpeg'
    , 'public/**/*.gif'
    , 'public/**/*.png'
    , 'package.json'
];

var ALL_EXCLUDED_FILES = [
    '!node_modules/**/*'
    , '!public/assets/**/*'
    , '!public/generated/**/*'
    , '!Gruntfile.js'
    , '!app-jakefile.js'
    , '!bundle.js'
];

ALL_OTHER_FILES = _.union(ALL_OTHER_FILES, ALL_EXCLUDED_FILES, PACKAGE_DIRS);
ALL_JS = _.union(ALL_JS, ALL_EXCLUDED_FILES);

// COTS - Configurations for the COTS deploy
var COTS_JS_Files = [
      '!app/assets/javascripts/**/*'
      , 'app/assets/javascripts/app/*.js'
      , 'app/assets/javascripts/dep/*.js'
      , '!app/controllers/admin*.js'
      , '!app/controllers/demo_app.js'
      , '!config/db/**/*'
      , '!config/config.js'
      , '!config/config.saas.js'
      , '!app/config/routes.saas.js'
];

var COTS_Other_Files = [
    '!app/assets/javascripts/**/*'
    , 'app/assets/javascripts/*.js'
    , '!app/assets/stylesheets/**/*'
    , 'app/assets/stylesheets/*.css'
    , 'app/assets/stylesheets/app/*.css'
    , 'app/assets/stylesheets/dep/*.css'
    , '!app/views/admin/**/*'
    , '!app/views/register/**/*'
    , '!app/views/testapp/**/*'
    , '!app/views/index.jade'
    , '!app/views/public_layout.jade'
    , 'config/config.COTS.js'
];

var COTS_JS_Files = _.union(ALL_JS, COTS_JS_Files);
var COTS_Other_Files = _.union(ALL_OTHER_FILES, COTS_Other_Files);

var SAAS_JS_Files = _.union(ALL_JS, ALL_EXCLUDED_FILES, ALL_OTHER_FILES_EXCLUDE_JS);
var SAAS_OTHER_FILES = _.union(ALL_OTHER_FILES, ALL_EXCLUDED_FILES, ALL_OTHER_FILES_JS, PACKAGE_DIRS);

// how to launch: grunt COTS --versp=1.0.4

module.exports = function(grunt) {

  var version_error = 'Please specify version';
  var version = grunt.option('versp') || version_error;
  
  var license_application_files = _.map(ALL_JS, function(string){ return '../deploy' + '/<%= pkg.name %>' + version + "/" + string; });

  var license = fs.readFileSync(license_path).toString();
  
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    usebanner: {
      options: {
        position: 'top',
        banner: '/*' + license + '*/'
      },
      files: {
        src: license_application_files,
        filter: 'isFile'
      }
    },
    //uglify all of the JSFiles, excluding the node_modules folder
    uglify: {
      SAAS:{ 
        files: [{
          expand: true,
          src: SAAS_JS_Files,
          dest: deploy_path + '/<%= pkg.name %>' 
              + version,
        }]
      },
      COTS:{ 
        files: [{
          expand: true,
          src: COTS_JS_Files,
          dest: deploy_path + '/<%= pkg.name %>' 
              + version,
          }]
      }      
    },

    //copies all of the files that are not JS and excludes node_modules
    copy: {
      SAAS:{ 
        files: [{
          expand: true,
          src: SAAS_OTHER_FILES,
          dest: deploy_path + '/<%= pkg.name %>' 
              + version,
        }]
      },
      COTS:{ 
        files: [{
          expand: true,
          src: COTS_Other_Files,
          dest: deploy_path + '/<%= pkg.name %>' 
                + version,
        }]
      }
    },
    update_assets: {
      COTS: []
    },
    rename: {
      SAAS: {
        files: [
              {
                src: '../deploy' + '/<%= pkg.name %>' + version + "/config/config.saas.js" 
                , dest: '../deploy' + '/<%= pkg.name %>' + version + "/config/config.js"
              },
              {
                src: '../deploy' + '/<%= pkg.name %>' + version + "/app/assets/javascripts/app/start.deploy.js" 
                , dest: '../deploy' + '/<%= pkg.name %>' + version + "/app/assets/javascripts/app/start.js"
              },
              {
                src: '../deploy' + '/<%= pkg.name %>' + version + "/app/assets/stylesheets/app/widget.deploy.css" 
                , dest: '../deploy' + '/<%= pkg.name %>' + version + "/app/assets/stylesheets/app/widget.css" 
              }
            ]
      },
      COTS: {
        files: [
              {
                src: '../deploy' + '/<%= pkg.name %>' + version + "/config/config.COTS.js" 
                , dest: '../deploy' + '/<%= pkg.name %>' + version + "/config/config.js"
              },
              {
                src: '../deploy' + '/<%= pkg.name %>' + version + "/app/views/public_layout.COTS.jade" 
                , dest: '../deploy' + '/<%= pkg.name %>' + version + "/app/views/public_layout.jade"
              },
              {
                src: '../deploy' + '/<%= pkg.name %>' + version + "/app/views/index.COTS.jade" 
                , dest: '../deploy' + '/<%= pkg.name %>' + version + "/app/views/index.jade"
              },
              {
                src: '../deploy' + '/<%= pkg.name %>' + version + "/app/assets/javascripts/app/start.deploy.js" 
                , dest: '../deploy' + '/<%= pkg.name %>' + version + "/app/assets/javascripts/app/start.js"
              },
              {
                src: '../deploy' + '/<%= pkg.name %>' + version + "/app/assets/stylesheets/app/widget.deploy.css" 
                , dest: '../deploy' + '/<%= pkg.name %>' + version + "/app/assets/stylesheets/app/widget.css" 
              }
            ]
      }
    },
    //Create a zip in the directory shown below
    // with a version that is passed through command line
    compress:{
      main: {
        options: {
          archive: '../deploy/<%=pkg.name%>' + version + '.zip'
        },
        files:[{
          expand: true, 
          cwd: '../deploy/',
          src: '<%=pkg.name%>' + version + '/**/*'
        }]
      }
    }
  });


  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  // Load the plugin that provides the "copy" task.
  grunt.loadNpmTasks('grunt-contrib-copy');
  // Load the plugin that provides the "compress" task.
  grunt.loadNpmTasks('grunt-contrib-compress');
  // Load the plugin that provides the "compress" task.
  grunt.loadNpmTasks('grunt-banner');
  // Load the plugin that provides the "watch" task.
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-file-creator');
  grunt.loadNpmTasks('grunt-contrib-rename');

  if(version == version_error){
    console.log(version_error);
  }
  else{    

    // Software as a service task
    grunt.registerTask('SAAS', [  
      'uglify:SAAS', 
      'copy:SAAS',
      'usebanner', 'saas_file:SAAS', "rename:SAAS", 'compress:main'
    ]);

    //create SAAS file to enable analytics
    grunt.registerTask('saas_file', 'Used to create SAAS file.', function() {
      grunt.file.write(deploy_path + '/Helppier' + version + '/flavour.min.js', 'saas');
    });

    //create COTS file to disable  analytics
    grunt.registerTask('cots_file', 'Used to create COTS file.', function() {
      grunt.file.write(deploy_path + '/Helppier' + version + '/flavour.min.js', 'cots');
    });

    // COTS task
    grunt.registerTask('COTS', [
      'uglify:COTS', 'copy:COTS', 'usebanner', 'cots_file:COTS', "update_assets:COTS", "rename:COTS",
      'compress:main'
    ]);
    
    grunt.registerMultiTask('update_assets', 'Updates assets using Mincer', function() {
      grunt.task.requires('copy:COTS');
      var done = this.async();
      // uglify javascript sources.
      var pkg_name = grunt.config('pkg.name');
      var source_app_dir = __dirname + "/" + js_mincer_path + "/app/";
      var files = fs.readdirSync(source_app_dir);
      async.each(files, copy_and_uglify_file(source_app_dir, pkg_name, version, '/*' + license + '*/', /^.*js$/, js_mincer_path, false), function(err){
          // copy javascript dependencies.
          source_app_dir = __dirname + "/" + js_mincer_path + "/dep/";
          files = fs.readdirSync(source_app_dir);
          async.each(files, copy_and_uglify_file(source_app_dir, pkg_name, version, '/*' + license + '*/', /^.*js$/, js_mincer_path, true), function(err){
            // copy stylesheets dependencies.
            source_app_dir = __dirname + "/" + css_mincer_path + "/app/";
            var files = fs.readdirSync(source_app_dir);
            async.each(files, copy_and_uglify_file(source_app_dir, pkg_name, version, '', /^.*css$/, css_mincer_path, true), function(err){
              // copy stylesheets dependencies.
              source_app_dir = __dirname + "/" + css_mincer_path + "/dep/";
              var files = fs.readdirSync(source_app_dir);
              async.each(files, copy_and_uglify_file(source_app_dir, pkg_name, version, '', /^.*css$/, css_mincer_path, true), function(err){
                done();
              });
            });
          });
      });
    });
  }
};

function copy_and_uglify_file(dir, pkg_name, version, license, file_type, mincer_path, copy_only) {
  return function(file, callback) {
    var file_full_path = dir + "/" + file;
    var asset_dir = dir.replace(__dirname, "");
    var mincer_file_path = asset_dir.replace("/" + mincer_path, "") + file;
    if(mincer_file_path.indexOf("/") == 0) {
      mincer_file_path = mincer_file_path.replace("/", "");
    }
    if(file.match(file_type) && !fs.lstatSync(file_full_path).isDirectory()) {
      var widget_asset = environment.findAsset(mincer_file_path);
      var source_data = _.reduce(widget_asset.dependencies, function(memo, file_content){ return memo + file_content; }, "");
      if(!copy_only) {
        var result = uglify.minify(source_data, {fromString: true});
        source_data = result.code;
      } 
      var widget_file = __dirname + '/../deploy/' + pkg_name + version + "/" + asset_dir + "/" + file;
      var stream = fs.createWriteStream(widget_file);
      stream.once('open', function(fd) {
        stream.write(license + source_data);
        stream.end();
        return callback();
      });
    } else {
      return callback();
    }
  }
}