const mongoose = require('mongoose'),
      Schema = mongoose.Schema,
      ChatLog = new Schema({
        timestamp: {
          type: String,
          required: true,
          unique: true
        },
        roomName: String,
        sender: {type: mongoose.Schema.Types.ObjectId, ref: 'Account'},
        message: String
      });

module.exports = mongoose.model('ChatLog', ChatLog);
