const express = require('express');
const passport = require('passport');
const moment = require('moment');
const Account = require('../models/account');
const router = express.Router();
const webToken = require('../token');

router.get('/', function(req, res, next) {
  res.render('index');
});

router.post('/api/register', function(req, res) {
  console.log('register');
  Account.register(new Account({ username : req.body.username }), req.body.password, function(err, account) {
    if (err) {
      return res.status(500).json({message: 'error on authentication', err: err});
    }
    passport.authenticate('local')(req, res, function () {
      res.json({ token : webToken.encode({ userId: account._id, validUntil: moment().add(30, 'minutes').format()}) });
    });

  });
});

router.post('/api/login',
  passport.authenticate('local', {session: false}),
  function(req, res) {
    var token = webToken.encode({ userId: req.user._id, validUntil: moment().add(30, 'minutes').format()});
    res.json({ token : token });
  }
);



module.exports = router;
