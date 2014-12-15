
var config = require('./config')
  , mongoose = require('mongoose')
  , LocalStrategy = require('passport-local').Strategy
  , TwitterStrategy = require('passport-twitter').Strategy
  , FacebookStrategy = require('passport-facebook').Strategy
  , GitHubStrategy = require('passport-github').Strategy
  , GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
  , Actor = mongoose.model('Actor')


module.exports = function (passport) {
  // require('./initializer')

  // serialize sessions
  passport.serializeUser(function(user, done) {
      console.log("serializeUser!!!");
    done(null, user.id)
  })

  passport.deserializeUser(function(id, done) {
      console.log("deserializeUser!!!");
    Actor.findOne({ _id: id }, function (err, user) {
      done(err, user)
    })
  })

  // use local strategy
  passport.use(new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    },
    function(email, password, done) {
      console.log("LocalStrategy!!!");
      Actor.findOne({ email: email }, function (err, actor) {
        
      console.log("actor:!!!");
        if (err) { return done(err) }
        if (!actor) {
          return done(null, false, { message: 'Your email does not exist' });
        }
        if(actor.state == Actor.INVITED) {
          return done(null, false, { message: 'Please check your email for invivation instructions.' });
        }
        if(actor.state == Actor.REGISTERED) {
          return done(null, false, { message: "Thank you for your interest. We will get back to you as soon as possible by email." });
        }
        if(actor.state == Actor.DEACTIVATED) {
          return done(null, false, { message: "Your account seems to be disabled. Please check with the site administrator." });
        }
        if(actor.state != Actor.ACTIVE) {
          return done(null, false, { message: 'Unknown user' });
        }
        if (!actor.authenticate(password)) {
          return done(null, false, { message: 'Invalid password' });
        }
        return done(null, actor);
      })
    }
  ))

  // use twitter strategy
  passport.use(new TwitterStrategy({
      consumerKey: config.twitter.clientID,
      consumerSecret: config.twitter.clientSecret,
      callbackURL: config.twitter.callbackURL
    },
    function(token, tokenSecret, profile, done) {
      Actor.findOne({ 'twitter.id': profile.id }, function (err, user) {
        if (err) { return done(err) }
        if (!user) {
          user = new Actor({
            name: profile.displayName,
            username: profile.username,
            provider: 'twitter',
            twitter: profile._json
          })
          user.save(function (err) {
            if (err) console.log(err)
            return done(err, user)
          })
        }
        else {
          return done(err, user)
        }
      })
    }
  ))

  // use facebook strategy
  passport.use(new FacebookStrategy({
      clientID: config.facebook.clientID,
      clientSecret: config.facebook.clientSecret,
      callbackURL: config.facebook.callbackURL
    },
    function(accessToken, refreshToken, profile, done) {
      Actor.findOne({ 'facebook.id': profile.id }, function (err, user) {
        if (err) { return done(err) }
        if (!user) {
          user = new Actor({
            name: profile.displayName,
            email: profile.emails[0].value,
            username: profile.username,
            provider: 'facebook',
            facebook: profile._json
          })
          user.save(function (err) {
            if (err) console.log(err)
            return done(err, user)
          })
        }
        else {
          return done(err, user)
        }
      })
    }
  ))

  // use github strategy
  passport.use(new GitHubStrategy({
      clientID: config.github.clientID,
      clientSecret: config.github.clientSecret,
      callbackURL: config.github.callbackURL
    },
    function(accessToken, refreshToken, profile, done) {
      Actor.findOne({ 'github.id': profile.id }, function (err, user) {
        if (!user) {
          user = new Actor({
            name: profile.displayName,
            email: profile.emails[0].value,
            username: profile.username,
            provider: 'github',
            github: profile._json
          })
          user.save(function (err) {
            if (err) console.log(err)
            return done(err, user)
          })
        } else {
          return done(err, user)
        }
      })
    }
  ))

  // use google strategy
  passport.use(new GoogleStrategy({
      clientID: config.google.clientID,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackURL
    },
    function(accessToken, refreshToken, profile, done) {
      Actor.findOne({ 'google.id': profile.id }, function (err, user) {
        if (!user) {
          user = new Actor({
            name: profile.displayName,
            email: profile.emails[0].value,
            username: profile.username,
            provider: 'google',
            google: profile._json
          })
          user.save(function (err) {
            if (err) console.log(err)
            return done(err, user)
          })
        } else {
          return done(err, user)
        }
      })
    }
  ));
}
