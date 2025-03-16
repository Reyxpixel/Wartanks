class Terrain {
    constructor(scene) {
        this.scene = scene;
        this.terrain = null;
        this.obstacles = [];
        this.colliders = new Map(); // Store colliders for all objects
        this.p = new Array(512); // Permutation table for noise
        this.initializePermutationTable();
        this.generateTerrain();
    }

    initializePermutationTable() {
        const permutation = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
        for (let i = 0; i < 256; i++) this.p[i] = permutation[i];
        for (let i = 256; i < 512; i++) this.p[i] = this.p[i - 256];
    }

    generateTerrain() {
        // Create terrain using heightmap with more detail
        const geometry = new THREE.PlaneGeometry(200, 200, 200, 200); // Increased segments for more detail
        const material = new THREE.MeshPhongMaterial({
            color: 0x3a7e3a,
            wireframe: false,
            flatShading: true
        });

        // Generate heightmap using Perlin-like noise
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            
            // Create more natural-looking terrain using multiple noise layers
            let height = 0;
            height += this.noise(x * 0.02, z * 0.02) * 2; // Large features
            height += this.noise(x * 0.1, z * 0.1) * 1;   // Medium features
            height += this.noise(x * 0.2, z * 0.2) * 0.5; // Small features
            
            vertices[i + 1] = height;
        }

        // Update geometry
        geometry.computeVertexNormals();
        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.position.y = -1;
        this.terrain.receiveShadow = true;

        // Create terrain collider
        this.terrainCollider = new THREE.Box3().setFromObject(this.terrain);
        this.colliders.set('terrain', this.terrainCollider);

        // Add mountains around the border
        this.addMountains();

        // Add trees
        this.addTrees();

        // Add rocks
        this.addRocks();

        // Add obstacles
        this.addObstacles();

        this.scene.add(this.terrain);
    }

    noise(x, z) {
        // Simple Perlin-like noise function
        const X = Math.floor(x) & 255;
        const Z = Math.floor(z) & 255;
        
        x -= Math.floor(x);
        z -= Math.floor(z);
        
        const u = this.fade(x);
        const v = this.fade(z);
        
        const A = this.p[X] + Z;
        const B = this.p[X + 1] + Z;
        
        return this.lerp(v,
            this.lerp(u,
                this.grad(this.p[A], x, z),
                this.grad(this.p[B], x - 1, z)
            ),
            this.lerp(u,
                this.grad(this.p[A + 1], x, z - 1),
                this.grad(this.p[B + 1], x - 1, z - 1)
            )
        );
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, z) {
        const h = hash & 15;
        const grad = 1 + (h & 7);
        return ((h & 8) ? -grad : grad) * x + ((h & 8) ? -grad : grad) * z;
    }

    addMountains() {
        // Create mountain range around the border
        const mountainGeometry = new THREE.ConeGeometry(20, 40, 32);
        const mountainMaterial = new THREE.MeshPhongMaterial({
            color: 0x808080,
            wireframe: false,
            flatShading: true
        });

        // Add mountains in a circle
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const radius = 90;
            const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
            
            mountain.position.x = Math.cos(angle) * radius;
            mountain.position.z = Math.sin(angle) * radius;
            mountain.position.y = 20;
            
            mountain.castShadow = true;
            mountain.receiveShadow = true;
            
            // Create mountain collider
            const collider = new THREE.Box3().setFromObject(mountain);
            this.colliders.set(`mountain_${i}`, collider);
            
            this.scene.add(mountain);
            this.obstacles.push(mountain);
        }
    }

    addTrees() {
        // Create tree geometry
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.4, 2, 8);
        const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x4a2f0f });
        const leavesGeometry = new THREE.ConeGeometry(1, 2, 8);
        const leavesMaterial = new THREE.MeshPhongMaterial({ color: 0x2d5a27 });

        // Add trees randomly
        for (let i = 0; i < 50; i++) {
            const tree = new THREE.Group();
            
            // Trunk
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            tree.add(trunk);
            
            // Leaves
            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leaves.position.y = 1.5;
            leaves.castShadow = true;
            leaves.receiveShadow = true;
            tree.add(leaves);
            
            // Position
            tree.position.x = (Math.random() - 0.5) * 160;
            tree.position.z = (Math.random() - 0.5) * 160;
            tree.position.y = 1;
            
            // Create tree collider
            const collider = new THREE.Box3().setFromObject(tree);
            this.colliders.set(`tree_${i}`, collider);
            
            this.scene.add(tree);
            this.obstacles.push(tree);
        }
    }

    addRocks() {
        // Create rock geometry
        const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
        const rockMaterial = new THREE.MeshPhongMaterial({
            color: 0x808080,
            wireframe: false,
            flatShading: true
        });

        // Add rocks randomly
        for (let i = 0; i < 100; i++) {
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            
            // Random position
            rock.position.x = (Math.random() - 0.5) * 160;
            rock.position.z = (Math.random() - 0.5) * 160;
            rock.position.y = 0.5;
            
            // Random rotation
            rock.rotation.x = Math.random() * Math.PI;
            rock.rotation.y = Math.random() * Math.PI;
            rock.rotation.z = Math.random() * Math.PI;
            
            // Random scale
            const scale = Math.random() * 0.5 + 0.5;
            rock.scale.set(scale, scale, scale);
            
            rock.castShadow = true;
            rock.receiveShadow = true;
            
            // Create rock collider
            const collider = new THREE.Box3().setFromObject(rock);
            this.colliders.set(`rock_${i}`, collider);
            
            this.scene.add(rock);
            this.obstacles.push(rock);
        }
    }

    addObstacles() {
        // Add some simple obstacles (cubes) to the terrain
        for (let i = 0; i < 20; i++) {
            const size = Math.random() * 2 + 1;
            const geometry = new THREE.BoxGeometry(size, size * 2, size);
            const material = new THREE.MeshPhongMaterial({
                color: 0x8b4513,
                wireframe: false
            });
            const obstacle = new THREE.Mesh(geometry, material);
            
            // Random position
            obstacle.position.x = (Math.random() - 0.5) * 160;
            obstacle.position.z = (Math.random() - 0.5) * 160;
            obstacle.position.y = size;

            obstacle.castShadow = true;
            obstacle.receiveShadow = true;

            // Create obstacle collider
            const collider = new THREE.Box3().setFromObject(obstacle);
            this.colliders.set(`obstacle_${i}`, collider);
            
            this.scene.add(obstacle);
            this.obstacles.push(obstacle);
        }
    }

    getHeightAtPosition(x, z) {
        // Get the height at a specific position using raycasting
        const raycaster = new THREE.Raycaster();
        raycaster.set(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObject(this.terrain);
        
        if (intersects.length > 0) {
            return intersects[0].point.y;
        }
        return 0;
    }

    checkCollision(position, radius) {
        // Check collision with terrain
        const playerBox = new THREE.Box3(
            new THREE.Vector3(position.x - radius, position.y - radius, position.z - radius),
            new THREE.Vector3(position.x + radius, position.y + radius, position.z + radius)
        );

        // Check collision with all obstacles
        for (const [_, collider] of this.colliders) {
            if (playerBox.intersectsBox(collider)) {
                return true;
            }
        }

        return false;
    }

    updateColliders() {
        // Update all colliders
        for (const [key, collider] of this.colliders) {
            if (key === 'terrain') continue;
            const object = this.obstacles.find(obj => obj.name === key);
            if (object) {
                collider.setFromObject(object);
            }
        }
    }
} 