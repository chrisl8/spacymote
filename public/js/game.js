//here be globals
var socket, space, player, otherPlayers, currentSpeed = 0, cursors;
var text = null;
var publicText = '';
letGoOfW = 0;
var otherTexts = [];
var superText = null;





var game = new Phaser.Game(800, 600, Phaser.AUTO, '', {
    preload: preload,
    create: create,
    update: update,
    render: render
});

function preload() {
    game.load.image('space', 'assets/space.png');
    game.load.spritesheet('ship', 'assets/ship.png', 64, 64);
    game.load.spritesheet('otherPlayer', 'assets/ship.png', 64, 64);
}

function create() {
    socket = io.connect();

    game.world.setBounds(-500, -500, 10000, 10000);

    space = game.add.tileSprite(0, 0, 800, 600, 'space');
    space.fixedToCamera = true;

    var startX = Math.round(Math.random() * 1000 - 500);
    var startY = Math.round(Math.random() * 1000 - 500);
    player = game.add.sprite(startX, startY, 'ship');
    player.anchor.setTo(0.5, 0.5);
    player.animations.add('move', [0, 1, 2, 3, 4, 5, 6, 7], 20, true);
    player.animations.add('stop', [3], 20, true);

    // This will force it to decelerate and limit its speed
    game.physics.enable(player, Phaser.Physics.ARCADE);
    player.body.maxVelocity.setTo(400, 400);
    player.body.collideWorldBounds = true;

    otherPlayers = [];

    player.bringToTop();

    game.camera.follow(player);
    game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
    game.camera.focusOnXY(0, 0);

    cursors = game.input.keyboard.createCursorKeys();

    setEventHandlers();
}

var setEventHandlers = function() {
    socket.on('connect', onSocketConnected);
    socket.on('disconnect', onSocketDisconnect);
    socket.on('new player', onNewPlayer);
    socket.on('move player', onMovePlayer);
    socket.on('remove player', onRemovePlayer);
};

function onSocketConnected() {
    console.log('Connected to socket server');

    // Reset other players on reconnect
    otherPlayers.forEach(function (otherPlayer) {
        otherPlayer.player.kill();
    });
    otherPlayers = [];

    socket.emit('new player', {x: player.x, y: player.y, text: publicText});
}

function onSocketDisconnect() {
    console.log('Disconnected from socket server');
}

function onNewPlayer(data) {
    console.log('New player connected:' + data.id);

    // Avoid possible duplicate players
    var duplicate = playerById(data.id);
    if (duplicate) {
        console.log('Duplicate player!');
        return
    }

    // Add new player to the remote players array
    otherPlayers.push(new RemotePlayer(data.id, game, player, data.x, data.y));
}

function onMovePlayer(data) {
    var movePlayer = playerById(data.id);

    // Missing player
    if (!movePlayer) {
        console.log('Player not found: ', data.id);
        return;
    }

    movePlayer.player.x = data.x;
    movePlayer.player.y = data.y;
    movePlayer.text = data.text;
//    console.log(movePlayer.text);
}

function onRemovePlayer(data) {
    var removePlayer = playerById(data.id);

    //Missing player
    if (!removePlayer) {
        console.log('Player not found: ', data.id);
        return;
    }

    removePlayer.player.kill();

    otherPlayers.splice(otherPlayers.indexOf(removePlayer), 1);
}

function update() {
    for (var i = 0; i < otherPlayers.length; i++) {
        if (otherPlayers[i].alive) {
            otherPlayers[i].update();
            game.physics.arcade.collide(player, otherPlayers[i].player);
//            console.log(otherPlayers[i].text + i);
            if (otherPlayers[i].text && otherTexts[i] == null && otherPlayers[i].text != 'new') {
                blurb = otherPlayers[i].text;
                var style = { font: "32px Arial", fill: "#ff0044", wordWrap: true, wordWrapWidth: player.width, align: "center", backgroundColor: "#ffff00" };
                otherTexts[i] = game.add.text(0, 0, '\uD83D\uDC2C', style);
                otherTexts[i].anchor.set(0.5);
                otherTexts[i].x = Math.floor(otherPlayers[i].player.x + otherPlayers[i].player.width / 2);
                otherTexts[i].y = Math.floor(otherPlayers[i].player.y + otherPlayers[i].player.height / 2);
            } else if (otherTexts[i] != null && otherPlayers[i].text == '') {
                otherTexts[i].destroy();
                otherTexts[i] = null;
            }
        }
    }

    if (cursors.left.isDown) {
        player.angle -= 4;
    } else if (cursors.right.isDown) {
        player.angle += 4;
    }

    if (cursors.up.isDown) {
        currentSpeed = 300;
    } else {
        if (currentSpeed > 0) {
            currentSpeed -= 4;
        }
    }
    //emote
    if (game.input.keyboard.isDown(Phaser.Keyboard.W)) {
        letGoOfW = 0;
        if (text == null) {
            var style = { font: "32px Arial", fill: "#ff0044", wordWrap: true, wordWrapWidth: player.width, align: "center", backgroundColor: "#ffff00" };
            text = game.add.text(0, 0, '\uD83D\uDC2C', style);
            text.anchor.set(0.5);
            publicText = 'this';
        }
    } else {letGoOfW++;}
        
    if (letGoOfW > 20) {
        if (text != null) {
            text.destroy();
            publicText = '';
        }
        text = null;
    }
    if (text != null) {
        text.x = Math.floor(player.x + player.width / 2);
        text.y = Math.floor(player.y + player.height / 2);
    }
    
    game.physics.arcade.velocityFromRotation(player.rotation, currentSpeed, player.body.velocity);

    if (currentSpeed > 0) {
        player.animations.play('move');
    } else {
        player.animations.play('stop');
    }

    space.tilePosition.x = -game.camera.x;
    space.tilePosition.y = -game.camera.y;

    if (game.input.activePointer.isDown) {
        //TODO make this better (bounce around the cursor) (actually teh bounce is feature)
        if (game.physics.arcade.distanceToPointer(player) >= 10) {
            currentSpeed = 300;
            player.rotation = game.physics.arcade.angleToPointer(player);
        }
    }

    socket.emit('move player', {x: player.x, y: player.y, text: publicText});
}

function render() {
}

function playerById(id) {
    for (var i = 0; i < otherPlayers.length; i++) {
        if (otherPlayers[i].player.name === id) {
            return otherPlayers[i];
        }
    }
    return false;
}
