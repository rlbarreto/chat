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
        return client.emit('error', 'Need authentication');
      }
      clients[nickname] = client;
      client.nickname = nickname;
      client.broadcast.emit('notification', client.nickname + " has joined!");
      io.sockets.emit("add chatter", client.nickname);
      console.log('Broadcasted to all clients, except the new one.');

      OnlineChatters.find({}, function(err, result) {
        if (err) throw err;
        console.log('all chatters:', result);

        result.forEach(function(obj){
          client.emit("add chatter", obj.nickname);
          console.log('emitted ' + obj.nickname);
        });
      });

      var newChatter = new OnlineChatters({ nickname: nickname });

      newChatter.save(function(err) {
        if (err) throw err;
        console.log('newChatter saved successfully!');
      });

    });

    client.on('chat_friend', function(friendNickname) {
      console.log('chat_friend', friendNickname);
      var friendClient = clients[friendNickname];
      console.log(friendNickname);
      if (!friendClient) {
        return client.emit('notification', friendNickname + ' is offline');
      }

      var roomName = client.nickname + '_' + friendNickname;
      if (friendNickname < client.nickname) {
        roomName = friendNickname + '_' + client.nickname;
      }
      client.join(roomName);
      friendClient.join(roomName);

      client.emit('new_room', roomName);
      client.broadcast.to(roomName).emit('new_room', roomName);

      ChatLog.find({}).populate('sender').sort({'timestamp': -1}).limit(10).exec()
      .then(function(chatLogs) {
        console.log('carregou', chatLogs);
        for(var i = chatLogs.length-1; i >= 0; i--) {
          var chatLog = chatLogs[i];
          io.sockets.in(roomName).emit('message', {roomName: chatLog.roomName, from: chatLog.sender.username, text: chatLog.message});
        }
      });
    });

    client.on('room_message', function (roomMessage) {
      console.log('broadcast', {roomName: roomMessage.roomName, text: roomMessage.message});
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

    client.on('disconnect', function(nickname){

      console.log('in disconnect: ', nickname);

      if(client.nickname !== null && typeof client.nickname !== 'undefined'){
        client.broadcast.emit("remove chatter", client.nickname);

            //saveChatLog(undefined, newMessage);  // undefined because message strcture is different, it is system generated, no need to save nickname

            // remove from database
            OnlineChatters.findOneAndRemove({ nickname: client.nickname }, function(err) {
              if (err) throw err;
              console.log(client.nickname + ' deleted!');
            });
          }
        });
  });
}
