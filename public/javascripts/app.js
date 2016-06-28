angular
.module('chatroom', [])
.controller('mainController', ['$scope', '$http', '$window', '$timeout', function($scope, $http, $window, $timeout){
  var main = this;
  // first, establish the socket connection
  var server = io('http://localhost:3000'); // change this if you are hosting on a remote server

  // hide chatroom until the nickname is entered
  main.gotNickname = false;
  main.nickname = '';
  main.nicknames = [];

  main.rooms = [];

  // on connect
  server.on('connect', function(data){
    $scope.$apply(function () {
      main.ready = true;
    });

  });

  main.nicknameSubmitHandler = function (username, password) {
    if(username){
      console.log('Got nickname: ' + username);
      $http.post('http://localhost:3000/api/login', {username, password})
      .then(function (response) {
        server.emit('authenticate', {token: response.data.token});
        server.emit('join', username);
        main.gotNickname = true;
      }, function (response) {
        console.log(data);
      });
    } else {
      console.log('Please enter nickname.');
    }
  };

  // on new chatter
  server.on('add chatter', function(nickname){
    console.log('Got add chatter request for ' + nickname);
    $scope.$apply(function () {
      if (main.nicknames.indexOf(nickname) < 0) {
        main.nicknames.push(nickname);
      }
    });
  });

  // on remove chatter
  server.on('remove chatter', function(nickname){
    if(nickname !== null && typeof nickname !== 'undefined'){
      console.log('Someone left: ' + nickname);

      console.log('main.nicknames', main.nicknames);

      for(var i=0, l=main.nicknames.length; i<l; i++){
        if(main.nicknames[i] === nickname){
          $scope.$apply(function () {
            main.nicknames.splice(i,1);
          });
          break;
        }
      }
    }
  });

  main.submitHandler = function(room){
    server.emit('room_message', {roomName: room.name, message: room.chatInput } );
    room.chatInput = '';
  };

  main.newChatRoom = function (nickname) {
    server.emit('chat_friend', nickname);
  }

  server.on('message', function (message) {
    var room = findRoom(main.rooms, message.roomName);
    if (room) {
      $scope.$apply(function() {
        room.messages.unshift(message);
      });
    }
  });

  server.on('new_room', function (roomName) {
    var roomExists = findRoom(main.rooms, roomName);
    if (!roomExists) {
      $scope.$apply(function () {
        main.rooms.push({name: roomName, visible: false, messages: []});
      });
    }
  });


  $window.addEventListener("beforeunload", function (event) {
    if (main.nickname) {
      server.emit('disconnect', main.nickname);
    }
  });

}]);

function findRoom(rooms, roomName) {
  for (var i = 0, length = rooms.length; i < length; i++) {
    var room = rooms[i];
    if (room.name === roomName) {
      return room;
    }
  }
}
