var dbUrl = 'wsam';
var collections = ['users'];

var db = require("mongojs").connect(dbUrl, collections);

module.exports =db;