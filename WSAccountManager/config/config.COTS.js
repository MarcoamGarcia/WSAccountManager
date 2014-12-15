module.exports = {
  development: {
    host: "localhost",
    port: 3000,
    secure_port: 4430,
    key: "PLEASE SPECIFY KEY LOCATION",
    cert: "PLEASE SPECIFY CERTIFICATION LOCATION",
    analytics: false,
    transport: {
      service: 'PLEASE SPECIFY SERVICE',
      auth: {
        user: 'PLEASE SPECIFY EMAIL USER',
        pass: 'PLEASE SPECIFY EMAIL PASSWORD'
      }
    },
    mongo: {
        db: {
            host: 'localhost',
            username: 'PLEASE SPECIFY DB USERNAME',
            password: 'PLEASE SPECIFY DB PASSWORD',
            port: 27017,
            db: 'PLEASE SPECIFY DB NAME'
        }
    }
  }
}
