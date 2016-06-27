angular
.module('chatroom', [])
.controller('mainController', ['$scope', '$http', '$window', '$timeout', function($scope, $http, $window, $timeout){
  var main = this;
  // first, establish the socket connection
  var server = io('http://localhost:3000'); // change this if you are hosting on a remote server

  // hide chatroom until the nickname is entered
  main.gotNickname = false;
  main.nickname = '';

  main.rooms = [];

  // on connect
  server.on('connect', function(data){

    $timeout(function(){  // temporary fix for angular
      document.getElementById('nickname').focus();
    }, 300);

    main.nicknameSubmitHandler = function () {
      if(main.nickname){
        if(main.nickname.trim() === ''){
          main.nickname = '';
          console.log('Please enter nickname.');
        } else {
          console.log('Got nickname: ' + main.nickname);
          server.emit('join', main.nickname);
          main.nicknames = [ {nickname: main.nickname} ];
          main.gotNickname = true;
        }
      } else {
        console.log('Please enter nickname.');
      }
    };

  });

  // on new chatter
  server.on('add chatter', function(nickname){
    console.log('Got add chatter request for ' + nickname);
    $scope.$apply(function () {
      main.nicknames.push({nickname: nickname});
    });
  });

  // on remove chatter
  server.on('remove chatter', function(nickname){
    if(nickname !== null && typeof nickname !== 'undefined'){
      console.log('Someone left: ' + nickname);

      console.log('main.nicknames', main.nicknames);

      for(var i=0, l=main.nicknames.length; i<l; i++){
        if(main.nicknames[i].nickname === nickname){
          $scope.$apply(function () {
            main.nicknames.splice(i,1);
          });
          break;
        }
      }
    }
  });

  main.submitHandler = function(room){
    //$event.preventDefault();

    //var chatLogDiv = document.getElementById("chatLog");
    //chatLogDiv.scrollTop = chatLogDiv.scrollHeight;

    server.emit('room_message', {roomName: room.name, message: room.chatInput } );

    main.chatInput = "";
  };

  main.newChatRoom = function (friend) {
    server.emit('chat_friend', friend.nickname);
  }

  server.on('message', function (message) {
    var room = findRoom(main.rooms, message.roomName);
    if (room) {
      $scope.$apply(function() {
        room.messages.push(message);
      });
    }
  })

  server.on('new_room', function (roomName) {
    var roomExists = findRoom(main.rooms, roomName);
    if (!roomExists) {
      $scope.$apply(function () {
        main.rooms.push({name: roomName, visible: false, messages: []});
      });
    }

  });


  $window.addEventListener("beforeunload", function (event) {
    return $window.confirm("Do you really want to close?");
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
