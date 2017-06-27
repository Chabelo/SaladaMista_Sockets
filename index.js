var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require("fs");

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/listRooms', function (req, res) {
   fs.readFile( __dirname + "/" + "users.json", 'utf8', function (err, data) {
       console.log( data );
       res.end( data );
   });
});

io.on('connection',function(socket){
    console.log('one user connected '+socket.id);

    socket.on('new message',function(data){
        var sockets = io.sockets.sockets;
        /*sockets.forEach(function(sock){
            if(sock.id != socket.id)
            {
                sock.emit('message',data);
            }
        })*/
        var obj = JSON.parse(data);
 		console.log(obj.username);
        //console.log(data);
        //console.log(socket.rooms);
        socket.broadcast.emit('new message', obj);
    });

    // handle incoming connections from clients
	// once a client has connected, we expect to get a ping from them saying what room they want to join
     // once a client has connected, we expect to get a ping from them saying what room they want to join
    socket.on('room', function(room) {
    	console.log('join room:' + room);
        socket.join(room);
      	var str = '{"username": "server","message": "just came into the room"}';
       	console.log('send message: ' + str.username);
       	var obj = JSON.parse(str);
        io.sockets.in(room).emit('new message', obj);
    });

    socket.on('disconnect',function(){
        console.log('one user disconnected '+ socket.id);
    });

});

var port = process.env.PORT || 1337;
server.listen(port, function () {
    console.log('server listening on *:' + port);
});

