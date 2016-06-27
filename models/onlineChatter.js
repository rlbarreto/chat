const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OnlineChatter = new Schema({
  email: String,
  nickname: String
});

module.exports = mongoose.model('OnlineChatter', OnlineChatter);
