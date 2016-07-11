const mongoose = require('mongoose'),
      Schema = mongoose.Schema;
      OnlineChatter = new Schema({
        email: String,
        nickname: String
      });

module.exports = mongoose.model('OnlineChatter', OnlineChatter);
