var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require("fs");

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
    console.log('one user connected ' + socket.id);

    function setResult(method, message, data) {
        return JSON.stringify({ method: method, message: message, data: data });
    };

    socket.on('create room', function (roomId) {

        if (roomId !== undefined) {
            socket.join(roomId);
            io.sockets.in(roomId).emit('result', setResult("create-room", 'Sala criada - ' + roomId, null));
        }
    });


    socket.on('join room', function (json) {

        var data = JSON.parse(json);
        if (data.roomId !== undefined && data.userName !== undefined) {

            socket.join(data.roomId);
            io.sockets.in(data.roomId).emit('result', setResult("join-room", data.userName + ' entrou na sala', socket.id));
        }
    });

    socket.on("leave room", function (json) {

        var data = JSON.parse(json);
        if (data.roomId !== undefined && data.userName !== undefined) {

            socket.leave(data.roomId);
            io.sockets.in(data.roomId).emit('result', setResult("leave-room", data.userName + ' saiu da sala', null));
        }
    });

    socket.on('start round', function (roomId) {

        if (roomId !== undefined) {
            io.sockets.in(roomId).emit('result', setResult("start-round", 'Rodada iniciada', null));
        }
    });

    socket.on("chosen players", function (json) {

        var data = JSON.parse(json);
        if (data.roomId !== undefined && data.users !== undefined) {
            io.sockets.in(data.roomId).emit('result', setResult("chosen-players", '', data.users));
        }
    });

    socket.on("exit round", function (roomId) {

        if (roomId !== undefined)
            io.sockets.in(roomId).emit('result', setResult("exit-round", 'Saiu da rodada', null));
    });

    socket.on("send players list", function (json) {

        var data = JSON.parse(json);
        if (data.roomId !== undefined && data.users !== undefined) {
            io.sockets.in(data.roomId).emit('result', setResult("send-players-list", '', data.users));
        }
    });

    socket.on('send message', function (data) {
        var sockets = io.sockets.sockets;
        socket.broadcast.to(data.roomId).emit('result', setResult("send-message", data.message, null));
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
});

var port = process.env.PORT || 1337;
server.listen(port, function () {
    console.log('server listening on *:' + port);
});

