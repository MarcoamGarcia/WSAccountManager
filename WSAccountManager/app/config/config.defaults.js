/*
    To correctly use Cube the "collector-config,js" and "evaluator-config.js" have to be configured.
    -First of all you have to have MongoDB correctly installed. Then you have to know 
    the host and the port of your MongoDB, if it is by default the host should be 127.0.0.1
    and the port should be 27017.
    -The next step is to configure access to database. Edit the "mongo-database" field with
    your database name. If your database does not have authentication you do not have to 
    change the "mongo-username" and "mongo-password", but if you have just edit it with
    the credentials.
    -The "http-port" and "udp-port" are the ports where "collector" and "evaluator" are
    lestening.
*/
var path = require('path')
  , rootPath = path.normalize(__dirname + '/../..')

module.exports = {
    host: "localhost",
    update_host: true,
    default_mount_url: '/helppier',
    buildDir: 'public/assets',
    servePath: "/helppier/assets", // dont set the serve path in the 'default_mount_url' to avoid 405 http errors with post requests.
    port: 3000,
    secure_port: 4430,
    app_port: 3000,
    log_level: "debug",
    mongo: {
        db: {
            host: "localhost",
            port: 27017
        }
    },
    collector: {
        http_port: 1080,
        udp_port: 1180
    },
    evaluator: {
        http_port: 1081
    },
    log_level: 'debug',
    root: rootPath,
    app: {
      name: 'Helppier'
    },
    facebook: {
      clientID: "APP_ID",
      clientSecret: "APP_SECRET",
      callbackURL: "http://localhost:3000/auth/facebook/callback"
    },
    twitter: {
      clientID: "CONSUMER_KEY",
      clientSecret: "CONSUMER_SECRET",
      callbackURL: "http://localhost:3000/auth/twitter/callback"
    },
    github: {
      clientID: 'APP_ID',
      clientSecret: 'APP_SECRET',
      callbackURL: 'http://localhost:3000/auth/github/callback'
    },
    google: {
      clientID: "APP_ID",
      clientSecret: "APP_SECRET",
      callbackURL: "http://localhost:3000/auth/google/callback"
    }
}