// Get the canvas and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const pauseBtn = document.getElementById('pause-btn');

// -- GAME CONSTANTS & VARIABLES --
const TILE_SIZE = 40;
const GRAVITY = 0.3;
const PLAYER_SPEED = 4;
const JUMP_POWER = 8;
const BULLET_SPEED = 8;
const FRICTION = 0.75; // New: For player deceleration
const MAX_JUMP_TIME = 15; // New: For variable jump height

// -- PLAYER CLASS --
class Player {
    constructor(x, y, width, height, color) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.isOnGround = false; // New: To correctly handle jumping
        this.direction = 1; // 1 for right, -1 for left
        this.color = color;
        this.jumpTimer = 0; // New: For variable jump height
    }

    // Handle player's movement and physics
    update(map, tile_size) {
        // Player horizontal movement and deceleration
        if (keys.ArrowLeft || keys.KeyA) {
            this.velocityX = -PLAYER_SPEED;
            this.direction = -1;
        } else if (keys.ArrowRight || keys.KeyD) {
            this.velocityX = PLAYER_SPEED;
            this.direction = 1;
        } else {
            this.velocityX *= FRICTION; // Apply friction when no key is pressed
        }

        // Variable jump height logic
        if ((keys.ArrowUp || keys.Space || keys.KeyW)) {
            if (this.isOnGround) {
                this.velocityY = -JUMP_POWER;
                this.isJumping = true;
                this.isOnGround = false;
                this.jumpTimer = 0;
            } else if (this.isJumping && this.jumpTimer < MAX_JUMP_TIME) {
                this.velocityY -= 0.5; // Small upward boost for variable height
                this.jumpTimer++;
            }
        } else {
            this.isJumping = false; // Stop boosting if key is released
        }

        this.velocityY += GRAVITY;

        // X-axis movement and collision
        this.x += this.velocityX;
        for (let row = 0; row < map.length; row++) {
            for (let col = 0; col < map[row].length; col++) {
                const tile = map[row][col];
                if (tile === 1 || tile === 7) {
                    const tileX = col * tile_size;
                    const tileY = row * tile_size;
                    if (checkCollision(this, { x: tileX, y: tileY, width: tile_size, height: tile_size })) {
                        if (this.velocityX > 0) this.x = tileX - this.width;
                        if (this.velocityX < 0) this.x = tileX + tile_size;
                        this.velocityX = 0; // Stop horizontal movement on collision
                    }
                }
            }
        }

        // Y-axis movement and collision
        this.y += this.velocityY;
        this.isOnGround = false; // Assume not on ground unless collision proves otherwise
        for (let row = 0; row < map.length; row++) {
            for (let col = 0; col < map[row].length; col++) {
                const tile = map[row][col];
                if (tile === 1 || tile === 7) {
                    const tileX = col * tile_size;
                    const tileY = row * tile_size;
                    if (checkCollision(this, { x: tileX, y: tileY, width: tile_size, height: tile_size })) {
                        if (this.velocityY > 0) {
                            this.y = tileY - this.height;
                            this.velocityY = 0;
                            this.isOnGround = true; // Player is on the ground
                        }
                        if (this.velocityY < 0) {
                            this.y = tileY + tile_size;
                            this.velocityY = 0;
                        }
                    }
                }
            }
        }
    }

    // Draw the player
    draw(ctx, assets, camera) {
        const playerAsset = this.isJumping ? assets.player_jump : assets.player_idle;
        if (playerAsset && playerAsset.complete && playerAsset.naturalHeight !== 0) {
            const playerX = this.x - camera.x;
            const playerY = this.y - camera.y;
            if (this.direction === 1) {
                ctx.drawImage(playerAsset, playerX, playerY, this.width, this.height);
            } else {
                ctx.save();
                ctx.translate(playerX + this.width, playerY);
                ctx.scale(-1, 1);
                ctx.drawImage(playerAsset, 0, 0, this.width, this.height);
                ctx.restore();
            }
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - camera.x, this.y - camera.y, this.width, this.height);
        }
    }
}


// -- BULLET CLASS --
class Bullet {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 10;
        this.velocityX = direction * BULLET_SPEED;
        this.color = '#fff';
    }

    update() {
        this.x += this.velocityX;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x - camera.x + this.width / 2, this.y - camera.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

let score = 0;
let bullets = 0;
let currentLevelIndex = 0;
let activeBullets = [];
const player = new Player(80, 80, TILE_SIZE - 10, TILE_SIZE - 5, '#ff5733');
const camera = { x: 0, y: 0 };


// ASSET MANAGEMENT
const assets = {};
const assetPaths = {
    wall: 'assets/wall.png',
    coin: 'assets/coin.png',
    goal: 'assets/goal.png',
    gun: 'assets/gun.png',
    phantom_wall: 'assets/phantom_wall.png',
    spikes: 'assets/spikes.png',
    enemy: 'assets/enemy.png',
    player_idle: 'assets/player_idle.png',
    player_jump: 'assets/player_jump.png',
    gun_sound: 'assets/gun_sound.mp3'
};

function loadAssets(onComplete, onError) {
    let assetsLoaded = 0;
    const totalAssets = Object.keys(assetPaths).length;

    if (totalAssets === 0) {
        onComplete();
        return;
    }

    const onAssetLoad = () => {
        assetsLoaded++;
        if (assetsLoaded === totalAssets) {
            onComplete();
        }
    };

    const onAssetError = (assetName) => {
        console.error(`Failed to load asset: ${assetPaths[assetName]}`);
        onError(`Failed to load asset: ${assetPaths[assetName]}`);
    };

    for (const name in assetPaths) {
        if (assetPaths[name].endsWith('.mp3')) {
            assets[name] = new Audio(assetPaths[name]);
            assets[name].oncanplaythrough = onAssetLoad;
            assets[name].onerror = () => onAssetError(name);
        } else {
            assets[name] = new Image();
            assets[name].src = assetPaths[name];
            assets[name].onload = onAssetLoad;
            assets[name].onerror = () => onAssetError(name);
        }
    }
}

// -- LEVEL STRUCTURES --
// 0=Empty | 1=Platform | 2=Goal | 3=Coin | 4=Gun | 5=Enemy | 6=Spikes | 7=Phantom Wall
const originalLevels = [
    // Level 1
    {
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 1],
            [1, 0, 0, 3, 0, 3, 0, 0, 0, 0, 3, 0, 0, 0, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1],
            [1, 1, 1, 1, 1, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 3, 1],
            [1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
            [1, 0, 3, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ]
    },
    // Level 2
    {
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
            [1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 3, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            [1, 0, 3, 0, 0, 0, 3, 0, 0, 3, 0, 1, 1, 1, 1, 0, 3, 0, 0, 1],
            [1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1],
            [1, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 3, 0, 0, 1, 1, 1, 0, 3, 0, 0, 1, 3, 0, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ]
    },
    // Level 3
    {
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 3, 0, 1, 0, 3, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 0, 1, 1, 1, 0, 0, 2, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1],
            [1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            [1, 0, 3, 0, 1, 0, 3, 0, 0, 0, 0, 0, 3, 0, 1, 0, 3, 0, 0, 1],
            [1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 0, 0, 0, 5, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 3, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 3, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ]
    },
    // Level 4
    {
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
            [1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 3, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
            [1, 0, 3, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 3, 0, 1, 1, 1, 1, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 5, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 3, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 5, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 6, 6, 6, 6, 6, 6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 3, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ]
    },
    // Level 5 - WITH HIDDEN AREA
    {
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 3, 0, 0, 1, 1, 5, 1, 1, 0, 1, 1, 0, 0, 0, 0, 3, 0, 0, 1, 1, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 2, 1],
            [1, 0, 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 7, 3, 3, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 3, 3, 1],
            [1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 3, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 3, 0, 1, 1, 1, 1, 1, 0, 0, 3, 0, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1],
            [1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 5, 0, 0, 1, 1, 1, 0, 0, 3, 0, 0, 1, 1, 1, 1, 1, 0, 0, 3, 0, 0, 1, 1, 1, 1, 1, 0, 0, 3, 0, 0, 1, 1, 1, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 6, 6, 6, 6, 6, 6, 6, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ]
    },
    // Level 6 - New: Gun Block
    {
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 5, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 1],
            [1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 3, 0, 0, 0, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1],
            [1, 1, 1, 1, 1, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 3, 1],
            [1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
            [1, 0, 3, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ]
    },
    // Level 7 - New: Spikes and Enemy
    {
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 3, 0, 0, 1, 1, 5, 1, 1, 0, 1, 1, 0, 0, 0, 0, 3, 0, 0, 1, 1, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 2, 1],
            [1, 0, 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 7, 3, 3, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 3, 3, 1],
            [1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 3, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 3, 0, 1, 1, 1, 1, 1, 0, 0, 3, 0, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1],
            [1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 5, 0, 0, 1, 1, 1, 0, 0, 3, 0, 0, 1, 1, 1, 1, 1, 0, 0, 3, 0, 0, 1, 1, 1, 1, 1, 0, 0, 3, 0, 0, 1, 1, 1, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 6, 6, 6, 6, 6, 6, 6, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ]
    },
    // Level 8 - New: Phantom Walls, Enemy, and Gun
    {
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ]
    },
    // Level 9 - New: Spikes and Enemy
    {
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 5, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 1],
            [1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 3, 0, 0, 0, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1],
            [1, 1, 1, 1, 1, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 3, 1],
            [1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
            [1, 0, 3, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ]
    },
    // Level 10 - New: Finale with Boss
    {
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ]
    }
];

let currentLevelMap;
let currentLevelWidth;
let dynamicObjects = [];

// -- PAUSE MENU --
const resumeBtn = { x: canvas.width / 2 - 100, y: canvas.height / 2 - 25, width: 200, height: 50 };
const exitBtn = { x: canvas.width / 2 - 100, y: canvas.height / 2 + 45, width: 200, height: 50 };

// -- KEYBOARD & TOUCH INPUT --
const keys = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, Space: false, KeyW: false, KeyA: false, KeyD: false, Control: false };
const pressedKeys = {};

window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' && (currentGameState === gameStates.HOME || currentGameState === gameStates.GAME_OVER)) {
        startGame();
    } else if (e.code === 'Escape') {
        if (currentGameState === gameStates.PLAYING) {
            currentGameState = gameStates.PAUSED;
        } else if (currentGameState === gameStates.PAUSED) {
            currentGameState = gameStates.PLAYING;
        }
    } else if (currentGameState === gameStates.PLAYING) {
        if (e.code in keys) {
            keys[e.code] = true;
        }
        if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
            if (!pressedKeys.Control) {
                shootBullet();
                pressedKeys.Control = true;
            }
        }
    }
});
window.addEventListener('keyup', (e) => {
    if (e.code in keys) keys[e.code] = false;
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') pressedKeys.Control = false;
});

function setupTouchControls() {
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnJump = document.getElementById('btn-jump');
    btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); keys.ArrowLeft = true; });
    btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); keys.ArrowLeft = false; });
    btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); keys.ArrowRight = true; });
    btnRight.addEventListener('touchend', (e) => { e.preventDefault(); keys.ArrowRight = false; });
    btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); keys.ArrowUp = true; });
    btnJump.addEventListener('touchend', (e) => { e.preventDefault(); keys.ArrowUp = false; });
    canvas.addEventListener('touchstart', (e) => {
        if (currentGameState === gameStates.HOME || currentGameState === gameStates.GAME_OVER) {
            startGame();
        } else if (currentGameState === gameStates.PLAYING && e.target === canvas) {
             shootBullet();
        }
    });
}

function setupPauseControls() {
    pauseBtn.addEventListener('click', () => {
        if (currentGameState === gameStates.PLAYING) {
            currentGameState = gameStates.PAUSED;
        }
    });

    canvas.addEventListener('click', (e) => {
        if (currentGameState !== gameStates.PAUSED) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Check if Resume button is clicked
        if (mouseX >= resumeBtn.x && mouseX <= resumeBtn.x + resumeBtn.width &&
            mouseY >= resumeBtn.y && mouseY <= resumeBtn.y + resumeBtn.height) {
            currentGameState = gameStates.PLAYING;
        }

        // Check if Exit button is clicked
        if (mouseX >= exitBtn.x && mouseX <= exitBtn.x + exitBtn.width &&
            mouseY >= exitBtn.y && mouseY <= exitBtn.y + exitBtn.height) {
            currentGameState = gameStates.HOME;
        }
    });
}

function shootBullet() {
    if (bullets > 0) {
        bullets--;
        const bulletDirection = player.direction;
        const bulletX = player.x + (player.width / 2);
        const bulletY = player.y + (player.height / 2);
        activeBullets.push(new Bullet(bulletX, bulletY, bulletDirection));

        if (assets.gun_sound) {
            assets.gun_sound.currentTime = 0;
            assets.gun_sound.play();
        }
    }
}


// -- GAME STATE & LEVEL MANAGEMENT --
function loadLevel(levelIndex) {
    const levelData = originalLevels[levelIndex];
    currentLevelMap = JSON.parse(JSON.stringify(levelData.map));
    currentLevelWidth = currentLevelMap[0].length * TILE_SIZE;
    dynamicObjects = [];
    activeBullets = [];
    for (let row = 0; row < currentLevelMap.length; row++) {
        for (let col = 0; col < currentLevelMap[row].length; col++) {
            if (currentLevelMap[row][col] === 5) {
                dynamicObjects.push({ x: col * TILE_SIZE, y: row * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, type: 'enemy', speed: 1, direction: 1, startX: col * TILE_SIZE, range: 120 });
                currentLevelMap[row][col] = 0;
            }
        }
    }
    resetPlayer();
}
function resetPlayer() {
    player.x = 80;
    player.y = 80;
    player.velocityX = 0;
    player.velocityY = 0;
    player.direction = 1;
}
function startGame() {
    score = 0;
    bullets = 0;
    currentLevelIndex = 0;
    loadLevel(currentLevelIndex);
    currentGameState = gameStates.PLAYING;
}
function nextLevel() {
    currentLevelIndex++;
    if (currentLevelIndex >= originalLevels.length) {
        currentGameState = gameStates.GAME_OVER;
    } else {
        loadLevel(currentLevelIndex);
    }
}

// -- DRAWING FUNCTIONS --
function drawGame() {
    const startCol = Math.floor(camera.x / TILE_SIZE);
    const endCol = Math.min(startCol + Math.ceil(canvas.width / TILE_SIZE) + 1, currentLevelMap[0].length);
    for (let row = 0; row < currentLevelMap.length; row++) {
        for (let col = startCol; col < endCol; col++) {
            const tile = currentLevelMap[row][col];
            const tileX = col * TILE_SIZE - camera.x;
            const tileY = row * TILE_SIZE - camera.y;
            if (tile === 0) continue;

            if (tile === 1) {
                if (assets.wall && assets.wall.complete && assets.wall.naturalHeight !== 0) {
                    ctx.drawImage(assets.wall, tileX, tileY, TILE_SIZE, TILE_SIZE);
                } else {
                    ctx.fillStyle = '#ff0000';
                    ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                }
            } else if (tile === 2) {
                if (assets.goal && assets.goal.complete && assets.goal.naturalHeight !== 0) {
                    ctx.drawImage(assets.goal, tileX, tileY, TILE_SIZE, TILE_SIZE);
                } else {
                    ctx.fillStyle = '#654321';
                    ctx.fillRect(tileX + 10, tileY + 10, TILE_SIZE - 20, TILE_SIZE - 20);
                }
            } else if (tile === 3) {
                const coinSize = TILE_SIZE * 0.5;
                const offset = (TILE_SIZE - coinSize) / 2;
                if (assets.coin && assets.coin.complete && assets.coin.naturalHeight !== 0) {
                    ctx.drawImage(assets.coin, tileX + offset, tileY + offset, coinSize, coinSize);
                } else {
                    ctx.fillStyle = '#ffff00';
                    ctx.beginPath();
                    ctx.arc(tileX + TILE_SIZE / 2, tileY + TILE_SIZE / 2, (TILE_SIZE / 3) * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (tile === 4) {
                if (assets.gun && assets.gun.complete && assets.gun.naturalHeight !== 0) {
                    ctx.drawImage(assets.gun, tileX, tileY, TILE_SIZE, TILE_SIZE);
                } else {
                    ctx.fillStyle = '#8e44ad';
                    ctx.fillRect(tileX + 10, tileY + 10, TILE_SIZE - 20, TILE_SIZE - 20);
                }
            } else if (tile === 6) {
                if (assets.spikes && assets.spikes.complete && assets.spikes.naturalHeight !== 0) {
                    ctx.drawImage(assets.spikes, tileX, tileY, TILE_SIZE, TILE_SIZE);
                } else {
                    ctx.fillStyle = '#95a5a6';
                    ctx.beginPath();
                    for (let i = 0; i < TILE_SIZE; i += 10) {
                        ctx.moveTo(tileX + i, tileY + TILE_SIZE);
                        ctx.lineTo(tileX + i + 5, tileY);
                        ctx.lineTo(tileX + i + 10, tileY + TILE_SIZE);
                    }
                    ctx.closePath();
                    ctx.fill();
                }
            } else if (tile === 7) {
                if (assets.phantom_wall && assets.phantom_wall.complete && assets.phantom_wall.naturalHeight !== 0) {
                    ctx.drawImage(assets.phantom_wall, tileX, tileY, TILE_SIZE, TILE_SIZE);
                } else {
                    ctx.fillStyle = '#ffc0cb';
                    ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }

    dynamicObjects.forEach(obj => {
        if (obj.type === 'enemy') {
            if (assets.enemy && assets.enemy.complete && assets.enemy.naturalHeight !== 0) {
                const enemyX = obj.x - camera.x;
                const enemyY = obj.y - camera.y;
                if (obj.direction === 1) {
                    ctx.drawImage(assets.enemy, enemyX, enemyY, obj.width, obj.height);
                } else {
                    ctx.save();
                    ctx.translate(enemyX + obj.width, enemyY);
                    ctx.scale(-1, 1);
                    ctx.drawImage(assets.enemy, 0, 0, obj.width, obj.height);
                    ctx.restore();
                }
            } else {
                ctx.fillStyle = '#c0392b';
                ctx.fillRect(obj.x - camera.x, obj.y - camera.y, obj.width, obj.height);
            }
        }
    });

    activeBullets.forEach(bullet => bullet.draw());

    player.draw(ctx, assets, camera);

    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`Level: ${currentLevelIndex + 1}`, canvas.width - 120, 30);
    drawBulletCount();
}

function drawBulletCount() {
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Bullets: ${bullets}`, canvas.width / 2, 30);
}

function drawHomeScreen() {
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fff';
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('The 2D Platformer', canvas.width / 2, canvas.height / 2 - 40);

    ctx.font = '24px Arial';
    ctx.fillText('Press Enter or Tap Screen to Start', canvas.width / 2, canvas.height / 2 + 20);
}

function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fff';
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('You Win!', canvas.width / 2, canvas.height / 2 - 40);

    ctx.font = '30px Arial';
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

    ctx.font = '20px Arial';
    ctx.fillText('Press Enter or Tap Screen to Play Again', canvas.width / 2, canvas.height / 2 + 70);
}

function drawPauseMenu() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fff';
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Paused', canvas.width / 2, canvas.height / 2 - 100);

    ctx.fillStyle = '#333';
    ctx.fillRect(resumeBtn.x, resumeBtn.y, resumeBtn.width, resumeBtn.height);
    ctx.fillStyle = '#fff';
    ctx.font = '30px Arial';
    ctx.fillText('Resume', canvas.width / 2, resumeBtn.y + 35);

    ctx.fillStyle = '#333';
    ctx.fillRect(exitBtn.x, exitBtn.y, exitBtn.width, exitBtn.height);
    ctx.fillStyle = '#fff';
    ctx.font = '30px Arial';
    ctx.fillText('Exit', canvas.width / 2, exitBtn.y + 35);
}


// -- COLLISION & UPDATE LOGIC --
function checkCollision(objA, objB) { return (objA.x < objB.x + objB.width && objA.x + objA.width > objB.x && objA.y < objB.y + objB.height && objA.y + objA.height > objB.y); }
function updateDynamicObjects() { dynamicObjects.forEach(obj => { if (obj.type === 'enemy') { obj.x += obj.speed * obj.direction; if (obj.x > obj.startX + obj.range || obj.x < obj.startX) obj.direction *= -1; } }); }
function updateCamera() { camera.x = player.x - canvas.width / 2; if (camera.x < 0) camera.x = 0; if (camera.x > currentLevelWidth - canvas.width) camera.x = currentLevelWidth - canvas.width; }

function handleTileCollisions() {
    for (let row = 0; row < currentLevelMap.length; row++) {
        for (let col = 0; col < currentLevelMap[row].length; col++) {
            const tile = currentLevelMap[row][col];
            if (tile === 0 || tile === 7) continue;

            const tileX = col * TILE_SIZE;
            const tileY = row * TILE_SIZE;
            const tileBox = { x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE };

            if (checkCollision(player, tileBox)) {
                switch (tile) {
                    case 1:
                        break;
                    case 2:
                        nextLevel();
                        return;
                    case 3:
                        score += 100;
                        currentLevelMap[row][col] = 0;
                        break;
                    case 4:
                        bullets += 3;
                        currentLevelMap[row][col] = 0;
                        break;
                    case 6:
                        resetPlayer();
                        return;
                }
            }
        }
    }
}

// New: State machine object
const gameStates = {
    HOME: {
        update: () => { /* No update needed for home screen */ },
        draw: drawHomeScreen
    },
    PLAYING: {
        update: () => {
            player.update(currentLevelMap, TILE_SIZE);
            handleTileCollisions();
            
            dynamicObjects.forEach(obj => {
                if (checkCollision(player, obj)) {
                    resetPlayer();
                    return;
                }
            });

            activeBullets.forEach(bullet => bullet.update());
            activeBullets = activeBullets.filter(bullet => {
                const hitEnemyIndex = dynamicObjects.findIndex(enemy => checkCollision(bullet, enemy));
                if (hitEnemyIndex !== -1) {
                    score += 250;
                    dynamicObjects.splice(hitEnemyIndex, 1);
                    return false;
                }
                return bullet.x > -TILE_SIZE && bullet.x < currentLevelWidth;
            });

            updateDynamicObjects();
            updateCamera();
        },
        draw: () => {
            drawGame();
            pauseBtn.classList.remove('hidden');
        }
    },
    PAUSED: {
        update: () => { /* No update needed for pause menu */ },
        draw: () => {
            drawGame();
            drawPauseMenu();
            pauseBtn.classList.remove('hidden');
        }
    },
    GAME_OVER: {
        update: () => { /* No update needed for game over screen */ },
        draw: () => {
            drawGameOverScreen();
            pauseBtn.classList.add('hidden');
        }
    }
};

let currentGameState = gameStates.HOME;

// -- MAIN GAME LOOP --
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    currentGameState.update();
    currentGameState.draw();

    requestAnimationFrame(gameLoop);
}

// --- INITIALIZE ---
pauseBtn.classList.add('hidden');
setupTouchControls();
setupPauseControls();
loadAssets(gameLoop, (errorMsg) => {
    console.error("Game failed to initialize due to asset loading error.");
    alert(errorMsg);
});