var express = require('express');
var router = express.Router();

var helloworld = require('../controllers/helloworld')
    , user = require('../controllers/user');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index');
});

/* GET Hello World page. */
router.get('/helloworld', helloworld.helloworld);

/* GET Userlist page. */
router.get('/userlist', user.userList);
/* GET New User page. */
router.get('/newuser', user.newUser);
/* POST to Add User Service */
router.post('/adduser', user.addUser);

router.get('/user/:id', user.userInfo);

module.exports = router;