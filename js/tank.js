class Tank {
    constructor(id, position = { x: 0, y: 0, z: 0 }) {
        this.id = id;
        this.position = position;
        this.rotation = { y: 0 };
        this.turretRotation = { y: 0 };
        this.health = 100;
        this.ammo = 30;
        this.speed = 0.1;
        this.rotationSpeed = 0.03;
        this.isBot = false;
        this.mesh = this.createTankMesh();
        this.mesh.position.set(position.x, position.y, position.z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Create collider
        this.collider = new THREE.Box3().setFromObject(this.mesh);
        
        // Bot properties
        this.target = null;
        this.lastShotTime = 0;
        this.shootCooldown = 1000; // 1 second between shots
        this.lastDirectionChange = 0;
        this.directionChangeInterval = 3000; // Change direction every 3 seconds
        
        if (!this.isBot) {
            this.setupControls();
        }
    }

    createTankMesh() {
        const group = new THREE.Group();

        // Tank body (lower part with tracks)
        const bodyGeometry = new THREE.BoxGeometry(2, 1, 3);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x4a4a4a });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Tank tracks with more detail
        const trackGeometry = new THREE.BoxGeometry(2.2, 0.2, 0.2);
        const trackMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
        
        // Left track with wheels
        const leftTrack = new THREE.Mesh(trackGeometry, trackMaterial);
        leftTrack.position.z = -1.5;
        leftTrack.castShadow = true;
        leftTrack.receiveShadow = true;
        group.add(leftTrack);
        
        // Add wheels to left track
        for (let i = -1; i <= 1; i++) {
            const wheelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8);
            const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(0, 0.5, -1.5 + i * 1.5);
            wheel.castShadow = true;
            wheel.receiveShadow = true;
            group.add(wheel);
        }
        
        // Right track with wheels
        const rightTrack = new THREE.Mesh(trackGeometry, trackMaterial);
        rightTrack.position.z = 1.5;
        rightTrack.castShadow = true;
        rightTrack.receiveShadow = true;
        group.add(rightTrack);
        
        // Add wheels to right track
        for (let i = -1; i <= 1; i++) {
            const wheelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8);
            const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(0, 0.5, 1.5 + i * 1.5);
            wheel.castShadow = true;
            wheel.receiveShadow = true;
            group.add(wheel);
        }

        // Tank turret (upper part)
        const turretGroup = new THREE.Group();
        turretGroup.position.y = 1;

        // Turret base with more detail
        const turretBaseGeometry = new THREE.BoxGeometry(1.5, 1, 1.5);
        const turretBaseMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const turretBase = new THREE.Mesh(turretBaseGeometry, turretBaseMaterial);
        turretBase.castShadow = true;
        turretBase.receiveShadow = true;
        turretGroup.add(turretBase);

        // Tank barrel with more detail
        const barrelGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
        const barrelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.x = 1;
        barrel.position.y = 0.5;
        barrel.castShadow = true;
        barrel.receiveShadow = true;
        turretGroup.add(barrel);

        // Add barrel details
        const barrelTipGeometry = new THREE.CylinderGeometry(0.12, 0.1, 0.2, 8);
        const barrelTip = new THREE.Mesh(barrelTipGeometry, barrelMaterial);
        barrelTip.position.x = 2;
        barrelTip.rotation.z = Math.PI / 2;
        barrelTip.castShadow = true;
        barrelTip.receiveShadow = true;
        turretGroup.add(barrelTip);

        // Store references for rotation
        this.turret = turretGroup;
        this.barrel = barrel;
        this.barrelTip = barrelTip;

        group.add(turretGroup);
        return group;
    }

    setupControls() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false
        };

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('click', () => this.shoot());
    }

    onKeyDown(event) {
        switch(event.key.toLowerCase()) {
            case 'w': this.keys.forward = true; break;
            case 's': this.keys.backward = true; break;
            case 'a': this.keys.left = true; break;
            case 'd': this.keys.right = true; break;
        }
    }

    onKeyUp(event) {
        switch(event.key.toLowerCase()) {
            case 'w': this.keys.forward = false; break;
            case 's': this.keys.backward = false; break;
            case 'a': this.keys.left = false; break;
            case 'd': this.keys.right = false; break;
        }
    }

    onMouseMove(event) {
        // Update turret rotation based on mouse movement
        this.turretRotation.y -= event.movementX * this.rotationSpeed;
        this.turret.rotation.y = this.turretRotation.y;
        
        // Update server with rotation
        if (window.socket) {
            window.socket.emit('updateRotation', {
                rotation: this.rotation,
                turretRotation: this.turretRotation
            });
        }
    }

    createBullet() {
        // Create bullet geometry (rectangular cuboid)
        const bulletGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.4);
        const bulletMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xff8c00, // Orange color
            emissive: 0xff8c00,
            emissiveIntensity: 0.5
        });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Get barrel tip position
        const barrelTipPosition = new THREE.Vector3();
        this.barrelTip.getWorldPosition(barrelTipPosition);
        bullet.position.copy(barrelTipPosition);
        
        // Create bullet collider
        bullet.collider = new THREE.Box3().setFromObject(bullet);
        
        // Calculate direction based on turret rotation
        const direction = new THREE.Vector3(
            Math.sin(this.turretRotation.y),
            0,
            Math.cos(this.turretRotation.y)
        );
        
        // Set bullet rotation to match direction
        bullet.rotation.y = this.turretRotation.y;
        
        return { mesh: bullet, direction };
    }

    shoot() {
        if (this.ammo <= 0) return;
        
        const currentTime = Date.now();
        if (currentTime - this.lastShotTime < this.shootCooldown) return;
        
        this.ammo--;
        this.lastShotTime = currentTime;
        
        // Create bullet
        const { mesh: bullet, direction } = this.createBullet();
        window.game.scene.add(bullet);
        
        // Animate bullet
        const speed = 0.5;
        const maxDistance = 100; // Maximum travel distance
        const startPosition = bullet.position.clone();
        
        const animate = () => {
            // Move bullet
            bullet.position.add(direction.multiplyScalar(speed));
            
            // Update bullet collider
            bullet.collider.setFromObject(bullet);
            
            // Check for collisions
            if (this.checkBulletCollision(bullet)) {
                window.game.scene.remove(bullet);
                return;
            }
            
            // Check if bullet has traveled too far
            if (bullet.position.distanceTo(startPosition) > maxDistance) {
                window.game.scene.remove(bullet);
                return;
            }
            
            requestAnimationFrame(animate);
        };
        
        animate();
        
        // Emit shooting event to server
        if (window.socket) {
            window.socket.emit('shoot', {
                position: bullet.position,
                rotation: this.turretRotation
            });
        }
        
        // Update UI
        document.getElementById('ammo-count').textContent = `Ammo: ${this.ammo}`;
    }

    checkBulletCollision(bullet) {
        // Check collision with other players
        for (const player of window.game.players.values()) {
            if (player.id !== this.id && player.collider.intersectsBox(bullet.collider)) {
                player.takeDamage(20);
                this.createHitEffect(bullet.position);
                return true;
            }
        }

        // Check collision with bots
        for (const bot of window.game.bots.values()) {
            if (bot.collider.intersectsBox(bullet.collider)) {
                bot.takeDamage(20);
                this.createHitEffect(bullet.position);
                return true;
            }
        }

        return false;
    }

    createHitEffect(position) {
        // Create hit effect (spark particles)
        const particleCount = 10;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff8c00,
                transparent: true,
                opacity: 1
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            
            // Random direction
            const direction = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            
            particles.add(particle);
            particle.direction = direction;
            particle.life = 1.0;
        }
        
        window.game.scene.add(particles);
        
        // Animate particles
        const animate = () => {
            let alive = false;
            for (const particle of particles.children) {
                particle.position.add(particle.direction);
                particle.life -= 0.02;
                particle.material.opacity = particle.life;
                
                if (particle.life > 0) {
                    alive = true;
                }
            }
            
            if (alive) {
                requestAnimationFrame(animate);
            } else {
                window.game.scene.remove(particles);
            }
        };
        
        animate();
    }

    update() {
        if (this.isBot) {
            this.updateBot();
        } else {
            this.updatePlayer();
        }
    }

    updatePlayer() {
        // Handle movement
        if (this.keys.forward) {
            this.mesh.position.x += Math.sin(this.rotation.y) * this.speed;
            this.mesh.position.z += Math.cos(this.rotation.y) * this.speed;
        }
        if (this.keys.backward) {
            this.mesh.position.x -= Math.sin(this.rotation.y) * this.speed;
            this.mesh.position.z -= Math.cos(this.rotation.y) * this.speed;
        }
        if (this.keys.left) {
            this.rotation.y += this.rotationSpeed;
            this.mesh.rotation.y = this.rotation.y;
        }
        if (this.keys.right) {
            this.rotation.y -= this.rotationSpeed;
            this.mesh.rotation.y = this.rotation.y;
        }

        // Update position on server
        if (window.socket) {
            window.socket.emit('updatePosition', {
                position: this.mesh.position,
                rotation: this.rotation
            });
        }
    }

    updateBot() {
        const currentTime = Date.now();
        
        // Change direction periodically
        if (currentTime - this.lastDirectionChange > this.directionChangeInterval) {
            this.rotation.y = Math.random() * Math.PI * 2;
            this.mesh.rotation.y = this.rotation.y;
            this.lastDirectionChange = currentTime;
        }
        
        // Move forward
        this.mesh.position.x += Math.sin(this.rotation.y) * this.speed;
        this.mesh.position.z += Math.cos(this.rotation.y) * this.speed;
        
        // Random shooting
        if (Math.random() < 0.01) { // 1% chance to shoot each frame
            this.shoot();
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
        
        // Update UI
        document.getElementById('health-bar').style.width = `${this.health}%`;
    }

    die() {
        // Handle tank destruction
        if (window.socket) {
            window.socket.emit('playerDied');
        }
    }
} 