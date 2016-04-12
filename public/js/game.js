'use strict';
var socket, space, player, currentSpeed = 0, cursors;
var otherPlayers = [];
var text = null;
var windowHeight = window.innerHeight; // To prevent scrollbars.
var windowWidth = window.innerWidth; // To prevent scrollbars.
var emojiPicker;
var emojiStory = [];
var emojiIndex = 0;
var isInteracting = false;

// Returns a random integer between min (included) and max (excluded)
// Using Math.round() will give you a non-uniform distribution!
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function pickAnEmojiForMe() {
    return getRandomInt(0, 1639);
}

var game = new Phaser.Game(windowWidth, windowHeight, Phaser.AUTO, '', {
    preload: preload,
    create: create,
    update: update,
    render: render
});

function preload() {
    game.load.image('space', 'assets/space.png');
    game.load.spritesheet('ship', 'assets/ship.png', 64, 64);
    game.load.spritesheet('otherPlayer', 'assets/ship.png', 64, 64);
    game.load.spritesheet('emoji', 'assets/emojiSpriteSheet-From-emojione.com.png', 64, 64);
}

function create() {
    socket = io.connect();

    var worldSize = 5000;
    game.world.setBounds(0, 0, worldSize, worldSize);

    space = game.add.tileSprite(0, 0, windowWidth, windowHeight, 'space');
    space.fixedToCamera = true;

    var startX = Math.round(Math.random() * worldSize);
    var startY = Math.round(Math.random() * worldSize);
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
    game.camera.deadzone = new Phaser.Rectangle(windowWidth/4, windowHeight/4, windowWidth/2, windowHeight/2);
    game.camera.focusOnXY(0, 0);

    cursors = game.input.keyboard.createCursorKeys();

    setEventHandlers();
}

var counter = 0;
var emojiPickerActive = false;
function displayEmojiPicker(a, b) {
    if (!emojiPickerActive) {
        emojiPickerActive = true;
        // Emoji Picker Test
        var gridOffset = 70;
        emojiPicker = game.add.group();
        emojiPicker.position.copyFrom(player.position);
        var emoji1 = pickAnEmojiForMe();
        var emoji2 = pickAnEmojiForMe();
        var emoji3 = pickAnEmojiForMe();
        var emoji4 = pickAnEmojiForMe();
        var emoji5 = pickAnEmojiForMe();
        var emoji6 = pickAnEmojiForMe();
        var sprite1 = emojiPicker.create(player.width / 2, player.height / 2, 'emoji', emoji1);
        var sprite2 = emojiPicker.create(player.width / 2 + gridOffset, player.height / 2, 'emoji', emoji2);

        var sprite3 = emojiPicker.create(player.width / 2, player.height / 2 + gridOffset, 'emoji', emoji3);
        var sprite4 = emojiPicker.create(player.width / 2 + gridOffset, player.height / 2 + gridOffset, 'emoji', emoji4);

        var sprite5 = emojiPicker.create(player.width / 2, player.height / 2 + (gridOffset * 2), 'emoji', emoji5);
        var sprite6 = emojiPicker.create(player.width / 2 + gridOffset, player.height / 2 + (gridOffset * 2), 'emoji', emoji6);

        //  Enables all kind of input actions on this image (click, etc)
        sprite1.inputEnabled = true;
        sprite1.events.onInputDown.addOnce(emojiPickerClicker, this, 0, emoji1, a, b);
        sprite2.inputEnabled = true;
        sprite2.events.onInputDown.addOnce(emojiPickerClicker, this, 0, emoji2, a, b);
        sprite3.inputEnabled = true;
        sprite3.events.onInputDown.addOnce(emojiPickerClicker, this, 0, emoji3, a, b);
        sprite4.inputEnabled = true;
        sprite4.events.onInputDown.addOnce(emojiPickerClicker, this, 0, emoji4, a, b);
        sprite5.inputEnabled = true;
        sprite5.events.onInputDown.addOnce(emojiPickerClicker, this, 0, emoji5, a, b);
        sprite6.inputEnabled = true;
        sprite6.events.onInputDown.addOnce(emojiPickerClicker, this, 0, emoji6, a, b);

        emojiPicker.update = function () {
            this.position.copyFrom(player);
        }
    }
}

function emojiPickerClicker(context, otherThing, emojiNumber, a, b) {

    interact(a, b, emojiNumber);
    emojiPicker.destroy();
    emojiPickerActive = false;
}

var setEventHandlers = function () {
    socket.on('connect', onSocketConnected);
    socket.on('disconnect', onSocketDisconnect);
    socket.on('new player', onNewPlayer);
    socket.on('move player', onMovePlayer);
    socket.on('remove player', onRemovePlayer);
    socket.on('here is an emoji', onNewEmojiReceived);
    socket.on('location override', onLocationOverride);
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

function onLocationOverride(data) {
    player.x = data.x;
    player.y = data.y;
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
    game.world.setBounds(0, 0, 5000 + 1000 * otherPlayers.length, 5000 + 1000 * otherPlayers.length);
}

function onNewEmojiReceived(data) {
    var fromPlayer = playerById(data.from);
    for (var y in otherPlayers) {
        if (otherPlayers[y].player.name == data.from) {
            var ambientEmoji = game.add.sprite(otherPlayers[y].player.x, otherPlayers[y].player.y, 'emoji', data.text);
            setTimeout(function () {ambientEmoji.destroy();}, 1000);
            break;
        }
    }
    // Missing player
    if (!fromPlayer) {
        console.log('Player not found: ', data.from);
        return;
    }

    if (data.id.indexOf(socket.io.engine.id) > -1) {
        emojiStory[emojiIndex] = game.add.sprite(0, 0, 'emoji', data.text);

        if ((emojiIndex * 65) + 20 < game.width - 100) {
            emojiStory[emojiIndex].x = (emojiIndex * 65) + 20;
            emojiStory[emojiIndex].y = 32;
        } else if ((emojiIndex * 65) + 20 < (game.width + game.height) - 100) {
            console.log('two');
            emojiStory[emojiIndex].x = (game.width - 32);
            emojiStory[emojiIndex].y = ((emojiIndex * 65) - (game.width - 70) + 32);
        } else if ((emojiIndex * 65) + 20 < ((game.width * 2) + game.height) - 100) {
            console.log('three');
            emojiStory[emojiIndex].x = ((emojiIndex * 65) + 20) - (game.width + game.height);
            emojiStory[emojiIndex].y = game.height - 32;
        } else if ((emojiIndex * 65) + 20 < ((game.width * 2) + (game.height * 2)) - 100) {
            console.log('four');
            emojiStory[emojiIndex].x = 32;
            emojiStory[emojiIndex].y = ((emojiIndex * 65) - (2 * game.width + game.height));
        } else {
            console.log('Notice me, Senpai!');
        }

        emojiStory[emojiIndex].fixedToCamera = true;
        emojiIndex++;
    }
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
    game.world.setBounds(0, 0, 5000 + 1000 * otherPlayers.length, 5000 + 1000 * otherPlayers.length);

    otherPlayers.splice(otherPlayers.indexOf(removePlayer), 1);
}
function interact(a, b, emojiNumber) {
    if (!isInteracting) {
        socket.emit('send emoji', {to: b.name, text: emojiNumber});
        text = game.add.sprite(0, 0, 'emoji', emojiNumber);
        text.anchor.set(0.5);
        setTimeout(function () {
            text.destroy();
            text = null;
            isInteracting = false;
        }, 1000);
    }
    isInteracting = true
}

function update() {
    for (var i = 0; i < otherPlayers.length; i++) {
        if (otherPlayers[i].alive) {
            otherPlayers[i].update();
            game.physics.arcade.collide(player, otherPlayers[i].player, displayEmojiPicker);
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
