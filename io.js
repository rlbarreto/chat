'use strict';

const debug = require('debug')('socket:server'),
      webToken = require('./token'),
      OnlineChatters = require('./models/onlineChatter'),
      ChatLog = require('./models/chatLog');

var ioConfig = function(server) {
  const io = require('socket.io')(server);
  var clients = {};

  io.on('connection', function onConnection(client) {
    client.auth = false;
    client.on('authenticate', function onAuthenticate(data) {
      if (data.token) {
        //jwt.decode(data.token, secret);
        client.userId = webToken.decode(data.token).userId;
        if (client.userId) {
          client.auth = true;
          debug('%s authenticated', client.userId);
        }
      }
    })
    client.on('join', function onJoin(nickname){
      if (!client.auth) {
        debug('%s need authentication', nickname);
        client.emit('error', 'Need authentication');
        return  client.disconnect();
      }
      clients[nickname] = client;
      client.nickname = nickname;
      client.broadcast.emit('notification', client.nickname + " has joined!");
      client.broadcast.emit("add chatter", client.nickname);

      OnlineChatters.find({}, function onInitFind(err, result) {
        if (err) throw err;

        result.forEach(function onlineChattersForEach(obj){
          debug('add %s as online chatter', obj.nickname);
          client.emit("add chatter", obj.nickname);
        });
      });

      OnlineChatters.findOne({nickname: nickname}).then(function isOnline(onlineChatter) {
        debug('finding out if user already online');
        debug(onlineChatter);
        if (!onlineChatter) {
          debug('%s user registered as online', nickname);
          var newChatter = new OnlineChatters({ nickname: nickname });

          newChatter.save(function(err) {
            if (err) throw err;
          });
        }
      });
    });

    client.on('chat_friend', function onNewChatRoom(friendNickname) {
      var friendClient = clients[friendNickname];
      if (!friendClient) {
        return client.emit('notification', friendNickname + ' is offline');
      }
      debug('%s chatting with %s', client.nickname, friendNickname)
      var roomName = client.nickname + '_' + friendNickname;
      if (friendNickname < client.nickname) {
        roomName = friendNickname + '_' + client.nickname;
      }
      client.join(roomName);
      friendClient.join(roomName);

      client.emit('new_room', roomName, friendNickname);
      client.broadcast.to(roomName).emit('new_room', roomName, client.nickname);

      ChatLog.find({}).populate('sender').sort({'timestamp': -1}).limit(10).exec()
      .then(function onChatLog(chatLogs) {
        for(var i = chatLogs.length-1; i >= 0; i--) {
          var chatLog = chatLogs[i];
          var sender = chatLog.sender.username === client.nickname ? 'me' : chatLog.sender.username;
          io.sockets.in(roomName).emit('message', {roomName: chatLog.roomName, from: sender, text: chatLog.message, old:true});
        }
      }).catch(function onChatLogFindError(err) {
        client.emit('notification', 'There was an error loading chat log');
      });
    });

    client.on('room_message', function onRoomMessage(roomMessage) {
      var chatLog = new ChatLog({
        timestamp: Date.now(),
        roomName: roomMessage.roomName,
        message: roomMessage.message,
        sender: client.userId
      });

      chatLog.save().then(function onChatLogSuccessSave() {
        client.broadcast.to(roomMessage.roomName).emit('message', {roomName: roomMessage.roomName, from: client.nickname, text: roomMessage.message});
        client.emit('message', {roomName: roomMessage.roomName, from: 'me', text: roomMessage.message});
      }).catch(function onSaveChatLog(err) {
        client.emit('notification', 'There was an error sending your message');
      });

    });
    client.on('disconnect', function onDisconnect(){
      debug('trying to disconnect');
      if(client.nickname !== null && typeof client.nickname !== 'undefined'){
        debug('Disconnect user %s', client.nickname);
        io.sockets.emit("remove chatter", client.nickname);
        OnlineChatters.findOneAndRemove({ nickname: client.nickname }, function(err) {
          if (err) throw err;
        });
      }

    });
  });
};

module.exports = ioConfig;
