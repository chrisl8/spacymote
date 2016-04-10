//here be globals
var socket, space, player, otherPlayers, currentSpeed = 0, cursors;
var text = null;
var windowHeight = window.innerWidth - 25; // To prevent scrollbars.
var windowWidth = window.innerWidth - 25; // To prevent scrollbars
var publicText = '';
var emojiOnScreen;
var otherTexts = [];
var emojiStory = [];
var emojiIndex = 0;
var superText = null;
var isInteracting = false;
var corg = false; //this is the cheat thing

// Returns a random integer between min (included) and max (excluded)
// Using Math.round() will give you a non-uniform distribution!
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
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

    game.world.setBounds(-500, -500, 10000, 10000);

    space = game.add.tileSprite(0, 0, windowWidth, windowHeight, 'space');
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

    // Emoji Test
    var pickAnEmoji = getRandomInt(0, 1639);
    emojiOnScreen = game.add.sprite(startX + 10, startY + 10, 'emoji', pickAnEmoji);

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
function interact(a, b) {
        if(!isInteracting) {
            console.log('interaction');
            publicText = getRandomInt(0, 1639);
            text = game.add.sprite(0, 0, 'emoji', publicText);
            text.anchor.set(0.5);
            setTimeout(function () {
                text.destroy();
                text = null;
                publicText = '';
                isInteracting = false;
            }, 1000);
        }
    isInteracting = true
}

function update() {
    for (var i = 0; i < otherPlayers.length; i++) {
        if (otherPlayers[i].alive) {
            otherPlayers[i].update();
            game.physics.arcade.collide(player, otherPlayers[i].player, interact);
//            console.log(otherPlayers[i].text + i);
            if (otherPlayers[i].text && otherTexts[i] == null && otherPlayers[i].text != 'new') {
                blurb = otherPlayers[i].text;
                emojiStory[emojiIndex] = game.add.sprite(0, 0, 'emoji', blurb);

                    if((emojiIndex*65)+20 < game.width - 100) {
                        emojiStory[emojiIndex].x = (emojiIndex * 65) + 20;
                        emojiStory[emojiIndex].y = 32;
                    } else if((emojiIndex*65)+20 < (game.width+game.height) - 100){
                        console.log('two');
                        emojiStory[emojiIndex].x = (game.width - 32);
                        emojiStory[emojiIndex].y = ((emojiIndex * 65) - (game.width -70)+32);
                    } else if((emojiIndex*65)+20 < ((game.width*2)+game.height) - 100){
                        console.log('three');
                        emojiStory[emojiIndex].x = ((emojiIndex * 65) + 20)-(game.width + game.height);
                        emojiStory[emojiIndex].y = game.height - 32;
                    } else if((emojiIndex*65)+20 < ((game.width*2)+(game.height*2)) -100){
                        console.log('four');
                        emojiStory[emojiIndex].x = 32;
                        emojiStory[emojiIndex].y = ((emojiIndex * 65) - (2*game.width + game.height)) ;
//                        emojiStory[emojiIndex].y = ((emojiIndex * 65) - (game.width -70)-(game.height+(2*game.width)));
                    } else {console.log('Notice me, Senpai!');}

                emojiStory[emojiIndex].fixedToCamera = true;
                emojiIndex++;
                
                otherTexts[i] = game.add.sprite(0, 0, 'emoji', blurb);
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
