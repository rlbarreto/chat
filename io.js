'use strict';

const webToken = require('./token');
const OnlineChatters = require('./models/onlineChatter');
const ChatLog = require('./models/chatLog');

module.exports = function(server) {
  const io = require('socket.io')(server);

  var clients = {};

  io.on('connection', function (client) {
    client.auth = false;
    client.on('authenticate', function (data) {

      if (data.token) {
        //jwt.decode(data.token, secret);
        client.userId = webToken.decode(data.token).userId;
        if (client.userId) {
          client.auth = true;

        }
      }
    })
    client.on('join', function(nickname){
      if (!client.auth) {
        client.emit('error', 'Need authentication');
        return  client.disconnect();
      }
      clients[nickname] = client;
      client.nickname = nickname;
      client.broadcast.emit('notification', client.nickname + " has joined!");
      client.broadcast.emit("add chatter", client.nickname);

      OnlineChatters.find({}, function(err, result) {
        if (err) throw err;

        result.forEach(function(obj){
          client.emit("add chatter", obj.nickname);
        });
      });

      var newChatter = new OnlineChatters({ nickname: nickname });

      newChatter.save(function(err) {
        if (err) throw err;
      });

    });

    client.on('chat_friend', function(friendNickname) {
      var friendClient = clients[friendNickname];
      if (!friendClient) {
        return client.emit('notification', friendNickname + ' is offline');
      }

      var roomName = client.nickname + '_' + friendNickname;
      if (friendNickname < client.nickname) {
        roomName = friendNickname + '_' + client.nickname;
      }
      client.join(roomName);
      friendClient.join(roomName);

      client.emit('new_room', roomName, friendNickname);
      client.broadcast.to(roomName).emit('new_room', roomName, client.nickname);

      ChatLog.find({}).populate('sender').sort({'timestamp': -1}).limit(10).exec()
      .then(function(chatLogs) {
        for(var i = chatLogs.length-1; i >= 0; i--) {
          var chatLog = chatLogs[i];
          var sender = chatLog.sender.username === client.nickname ? 'me' : chatLog.sender.username;
          io.sockets.in(roomName).emit('message', {roomName: chatLog.roomName, from: sender, text: chatLog.message, old:true});
        }
      });
    });

    client.on('room_message', function (roomMessage) {
      var chatLog = new ChatLog({
        timestamp: Date.now(),
        roomName: roomMessage.roomName,
        message: roomMessage.message,
        sender: client.userId
      });

      chatLog.save(function(err) {
        if (err) throw err;
        client.broadcast.to(roomMessage.roomName).emit('message', {roomName: roomMessage.roomName, from: client.nickname, text: roomMessage.message});
        client.emit('message', {roomName: roomMessage.roomName, from: 'me', text: roomMessage.message});
      });


    });

    client.on('disconnect', function(){
      if(client.nickname !== null && typeof client.nickname !== 'undefined'){
        io.sockets.emit("remove chatter", client.nickname);
        OnlineChatters.findOneAndRemove({ nickname: client.nickname }, function(err) {
          if (err) throw err;
        });
      }
    });
  });
}
