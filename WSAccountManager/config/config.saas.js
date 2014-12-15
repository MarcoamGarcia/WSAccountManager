module.exports = {
  development: {
    host: "localhost",
    port: 3000,
    secure_port: 4430,
    mongo: {
        db: {
            host: 'localhost',
            port: 27017,
            db: 'help_app',
            username: 'help_app_user',
            password: 'help_app_hwe3py'
        },
        secret: 'qwedcvfr'
    },
    analytics: true,
    transport: {
      service: 'SendGrid',
      auth: {
        user: 'admin@helppier.com',
        pass: 'Help34pieradm'
      }
    },
    sender_email: 'Helppier <admin@helppier.com>'
  },
  test: {
  },
  production: {}
}
