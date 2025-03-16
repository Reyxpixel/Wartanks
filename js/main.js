// Initialize game when the page loads
window.addEventListener('load', () => {
    console.log('Page loaded, initializing game...');
    try {
        // Create game instance
        window.game = new Game();
        console.log('Game instance created');
        
        // Create terrain
        const terrain = new Terrain(window.game.scene);
        console.log('Terrain created');
        
        // Create network instance
        const network = new Network(window.game);
        console.log('Network instance created');
        
        // Create local player
        const localPlayer = new Tank(network.playerId, { x: 0, y: 0, z: 0 });
        window.game.setLocalPlayer(localPlayer);
        console.log('Local player created');
        
        // Start game loop
        window.game.startGame();
        console.log('Game started');
    } catch (error) {
        console.error('Error initializing game:', error);
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.style.color = 'red';
        errorDiv.style.position = 'absolute';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.textContent = 'Error loading game. Check console for details.';
        document.body.appendChild(errorDiv);
    }
}); 