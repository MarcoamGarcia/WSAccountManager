/* GET New User page. */
exports.newClient = function(req, res, next) {
    res.render('newclient', { title: 'Add New Client' });
}

/* GET Userlist page. */
exports.clientList = function(req, res, next) {
    var db = req.db;
    db.clients.find(function(err, docs) {
        res.json(docs);
    });
}