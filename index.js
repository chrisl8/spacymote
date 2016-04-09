var express = require('express');
var Player = require('./Player');

var players = [];

// Fancy Express Web Server
// All of my "static" web pages are in the public folder
var app = express();
app.use(express.static(__dirname + '/public'));
var port = process.env.PORT || 3000;
var webServer = app.listen(port);
// with Socket.io!
var socket = require('socket.io').listen(webServer);

socket.sockets.on('connection', onSocketConnection);

function onSocketConnection(client) {
    console.log('New player has connected: ' + client.id);

    client.on('disconnect', onClientDisconnect);

    client.on('new player', onNewPlayer);

    client.on('move player', onMovePlayer);
}

function onClientDisconnect() {
    console.log('Player has disconnected: ' + this.id);

    var removePlayer = playerById(this.id);

    if (!removePlayer) {
        console.log('Player not found: ' + this.id);
        return;
    }

    players.splice(players.indexOf(removePlayer), 1);

    this.broadcast.emit('remove player', {id: this.id});
}

function onNewPlayer(data) {
    console.log(data);
    var newPlayer = new Player(data.x, data.y);
    newPlayer.id = this.id;

    this.broadcast.emit('new player', {id: newPlayer.id, x: newPlayer.getX(), y: newPlayer.getY()});

    var i, existingPlayer;
    for (i = 0; i < players.length; i++) {
        existingPlayer = players[i];
        this.emit('new player', {id: existingPlayer.id, x: existingPlayer.getX(), y: existingPlayer.getY()});
    }

    players.push(newPlayer);
}

function onMovePlayer(data) {
    var movePlayer = playerById(this.id);

    if (!movePlayer) {
        console.log('Player not found: ' + this.id);
        return
    }

    movePlayer.setX(data.x);
    movePlayer.setY(data.y);

    console.log(data);
    this.broadcast.emit('move player', {id: movePlayer.id, x: movePlayer.getX(), y: movePlayer.getY(), text:'hello'});
}

function playerById(id) {
    var i;
    for (i = 0; i < players.length; i++) {
        if (players[i].id === id) {
            return players[i];
        }
    }

    return false;
}
