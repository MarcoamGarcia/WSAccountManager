var dbUrl = 'wsam';
var collections = ['users', 'clients'];

var db = require("mongojs").connect(dbUrl, collections);

module.exports =db;