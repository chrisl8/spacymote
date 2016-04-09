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

var socket, space, player, otherPlayers, currentSpeed = 0, cursors;

function create() {
    socket = io.connect();

    game.world.setBounds(-500, -500, 1000, 1000);

    space = game.add.tileSprite(0, 0, 800, 600, 'space');
    space.fixedToCamera = true;

    var startX = Math.round(Math.random() * 1000 - 500);
    var startY = Math.round(Math.random() * 1000 - 500);
    player = game.add.sprite(startX, startY, 'ship');
    player.anchor.setTo(0.5, 0.5);
    player.animations.add('move', [0, 1, 2, 3, 4, 5, 6, 7], 20, true);
    player.animations.add('stop', [3], 20, true);

    // Thsi will force it to decelerate and limit its speed
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

    socket.emit('new player', {x: player.x, y: player.y});
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

    game.physics.arcade.velocityFromRotation(player.rotation, currentSpeed, player.body.velocity);

    if (currentSpeed > 0) {
        player.animations.play('move');
    } else {
        player.animations.play('stop');
    }

    space.tilePosition.x = -game.camera.x;
    space.tilePosition.y = -game.camera.y;

    if (game.input.activePointer.isDown) {
        if (game.physics.arcade.distanceToPointer(player) >= 10) {
            currentSpeed = 300;
            player.rotation = game.physics.arcade.angleToPointer(player);
        }
    }

    socket.emit('move player', {x: player.x, y: player.y});
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
