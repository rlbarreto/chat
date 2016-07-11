const mongoose = require('mongoose'),
      Schema = mongoose.Schema,
      passportLocalMongoose = require('passport-local-mongoose'),
      Account = new Schema({
        email: String,
        session: false
      });

Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', Account);
