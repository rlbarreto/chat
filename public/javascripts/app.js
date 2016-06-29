(function () {
  angular
  .module('chat', [])
  .controller('MainController', ['dataSource', MainController])
  .controller('LoginController', ['$scope', '$http', 'dataSource', 'websocket', LoginController])
  .controller('RegisterController',['$scope', '$http', 'dataSource', 'websocket', RegisterController])
  .controller('ChatController', ['dataSource', ChatController])
  .service('dataSource', [dataSourceService])
  .service('websocket', ['dataSource', webSocketService]);

  function MainController(dataSource) {
    this.data = dataSource;
  }

  function LoginController($scope, $http, dataSource, websocket) {
    var loginCtrl = this;
    loginCtrl.data = dataSource;
    loginCtrl.username = '';
    loginCtrl.password = '';

    loginCtrl.login = login;

    function login(username, password) {
      if(username){
        $http.post('http://localhost:3000/api/login', {username, password})
        .then(function loginSuccess(response) {
          websocket.connect($scope, username, response.data.token);
        }, function loginFail(response) {
          alert('Error trying to authenticate user');
        });
      } else {
        alert('Username must be informed');
      }
    }
  }

  function RegisterController($scope, $http, dataSource, websocket) {
    var registerCtrl = this;
    registerCtrl.data = dataSource;
    registerCtrl.register = register;

    function register(username, password, repassword) {
      if (username) {
        if (password !== repassword) return alert('Password not equal');
        $http.post('http://localhost:3000/api/register', {username, password})
        .then(function registerSuccess(response) {
          registerCtrl.data.register = false;
          websocket.connect($scope, username, response.data.token);
        }, function registerFail(response) {
          alert(reponse.data);
        })

      }
    }
  }

  function ChatController(dataSource) {
    this.data = dataSource;
    this.data.selectedFriend = undefined;
    this.newChatRoom = newChatRoom;
    this.sendMessage = sendMessage;

    function newChatRoom(friend, previeusSelected) {
      if (previeusSelected) previeusSelected.selected = false;
      friend.selected = true;
      friend.newMessage = false
      dataSource.selectedFriend = friend;
      if (!friend.room) {
        server.emit('chat_friend', friend.name);
      }
    }

    function sendMessage(friend) {
      var room = friend.room;
      server.emit('room_message', {roomName: room.name, message: room.chatInput } );
      room.chatInput = '';
    }
  }

  function dataSourceService() {
    return {
      authenticated: false,
      register: false,
      username: '',
      friends: [],
      rooms: [],
      webSocket: undefined,
      setAuthentcated: function(username) {
        this.authenticated = true;
        this.username = username;
      },
      addFriend: function(friendName) {
        if (this.friends.indexOf(friendName) < 0) {
          this.friends.push(friendName);
        }
      }
    }
  }

  function webSocketService(dataSource) {
    return {
      connect: connect,
      chatWithFriend: chatWithFriend
    };

    function connect($scope, username, token) {
      server = io('http://localhost:3000');
      server.on('connect', function(data) {
        server.emit('authenticate', {token: token});
        server.emit('join', username);
        $scope.$apply(function() {
          dataSource.setAuthentcated(username);
        });
        configAddChatter($scope);
        configRemoveChatter($scope);
        configNewChatRoom($scope);
        configOnMessage($scope);
      });
      dataSource.webSocket = server;
    }

    function configAddChatter($scope) {
      dataSource.webSocket.on('add chatter', function(nickname) {
        $scope.$apply(function() {
          dataSource.addFriend({name: nickname});
        });
      });
    }

    function configRemoveChatter($scope) {
      dataSource.webSocket.on('remove chatter', function(nickname){
        if(nickname !== null && typeof nickname !== 'undefined'){
          for(var i=0, l=dataSource.friends.length; i<l; i++){
            if(dataSource.friends[i] === nickname){
              $scope.$apply(function () {
                dataSource.friends.splice(i,1);
              });
              break;
            }
          }
        }
      });
    }

    function configOnMessage($scope) {
      dataSource.webSocket.on('message', function (message) {
        var room = findRoom(dataSource.rooms, message.roomName);
        if (room) {
          $scope.$apply(function() {
            if (!message.old) {
              room.friend.newMessage = message.from !== 'me';
            }
            room.messages.unshift(message);
          });
        }
      });
    }


    function chatWithFriend(friend) {
      dataSource.webSocket.emit('chat_friend', friend.name);
    }

    function configNewChatRoom($scope) {
      dataSource.webSocket.on('new_room', function (roomName, friendName) {
        var friend = findFriend(dataSource.friends, friendName);
        if (friend && !friend.room) {
          $scope.$apply(function () {
            friend.room = {name: roomName, messages: [], friend: friend};
            dataSource.rooms.push(friend.room);
          });
        }
      });
    }

  }

  function findFriend(friends, friendName) {
    for (var i = 0, length = friends.length; i < length; i++) {
      var friend = friends[i];
      if (friend.name === friendName) {
        return friend;
      }
    }
  }

  function findRoom(rooms, roomName) {
    for (var i = 0, length = rooms.length; i < length; i++) {
      var room = rooms[i];
      if (room.name === roomName) {
        return room;
      }
    }
  }
})();
