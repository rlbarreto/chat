const express = require('express');
const passport = require('passport');
const jwt = require('jwt-simple');
const moment = require('moment');
const Account = require('../models/account');
const router = express.Router();


const tokenSecret = 'trycatch';
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.post('/api/register', function(req, res) {
    Account.register(new Account({ username : req.body.username }), req.body.password, function(err, account) {
        if (err) {
            return res.status(500).json({message: 'error on authentication', err: err});
        }
        passport.authenticate('local')(req, res, function () {
          var token = jwt.encode({ userId: account._id, validUntil: moment().add(30, 'minutes').format()}, tokenSecret);
          res.json({ token : token });
        });

    });
});

router.post('/api/login',
  passport.authenticate('local', {session: false}),
  function(req, res) {
    var token = jwt.encode({ userId: req.user._id, validUntil: moment().add(30, 'minutes').format()}, tokenSecret);
    res.json({ token : token });
  }
);



module.exports = router;
