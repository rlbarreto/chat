(function () {
  angular
  .module('chat', ['LocalStorageModule'])
  .config(function (localStorageServiceProvider) {
    localStorageServiceProvider.setPrefix('chat');
  })
  .controller('MainController', ['dataSource', MainController])
  .controller('LoginController', ['$scope', '$http', 'dataSource', 'websocket', LoginController])
  .controller('RegisterController',['$scope', '$http', 'dataSource', 'websocket', RegisterController])
  .controller('ChatController', ['dataSource', 'websocket', ChatController])
  .service('dataSource', ['localStorageService', dataSourceService])
  .service('websocket', ['dataSource', webSocketService])
  .directive('notification', ['$timeout', notification]);

  function MainController(dataSource) {
    this.data = dataSource;
  }

  function LoginController($scope, $http, dataSource, websocket) {
    var loginCtrl = this;
    loginCtrl.data = dataSource;
    loginCtrl.data.friends = [];
    loginCtrl.username = '';
    loginCtrl.password = '';
    loginCtrl.login = login;

    loginCtrl.data.loadFromStorage();
    if (loginCtrl.data.token) {
      websocket.connect($scope, loginCtrl.data.username, loginCtrl.data.token);
    }

    function login(username, password) {
      if(username){
        $http.post('http://localhost:3000/api/login', {username, password})
        .then(function loginSuccess(response) {

          loginCtrl.data.me = username;
          loginCtrl.data.username = username;
          loginCtrl.data.token = response.data.token;
          loginCtrl.data.clearNotification();
          loginCtrl.data.saveToStorage();
          websocket.connect($scope, username, response.data.token);
        }, function loginFail(response) {
          loginCtrl.data.notifyError('Error trying to authenticate user');
        });
      } else {
        loginCtrl.data.notifyError('Username must be informed');
      }
    }
  }

  function RegisterController($scope, $http, dataSource, websocket) {
    var registerCtrl = this;
    registerCtrl.data = dataSource;
    registerCtrl.register = register;

    function register(username, password, repassword) {
      if (username) {
        if (password !== repassword) return registerCtrl.data.notifyError('Password not equal');
        $http.post('http://localhost:3000/api/register', {username, password})
        .then(function registerSuccess(response) {
          registerCtrl.data.register = false;
          websocket.connect($scope, username, response.data.token);
        }, function registerFail(response) {
          registerCtrl.data.notifyError(reponse.data);
        })

      }
    }
  }

  function ChatController(dataSource, websocket) {
    this.data = dataSource;
    this.data.selectedFriend = undefined;
    this.newChatRoom = newChatRoom;
    this.sendMessage = sendMessage;
    this.logoff = logoff;

    function logoff() {
      dataSource.logoff();
    }

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

  function dataSourceService(localStorageService) {
    return {
      authenticated: false,
      register: false,
      notification: {
        message: undefined,
        type: undefined,
        status: undefined
      },
      username: '',
      friends: [],
      rooms: [],
      webSocket: undefined,
      setAuthentcated: setAuthentcated,
      addFriend: addFriend,
      logoff: logoff,
      notifyError: notifyError,
      clearNotification: clearNotification,
      saveToStorage: saveToStorage,
      loadFromStorage: loadFromStorage
    }

    function loadFromStorage() {
      var data = localStorageService.get('data') || {};
      var now = new Date();
      if (data.username) {
        this.username = data.username;
        this.authenticated = true;
        this.register = false;
        this.token = data.token;
      }
    }

    function saveToStorage() {
      localStorageService.set('data', {
        username: this.username,
        friends: this.friends,
        rooms: this.rooms,
        token: this.token,
        when: new Date()
      });
    }

    function clearNotification() {
      this.notification = {
        message: undefined,
        type: undefined,
        status: undefined
      };
    }

    function notifyError(message) {
      this.notification.message = message;
      this.notification.type = 'danger';
      this.notification.status = 'show';
    }

    function setAuthentcated(username) {
      this.authenticated = true;
      this.username = username;
    }

    function addFriend(friend) {
      function findFriendInList(element, index, array) {
        return element.name === friend.name;
      }

      if (this.me !== friend.name && !this.friends.find(findFriendInList)) {
        this.friends.push(friend);
      }
    }

    function logoff() {
      this.webSocket.disconnect();
      this.authenticated = false;
      this.friends = [];
    }
  }

  function webSocketService(dataSource) {
    return {
      connect: connect,
      disconnect: disconnect,
      chatWithFriend: chatWithFriend
    };

    function disconnect() {
      dataSource.webSocket.emit('disconnect', dataSource.username);
      dataSource.webSocket.disconnect();
    }

    function connect($scope, username, token) {
      server = io();
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
        window.onbeforeunload = function onBeforeUnload(e) {
          server.disconnect();
        };
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
          var friend = findFriend(dataSource.friends, nickname);
          var index = dataSource.friends.indexOf(friend);
          if (index >= 0) {
            $scope.$apply(function () {
              dataSource.friends.splice(index,1);
            });
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

  function notification($timeout) {
    return {
      restrict: 'E',
      template:"<div class='alert alert-{{alertData.type}}' ng-show='alertData.message' role='alert' data-notification='{{alertData.status}}'>{{alertData.message}}</div>",
      scope:{
        alertData:"="
      },
      replace:true,
      link: function notificationLink(scope, element, attrs) {
        var timer;
        scope.$watch('alertData.message', function (newValue) {
          if(newValue) {
            if (timer) {
              $timeout.cancel(timer);
            }
            timer = $timeout(function onTimeout() {
              scope.alertData.message='';
            }, scope.alertData.timeout || 3000);
          }
        });

        scope.$on(
          "$destroy",
          function( event ) {
            $timeout.cancel( timer );
          }
          );

      }
    };
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
