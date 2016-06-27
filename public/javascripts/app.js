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

          $timeout(function(){  // temporary fix for angular
            document.getElementById('chatInput').focus();
          }, 300);
        }
      } else {
        console.log('Please enter nickname.');
      }
    };

  });

  // on new chatter
  server.on('add chatter', function(nickname){
    console.log('Got add chatter request for ' + nickname);

    main.nicknames.push({nickname: nickname});
    $scope.$apply();
  });

  // on remove chatter
  server.on('remove chatter', function(nickname){
    if(nickname !== null && typeof nickname !== 'undefined'){
      console.log('Someone left: ' + nickname);

      console.log('main.nicknames', main.nicknames);

      for(var i=0, l=main.nicknames.length; i<l; i++){
        if(main.nicknames[i].nickname === nickname){
          main.nicknames.splice(i,1);
          $scope.$apply();
          break;
        }
      }
    }
  });

  server.on('messages', function(message) {
    if(/null/.test(message) === true || /undefined/.test(message) === true){ // temporary fix
      return false;
    }

    angular.element(document.querySelector('#chatLog')).append("<p>" + message + "</p>");
    var chatLogDiv = document.getElementById("chatLog");
    chatLogDiv.scrollTop = chatLogDiv.scrollHeight - chatLogDiv.clientHeight;
  });

  main.submitHandler = function($event){
    $event.preventDefault();

    angular.element(document.querySelector('#chatLog')).append("<p class='italic'><strong>Me: </strong>" + main.chatInput + "</p>");

    var chatLogDiv = document.getElementById("chatLog");
    chatLogDiv.scrollTop = chatLogDiv.scrollHeight;

    server.emit("messages", main.chatInput);

    main.chatInput = "";
  };

  main.newChatRoom = function (friend) {
    server.emit('chat_friend', friend.nickname);
  }

  server.on('new_room', function (roomName) {
    if (main.rooms.indexOf(roomName) < 0) {
      $scope.$apply(function () {
        main.rooms.push({name: roomName, visible: false});
      });
    }
  });

  $window.addEventListener("beforeunload", function (event) {
    return $window.confirm("Do you really want to close?");
  });

}]);
