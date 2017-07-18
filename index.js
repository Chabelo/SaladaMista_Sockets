var Dict = require("collections/dict");
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require("fs");

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

var rooms = new Dict({}, function (key) {
				 return "default: " + key;
				 });

function randexec(probas) {
	var ar = [];
	var i,sum = 0;
	
	for (i=0 ; i<probas.length-1 ; i++) // notice the '-1'
	{
		sum += (probas[i] / 100.0);
		ar[i] = sum;
	}
	
	
  // Then we get a random number and finds where it sits inside the probabilities
  // defined earlier
	
	var r = Math.random(); // returns [0,1]
	
	console.log('ar ' + ar);
	for (i=0 ; i<ar.length && r>=ar[i] ; i++) ;
	
  // Finally execute the function and return its result
	return i;
}


function setRoomOperation(roomId, operation) {
	var room = JSON.parse(rooms.get(roomId));
	rooms.set(roomId, "{\"operation\": " + operation + ", \"masterId\": \""+ room.masterId + "\"}");
}

io.on('connection', function(socket) {
    console.log('one user connected ' + socket.id);

	function setResult(method, message, data) {
	  console.log('result to return: ' + JSON.stringify({ method: method, message: message, data: data }));
        return JSON.stringify({ method: method, message: message, data: data });
    };

    socket.on('create room', function (roomId) {

        if (roomId !== undefined) {
			console.log('room created with id ' + roomId);
			rooms.add("{\"operation\": 0, \"masterId\": \""+ socket.id + "\"}", roomId);
			
            socket.join(roomId);
            io.sockets.in(roomId).emit('result', setResult("create-room", 'Sala criada - ' + roomId, null));
        }
    });

    socket.on('join room', function (json) {
        var data = JSON.parse(json);
        if (data !== undefined && data.roomId !== undefined) {
			console.log('user ' + socket.id + ' entered room with id ' + data.roomId + ', with probability ' + rooms.get(data.roomId));
            socket.join(data.roomId);
            io.sockets.in(data.roomId).emit('result', setResult("join-room", data.user.userName + ' entrou na sala', JSON.stringify(data.user)));
        }
    });

    socket.on("leave room", function (json) {

        var data = JSON.parse(json);
        if (data !== undefined && data.roomId !== undefined && data.user !== undefined) {
			  var room = JSON.parse(rooms.get(data.roomId));
			if (socket.id == room.masterId) {
			  console.log('room ' + data.roomId + ' deleted from list');
			  rooms.delete(data.roomId);
			}
			  
            socket.leave(data.roomId);
            io.sockets.in(data.roomId).emit('result', setResult("leave-room", data.user.userName + ' saiu da sala', JSON.stringify(data.user)));
        }
    });

    socket.on('start round', function (roomId) {

        if (roomId !== undefined) {
			setTimeout(function () {
				var room = JSON.parse(rooms.get(roomId));
				var probas = [];
					   
				switch (room.operation) {
					case 0:
					   probas = [0, 50, 30, 20];
					   break;
					case 1:
					   probas = [100, 0, 0, 0];
					   break;
					case 2:
					   probas = [100, 0, 0, 0];
					   break;
					case 3:
					   probas = [0, 70, 20, 10];
					   break;
					case 4:
					   probas = [0, 50, 30, 20];
					   break;
				}
				var fruit = randexec(probas);
				
				console.log('sorted fruit ' + fruit + ' in room with id ' + roomId);
					   
				io.sockets.in(roomId).emit('result', setResult("send-message", "selectedFruit: " + fruit, null));
				setRoomOperation(roomId, 0);
			}, 12000);
            io.sockets.in(roomId).emit('result', setResult("start-round", 'Rodada iniciada', null));
        }
    });

    socket.on("chosen players", function (json) {

        var data = JSON.parse(json);
        if (data !== undefined && data.roomId !== undefined && data.users !== undefined) {
            io.sockets.in(data.roomId).emit('result', setResult("chosen-players", '', JSON.stringify(data.users)));
        }
    });

    socket.on("exit round", function (roomId) {

        if (roomId !== undefined)
            io.sockets.in(roomId).emit('result', setResult("exit-round", 'Saiu da rodada', null));
    });

    socket.on("get players list", function (masterSocketId) {

        if (masterSocketId !== undefined)
            socket.to(masterSocketId).emit('result', setResult("get-players-list", null, null));
    });

    socket.on("send players list", function (json) {

        var data = JSON.parse(json);
        if (data !== undefined && data.roomId !== undefined && data.users !== undefined) {
            io.sockets.in(data.roomId).emit('result', setResult("send-players-list", '', JSON.stringify(data.users)));
        }
    });

    socket.on('send message', function (json) {
			  
		var data = JSON.parse(json);
			  
		console.log('message ' + data);
		if (data !== undefined && data.roomId !== undefined) {
			console.log('message received ' + data.message);
			io.sockets.in(data.roomId).emit('result', setResult("send-message", data.message, null));
		}
    });

	socket.on('fruit probability', function (json) {
		// Json - {roomId: 0, operation: 0}
		var data = JSON.parse(json);
		console.log('received operation ' + data.operation + ' from room with id ' + data.roomId);
		// Operation:
		// Case 1 - Tentou
		// Case 3 - Bloqueou
		if (data.roomId !== undefined && data.operation !== undefined) {
			var room = JSON.parse(rooms.get(data.roomId));
			var operation = parseInt(room.operation) + parseInt(data.operation);
			setRoomOperation(data.roomId, operation);
		}
    });
	  
    socket.on('master disconnect', function (roomId) {

        if (roomId !== undefined) {

            io.sockets.in(roomId).emit('result', setResult("master-disconnect", "Líder desconectado", null));
            console.log('master user disconnected ' + socket.id);
        }
    });

    socket.on('disconnect', function() {
        console.log('one user disconnected '+ socket.id);
    });

    socket.on('error', (error) => {

        console.log(error);
    });
});

var port = process.env.PORT || 1337;
server.listen(port, function () {
    console.log('server listening on *:' + port);
});

