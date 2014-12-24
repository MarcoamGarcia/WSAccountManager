module.exports = {
  development: {
    host: "localhost",
    port: 3000,
    secure_port: 4430,
    mongo: {
        db: {
            host: 'localhost',
            port: 27017,
            db: 'wsam_app',
            username: 'wsam_app_user',
            password: 'wsam_app_dvkdn'
        },
        secret: 'qwedcvfr'
    },
    analytics: true,
    transport: {
      service: '',
      auth: {
        user: '',
        pass: ''
      }
    },
    sender_email: ''
  },
  test: {
  },
  production: {}
}
