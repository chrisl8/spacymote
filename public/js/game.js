//here be globals
var socket, space, player, otherPlayers, currentSpeed = 0, cursors;
var text = null;
var letGoOfW = 0;
var windowHeight = window.innerWidth - 25; // To prevent scrollbars.
var windowWidth = window.innerWidth - 25; // To prevent scrollbars
var publicText = '';
var emojiOnScreen;
var emojiPicker;

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

    var worldSize = 10500;
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
    game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
    game.camera.focusOnXY(0, 0);

    cursors = game.input.keyboard.createCursorKeys();

    setEventHandlers();
    setTimeout(function() {
        displayEmojiPicker();
    }, 1000);
}

var counter = 0;
function displayEmojiPicker() {
    // Emoji Picker Test
    var gridOffset = 70;
    var emojiPickerX = Math.floor(player.x + player.width / 2);
    var emojiPickerY = Math.floor(player.y + player.height / 2);
    emojiPicker = game.add.group();
    var sprite1 = emojiPicker.create(emojiPickerX, emojiPickerY, 'emoji', pickAnEmojiForMe());
    var sprite2 = emojiPicker.create(emojiPickerX + gridOffset, emojiPickerY, 'emoji', pickAnEmojiForMe());

    //  Enables all kind of input actions on this image (click, etc)
    sprite1.inputEnabled = true;
    sprite2.inputEnabled = true;
    sprite1.events.onInputDown.addOnce(emojiPickerClicker, this);
    sprite2.events.onInputDown.addOnce(emojiPickerClicker, this);
}

function emojiPickerClicker () {

    counter++;
    console.log(counter);
    emojiPicker.destroy();


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
    var style = { font: "32px Arial", fill: "#ff0044", wordWrap: true, wordWrapWidth: player.width, align: "center", backgroundColor: "#ffff00" };
    for (var i = 0; i < otherPlayers.length; i++) {
        if (otherPlayers[i].alive) {
            otherPlayers[i].update();
            game.physics.arcade.collide(player, otherPlayers[i].player);
                    console.log(otherPlayers[i].text + i);
            if (otherPlayers[i].text) {
                var blurb = otherPlayers[i].text;
//                console.log(blurb);
                if (blurb == 'this') {
                    console.log('hey');
                    text = game.add.text(0, 0, "- text on a sprite -\ndrag me", style);
                    text.anchor.set(0.5);
                    publicText = 'this';

                }
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
            text = game.add.text(0, 0, "- text on a sprite -\ndrag me", style);
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
