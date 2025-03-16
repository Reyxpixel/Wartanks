class Network {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.playerId = null;
        this.connect();
    }

    connect() {
        this.socket = io('http://localhost:3000');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.playerId = this.socket.id;
            this.socket.emit('joinGame');
        });

        this.socket.on('playerJoined', (data) => {
            console.log('Player joined:', data.id);
            if (data.id !== this.playerId) {
                const newPlayer = new Tank(data.id, data.position);
                this.game.addPlayer(newPlayer);
            }
        });

        this.socket.on('playerLeft', (data) => {
            console.log('Player left:', data.id);
            this.game.removePlayer(data.id);
        });

        this.socket.on('playerMoved', (data) => {
            const player = this.game.players.get(data.id);
            if (player && data.id !== this.playerId) {
                player.mesh.position.set(data.position.x, data.position.y, data.position.z);
                player.mesh.rotation.y = data.rotation.y;
            }
        });

        this.socket.on('playerShot', (data) => {
            // Handle projectile creation and effects
            this.createProjectile(data);
        });

        this.socket.on('playerHit', (data) => {
            const player = this.game.players.get(data.id);
            if (player) {
                player.takeDamage(data.damage);
            }
        });

        this.socket.on('gameState', (data) => {
            // Update game state (scores, round time, etc.)
            this.updateGameState(data);
        });
    }

    createProjectile(data) {
        // Create visual projectile
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        const projectile = new THREE.Mesh(geometry, material);
        projectile.position.set(data.position.x, data.position.y, data.position.z);
        
        this.game.scene.add(projectile);
        
        // Animate projectile
        const direction = new THREE.Vector3(
            Math.sin(data.rotation.y),
            0,
            Math.cos(data.rotation.y)
        );
        
        const speed = 0.5;
        const animate = () => {
            projectile.position.add(direction.multiplyScalar(speed));
            requestAnimationFrame(animate);
        };
        
        animate();
        
        // Remove projectile after 2 seconds
        setTimeout(() => {
            this.game.scene.remove(projectile);
        }, 2000);
    }

    updateGameState(data) {
        // Update UI with game state
        document.getElementById('score').textContent = `Score: ${data.score}`;
        // Update other game state elements
    }

    sendPosition(position, rotation) {
        if (this.socket) {
            this.socket.emit('updatePosition', {
                position: position,
                rotation: rotation
            });
        }
    }

    sendShot(position, rotation) {
        if (this.socket) {
            this.socket.emit('shoot', {
                position: position,
                rotation: rotation
            });
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
} 