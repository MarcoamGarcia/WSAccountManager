/* GET Hello World page. */
exports.helloworld = function(req, res, next) {
    res.render('helloworld', { title: 'Hello, World!' })
}