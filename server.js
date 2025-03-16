const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Serve static files
app.use(express.static(__dirname));

// Add basic route for testing
app.get('/', (req, res) => {
    console.log('Received request to root path');
    res.sendFile(__dirname + '/index.html');
});

// Game state
const gameState = {
    players: new Map(),
    roundTime: 600, // 10 minutes in seconds
    currentRound: 1,
    gameMode: 'ffa', // Free-for-all
    scores: new Map()
};

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Add player to game state
    gameState.players.set(socket.id, {
        id: socket.id,
        position: { x: 0, y: 0, z: 0 },
        rotation: { y: 0 },
        score: 0,
        health: 100
    });

    // Notify all players about new player
    io.emit('playerJoined', {
        id: socket.id,
        position: { x: 0, y: 0, z: 0 }
    });

    // Handle player movement
    socket.on('updatePosition', (data) => {
        const player = gameState.players.get(socket.id);
        if (player) {
            player.position = data.position;
            player.rotation = data.rotation;
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                position: data.position,
                rotation: data.rotation
            });
        }
    });

    // Handle shooting
    socket.on('shoot', (data) => {
        io.emit('playerShot', {
            id: socket.id,
            position: data.position,
            rotation: data.rotation
        });
    });

    // Handle player hits
    socket.on('playerHit', (data) => {
        const targetPlayer = gameState.players.get(data.targetId);
        if (targetPlayer) {
            targetPlayer.health -= data.damage;
            if (targetPlayer.health <= 0) {
                // Player died
                const shooter = gameState.players.get(socket.id);
                if (shooter) {
                    shooter.score += 1;
                }
                io.emit('playerDied', {
                    id: data.targetId,
                    killerId: socket.id
                });
            }
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        gameState.players.delete(socket.id);
        io.emit('playerLeft', { id: socket.id });
    });
});

// Start round timer
function startRound() {
    console.log('Starting new round');
    let timeLeft = gameState.roundTime;
    
    const timer = setInterval(() => {
        timeLeft--;
        io.emit('roundTimeUpdate', { timeLeft });
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            endRound();
        }
    }, 1000);
}

function endRound() {
    console.log('Ending round');
    // Calculate round results
    const scores = Array.from(gameState.scores.entries())
        .sort((a, b) => b[1] - a[1]);
    
    io.emit('roundEnd', { scores });
    
    // Reset scores for next round
    gameState.scores.clear();
    
    // Start new round after 10 seconds
    setTimeout(() => {
        gameState.currentRound++;
        startRound();
    }, 10000);
}

// Start the server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    startRound();
}); 