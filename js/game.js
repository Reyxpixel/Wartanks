class Game {
    constructor() {
        this.scene = new THREE.Scene();
        
        // Add sky
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB, // Sky blue
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(0, 10, 0);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);

        // Camera settings
        this.cameraOffset = new THREE.Vector3(0, 5, 10);
        this.cameraLerpFactor = 0.1;
        this.camera.position.copy(this.cameraOffset);
        this.cameraRotation = new THREE.Euler();
        this.mouseSensitivity = 0.002;
        this.cameraDistance = 10;
        this.cameraHeight = 5;
        this.cameraAngle = 0;
        this.maxVerticalAngle = Math.PI / 3; // 60 degrees up
        this.minVerticalAngle = -Math.PI / 6; // -30 degrees down

        // Game state
        this.isGameRunning = false;
        this.players = new Map();
        this.localPlayer = null;
        this.bots = new Map();

        // Event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('play-button').addEventListener('click', () => {
            this.startGame();
        });

        // Add mouse lock controls
        document.addEventListener('click', () => {
            if (!document.pointerLockElement) {
                document.body.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement) {
                this.isPointerLocked = true;
            } else {
                this.isPointerLocked = false;
            }
        });

        document.addEventListener('mousemove', (event) => {
            if (this.isPointerLocked) {
                // Horizontal rotation
                this.cameraRotation.y -= event.movementX * this.mouseSensitivity;
                
                // Vertical rotation with limits
                this.cameraRotation.x -= event.movementY * this.mouseSensitivity;
                this.cameraRotation.x = Math.max(
                    this.minVerticalAngle,
                    Math.min(this.maxVerticalAngle, this.cameraRotation.x)
                );
            }
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    startGame() {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('game-ui').classList.remove('hidden');
        this.isGameRunning = true;
        this.gameLoop();
        this.spawnBots();
    }

    spawnBots() {
        const maxPlayers = 16;
        const maxBots = 4; // Limit to 4 bots
        const currentPlayers = this.players.size;
        const botsNeeded = Math.min(maxBots, maxPlayers - currentPlayers);

        for (let i = 0; i < botsNeeded; i++) {
            const botId = `bot_${i}`;
            const position = {
                x: (Math.random() - 0.5) * 80,
                y: 0,
                z: (Math.random() - 0.5) * 80
            };
            const bot = new Tank(botId, position);
            bot.isBot = true;
            this.bots.set(botId, bot);
            this.addPlayer(bot);
        }
    }

    updateCamera() {
        if (this.localPlayer) {
            const playerPosition = this.localPlayer.mesh.position.clone();
            
            // Calculate camera position based on rotation and offset
            const cameraOffset = new THREE.Vector3(
                Math.sin(this.cameraRotation.y) * this.cameraDistance,
                this.cameraHeight,
                Math.cos(this.cameraRotation.y) * this.cameraDistance
            );
            
            // Apply vertical rotation
            cameraOffset.applyAxisAngle(
                new THREE.Vector3(
                    Math.cos(this.cameraRotation.y),
                    0,
                    -Math.sin(this.cameraRotation.y)
                ),
                this.cameraRotation.x
            );
            
            const targetPosition = playerPosition.clone().add(cameraOffset);
            
            // Smooth camera movement
            this.camera.position.lerp(targetPosition, this.cameraLerpFactor);
            
            // Make camera look at player
            this.camera.lookAt(playerPosition);
            
            // Update player's turret rotation based on camera rotation
            if (this.localPlayer.turret) {
                this.localPlayer.turretRotation.y = this.cameraRotation.y;
                this.localPlayer.turret.rotation.y = this.cameraRotation.y;
            }
        }
    }

    gameLoop() {
        if (!this.isGameRunning) return;

        requestAnimationFrame(this.gameLoop.bind(this));

        // Update game state
        this.update();

        // Update camera
        this.updateCamera();

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    update() {
        // Update all game objects
        this.players.forEach(player => {
            player.update();
        });

        // Update bots
        this.bots.forEach(bot => {
            bot.update();
        });
    }

    addPlayer(player) {
        this.players.set(player.id, player);
        this.scene.add(player.mesh);
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            this.scene.remove(player.mesh);
            this.players.delete(playerId);
        }
    }

    setLocalPlayer(player) {
        this.localPlayer = player;
        this.addPlayer(player);
    }
} 