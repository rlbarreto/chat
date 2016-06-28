const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var ChatLog = new Schema({
  timestamp: {
    type: String,
        required: true,
        unique: true
  },
  roomName: String,
  chatUsers: [{ type : mongoose.Types.ObjectId, ref: 'Account' }],
  message: String
});

module.exports = mongoose.model('ChatLog', ChatLog);
