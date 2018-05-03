var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(80, function() {
  console.log('server port: 80');
});

app.use(express.static('public'));