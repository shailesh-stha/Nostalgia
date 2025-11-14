// Get the canvas and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
// SET INTERNAL RESOLUTION: This keeps the game's coordinate system consistent
// CSS will handle scaling this to fit the responsive container.
canvas.width = 800;
canvas.height = 550; // UPDATED: Changed from 500 to 550 (11 rows * 50px)
const ctx = canvas.getContext('2d');
const pauseBtn = document.getElementById('pause-btn');

// -- GAME CONSTANTS & VARIABLES --
const TILE_SIZE = 50; 
const GRAVITY = 0.3;
const PLAYER_SPEED = 4;
const JUMP_POWER = 8;
const BULLET_SPEED = 8;
const FRICTION = 0;
const MAX_JUMP_TIME = 1;
const COYOTE_TIME = 5;

// Gameplay constants
const PLAYER_MAX_HEALTH = 3;

// -- PARTICLE CLASS --
class Particle {
    constructor(x, y, color, size, life, velX = (Math.random() - 0.5) * 4, velY = (Math.random() - 0.5) * 4 - 2, hasGravity = true) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * size + 2;
        this.life = life;
        this.maxLife = life; // NEW: Store the initial life for fading calculation
        this.velocityX = velX;
        this.velocityY = velY;
        this.hasGravity = hasGravity;
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
        if (this.hasGravity) {
            this.velocityY += GRAVITY / 2;
        }
        this.life--;
    }

    draw(ctx, camera) {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        // UPDATED: Draw the rectangle centered on the particle's x/y coordinates
        ctx.fillRect(this.x - camera.x - this.size / 2, this.y - camera.y - this.size / 2, this.size, this.size);
        ctx.restore();
    }
}


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
        this.isFalling = false;
        this.isOnGround = false;
        this.direction = 1;
        this.color = color;
        this.jumpTimer = 0;
        this.coyoteTimeCounter = 0;
        
        this.walkSoundTimer = 0;

        this.maxHealth = PLAYER_MAX_HEALTH;
        this.health = this.maxHealth;
    }

    // Handle player's movement and physics
    update(map, tile_size, dynamicObjects) { 
        // Player horizontal movement and deceleration
        if (keys.ArrowLeft || keys.KeyA) {
            this.velocityX = -PLAYER_SPEED;
            this.direction = -1;
        } else if (keys.ArrowRight || keys.KeyD) {
            this.velocityX = PLAYER_SPEED;
            this.direction = 1;
        } else {
            this.velocityX *= FRICTION;
        }

        // Walking sound logic
        const isTryingToMove = (keys.ArrowLeft || keys.KeyA || keys.ArrowRight || keys.KeyD);
        if (isTryingToMove && this.isOnGround) {
            this.walkSoundTimer--;
            if (this.walkSoundTimer <= 0) {
                playWalkSound();
                this.walkSoundTimer = 20; 
            }
        }

        // Variable jump height logic
        if ((keys.ArrowUp || keys.Space || keys.KeyW)) {
            if (this.coyoteTimeCounter > 0) {
                if (assets.sound_jump) {
                    assets.sound_jump.currentTime = 0;
                    assets.sound_jump.play();
                }
                this.velocityY = -JUMP_POWER;
                this.isJumping = true;
                this.isFalling = false;
                this.isOnGround = false;
                this.jumpTimer = 0;
                this.coyoteTimeCounter = 0;
            } else if (this.isJumping && this.jumpTimer < MAX_JUMP_TIME) {
                this.velocityY -= 0.5;
                this.jumpTimer++;
            }
        } else {
            this.isJumping = false;
        }

        this.velocityY += GRAVITY;

        if (this.velocityY > 0) {
            this.isFalling = true;
        }

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
                        this.velocityX = 0;
                    }
                }
            }
        }

        // Y-axis movement and collision
        this.y += this.velocityY;
        this.isOnGround = false;
        let onMovingPlatform = null; 

        // Check against solid tiles
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
                            this.isOnGround = true;
                            this.isFalling = false;
                        }
                        if (this.velocityY < 0) {
                            this.y = tileY + tile_size;
                            this.velocityY = 0;
                        }
                    }
                }
            }
        }

        // Check against moving platforms
        dynamicObjects.forEach(obj => {
            if (obj.type === 'moving_platform') {
                if (checkCollision(this, obj)) {
                    if (this.velocityY > 0 && (this.y + this.height - this.velocityY) <= obj.y) {
                        this.y = obj.y - this.height;
                        this.velocityY = 0;
                        this.isOnGround = true;
                        this.isFalling = false;
                        onMovingPlatform = obj;
                    }
                    else if (this.velocityY < 0 && this.y - this.velocityY >= obj.y + obj.height) {
                         this.y = obj.y + obj.height;
                         this.velocityY = 0;
                    }
                    else {
                        if(this.velocityX > 0) this.x = obj.x - this.width;
                        if(this.velocityX < 0) this.x = obj.x + obj.width;
                    }
                }
            }
        });
        
        // Stick to the moving platform
        if (onMovingPlatform) {
            this.x += onMovingPlatform.velocityX;
        }

        // Coyote Time Logic
        if (this.isOnGround) {
            this.coyoteTimeCounter = COYOTE_TIME;
        } else {
            this.coyoteTimeCounter--;
        }
    }

    // Draw the player
    draw(ctx, assets, camera) {
        let playerAsset = assets.player_idle;

        if (!this.isOnGround) {
            playerAsset = this.isFalling ? assets.player_land : assets.player_jump;
        }

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
    
    // Method to handle taking damage
    takeDamage(amount) {
        if (assets.sound_damage) {
            assets.sound_damage.currentTime = 0;
            assets.sound_damage.play();
        }

        this.health -= amount;
        triggerScreenShake(15, 4);

        if (this.health <= 0) {
            gameOverMessage = 'Game Over';
            currentGameState = gameStates.GAME_OVER;
        } else {
            // Respawn at the start of the level
            resetPlayerPosition();
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
        // Spawn a trail particle without gravity
        particles.push(new Particle(
            this.x + this.width / 2, 
            this.y + this.height / 2, 
            this.color, 
            this.width / 1.5, 
            10, // life
            (Math.random() - 0.5) * 0.5, // low velocity x
            (Math.random() - 0.5) * 0.5,  // low velocity y
            false // hasGravity = false
        ));
        this.x += this.velocityX;
    }

    draw(ctx, camera) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x - camera.x + this.width / 2, this.y - camera.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Enemy Bullet Class
class EnemyBullet extends Bullet {
    constructor(x, y, direction) {
        super(x, y, direction);
        this.color = '#ff6b6b';
    }
}


let score = 0;
let bullets = 0;
let currentLevelIndex = 0;
let activeBullets = [];
let enemyBullets = []; 
let particles = []; 
const player = new Player(80, 80, TILE_SIZE - 10, TILE_SIZE - 5, '#ff5733');
const camera = { x: 0, y: 0, shakeDuration: 0, shakeMagnitude: 0 }; 
let gameOverMessage = '';
let currentSpawnPoint = { row: 1, col: 1 }; // Default spawn point


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
    player_land: 'assets/player_land.png',
    gun_sound: 'assets/gun_sound.mp3',
    heart: 'assets/heart.png',
    enemy_shooter: 'assets/enemy_shooter.png',
    platform_move: 'assets/platform_move.png',
    sound_jump: 'assets/sound_jump.mp3',
    sound_walk_dirt1: 'assets/sound_walk_dirt1.mp3',
    sound_collect_coin: 'assets/sound_collect_coin.mp3',
    sound_damage: 'assets/sound_damage.mp3'
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
// Level data is now in levels.js

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
    if ((e.code === 'Enter' || e.code === 'Space') && (currentGameState === gameStates.HOME || currentGameState === gameStates.GAME_OVER)) {
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
        // UPDATED: Scale mouse coordinates to match the canvas's internal resolution (800x500)
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        if (mouseX >= resumeBtn.x && mouseX <= resumeBtn.x + resumeBtn.width &&
            mouseY >= resumeBtn.y && mouseY <= resumeBtn.y + resumeBtn.height) {
            currentGameState = gameStates.PLAYING;
        }

        if (mouseX >= exitBtn.x && mouseX <= exitBtn.x + exitBtn.width &&
            mouseY >= exitBtn.y && mouseY <= exitBtn.y + exitBtn.height) {
            currentGameState = gameStates.HOME;
        }
    });
}

function shootBullet() {
    if (bullets > 0) {
        bullets--;
        const bulletX = player.x + (player.width / 2);
        const bulletY = player.y + (player.height / 2);
        activeBullets.push(new Bullet(bulletX, bulletY, player.direction));

        if (assets.gun_sound) {
            assets.gun_sound.currentTime = 0;
            assets.gun_sound.play();
        }
    }
}

// UPDATED: Simplified walking sound logic
function playWalkSound() {
    const soundToPlay = assets.sound_walk_dirt1;
    if (soundToPlay && soundToPlay.readyState >= 3) {
        soundToPlay.currentTime = 0;
        soundToPlay.play();
    }
}


// -- GAME STATE & LEVEL MANAGEMENT --
function loadLevel(levelIndex) {
    const levelData = originalLevels[levelIndex];
    currentLevelMap = JSON.parse(JSON.stringify(levelData.map));
    currentLevelWidth = currentLevelMap[0].length * TILE_SIZE;
    
    // UPDATED: Load the spawn point for the level
    currentSpawnPoint = levelData.spawn || { row: 1, col: 1 }; // Fallback to default

    dynamicObjects = [];
    activeBullets = [];
    enemyBullets = [];
    particles = [];

    for (let row = 0; row < currentLevelMap.length; row++) {
        for (let col = 0; col < currentLevelMap[row].length; col++) {
            const tile = currentLevelMap[row][col];
            const x = col * TILE_SIZE;
            const y = row * TILE_SIZE;

            if (tile === 5) { // Patrolling Enemy
                dynamicObjects.push({ type: 'enemy_patrol', x: x, y: y, width: TILE_SIZE, height: TILE_SIZE, speed: 1, direction: 1, startX: x, range: 120 });
                currentLevelMap[row][col] = 0;
            } else if (tile === 8) { // Moving Platform
                dynamicObjects.push({ type: 'moving_platform', x: x, y: y, width: TILE_SIZE * 2, height: TILE_SIZE / 2, speed: 1, direction: 1, startX: x, range: 160, velocityX: 1 });
                currentLevelMap[row][col] = 0;
            } else if (tile === 9) { // Shooter Enemy
                dynamicObjects.push({ type: 'enemy_shooter', x: x, y: y, width: TILE_SIZE, height: TILE_SIZE, shootCooldown: 120, direction: -1 });
                currentLevelMap[row][col] = 0;
            }
        }
    }
    resetPlayerPosition();
}

// UPDATED: Now uses the dynamic spawn point
function resetPlayerPosition() {
    player.x = currentSpawnPoint.col * TILE_SIZE;
    player.y = currentSpawnPoint.row * TILE_SIZE;
    player.velocityX = 0;
    player.velocityY = 0;
    player.direction = 1;
}

function restartLevel() {
    player.health = player.maxHealth;
    loadLevel(currentLevelIndex);
}

function startGame() {
    score = 0;
    bullets = 1; // Player starts with 1 bullet
    currentLevelIndex = 0;
    player.health = player.maxHealth;
    loadLevel(currentLevelIndex);
    currentGameState = gameStates.PLAYING;
}
function nextLevel() {
    currentLevelIndex++;
    if (currentLevelIndex >= originalLevels.length) {
        gameOverMessage = 'You Win!';
        currentGameState = gameStates.GAME_OVER;
    } else {
        loadLevel(currentLevelIndex);
    }
}

// -- DRAWING FUNCTIONS --
function drawGame() {
    const camX = camera.x + (camera.shakeDuration > 0 ? (Math.random() - 0.5) * camera.shakeMagnitude : 0);
    const camY = camera.y + (camera.shakeDuration > 0 ? (Math.random() - 0.5) * camera.shakeMagnitude : 0);

    const startCol = Math.floor(camX / TILE_SIZE);
    const endCol = Math.min(startCol + Math.ceil(canvas.width / TILE_SIZE) + 1, currentLevelMap[0].length);
    for (let row = 0; row < currentLevelMap.length; row++) {
        for (let col = startCol; col < endCol; col++) {
            const tile = currentLevelMap[row][col];
            const tileX = col * TILE_SIZE - camX;
            const tileY = row * TILE_SIZE - camY;
            if (tile === 0) continue;

            let asset = null;
            switch(tile) {
                case 1: asset = assets.wall; break;
                case 2: asset = assets.goal; break;
                case 3: asset = assets.coin; break;
                case 4: asset = assets.gun; break;
                case 6: asset = assets.spikes; break;
                case 7: asset = assets.phantom_wall; break;
            }
            if (asset && asset.complete && asset.naturalHeight !== 0) {
                ctx.drawImage(asset, tileX, tileY, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    dynamicObjects.forEach(obj => {
        let asset = null;
        if (obj.type === 'enemy_patrol') asset = assets.enemy;
        if (obj.type === 'enemy_shooter') asset = assets.enemy_shooter;
        if (obj.type === 'moving_platform') asset = assets.platform_move;

        const objX = obj.x - camX;
        const objY = obj.y - camY;

        if (asset && asset.complete && asset.naturalHeight !== 0) {
            if (obj.direction === 1) {
                ctx.drawImage(asset, objX, objY, obj.width, obj.height);
            } else {
                ctx.save();
                ctx.translate(objX + obj.width, objY);
                ctx.scale(-1, 1);
                ctx.drawImage(asset, 0, 0, obj.width, obj.height);
                ctx.restore();
            }
        } else {
             ctx.fillStyle = '#c0392b';
             ctx.fillRect(obj.x - camX, obj.y - camY, obj.width, obj.height);
        }
    });

    activeBullets.forEach(bullet => bullet.draw(ctx, {x: camX, y: camY}));
    enemyBullets.forEach(bullet => bullet.draw(ctx, {x: camX, y: camY}));
    particles.forEach(p => p.draw(ctx, {x: camX, y: camY}));

    player.draw(ctx, assets, {x: camX, y: camY});

    // Draw UI on top
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`Level: ${currentLevelIndex + 1}`, canvas.width - 120, 30);
    drawBulletCount();
    drawHealthUI();
}

function drawHealthUI() {
    const heartSize = 30;
    for (let i = 0; i < player.maxHealth; i++) {
        if (i < player.health) {
             if (assets.heart && assets.heart.complete) {
                ctx.drawImage(assets.heart, 10 + (i * (heartSize + 5)), 40, heartSize, heartSize);
             }
        }
    }
}

function drawBulletCount() {
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Bullets: ${bullets}`, canvas.width / 2, 30);
}

// --- REFACTORED HOME SCREEN LOGIC (FOR PERFORMANCE) ---
let preRenderedBackground = null;
let backgroundY = 0;
const backgroundScrollSpeed = 0.5;

function initHomeScreenBackground() {
    // Create an off-screen canvas for pre-rendering
    preRenderedBackground = document.createElement('canvas');
    preRenderedBackground.width = canvas.width;
    preRenderedBackground.height = canvas.height * 2; // Twice the height for seamless scrolling
    const bgCtx = preRenderedBackground.getContext('2d');

    // Draw the sky
    bgCtx.fillStyle = '#87CEEB';
    bgCtx.fillRect(0, 0, preRenderedBackground.width, preRenderedBackground.height);
    
    // Draw the blurred, faded bricks onto it once
    if (assets.wall && assets.wall.complete) {
        bgCtx.save();
        bgCtx.filter = 'blur(3px)';
        bgCtx.globalAlpha = 0.4;
        // Draw twice the number of bricks to fill the double-height canvas
        for (let i = 0; i < 60; i++) { 
            const x = Math.random() * preRenderedBackground.width;
            const y = Math.random() * preRenderedBackground.height;
            const size = Math.random() * 50 + 20;
            bgCtx.drawImage(assets.wall, x, y, size, size);
        }
        bgCtx.restore();
    }
}

function updateHomeScreenBackground() {
    // Scroll the Y-position of the background
    backgroundY += backgroundScrollSpeed;
    // If it has scrolled its entire height, reset to 0 to create a loop
    if (backgroundY >= canvas.height) {
        backgroundY = 0;
    }
}

function drawHomeScreen() {
    // If the background hasn't been rendered yet, do a simple fallback
    if (!preRenderedBackground) {
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        // Draw the pre-rendered canvas twice to create a seamless vertical scroll
        ctx.drawImage(preRenderedBackground, 0, backgroundY);
        ctx.drawImage(preRenderedBackground, 0, backgroundY - preRenderedBackground.height);
    }

    // Draw UI text on top
    ctx.fillStyle = '#fff';
    
    // Draw the title
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('The Platformer', canvas.width / 2, canvas.height / 2 - 20);

    // Draw the prompt
    ctx.font = '24px Arial';
    ctx.fillText('Press Enter, Space, or Tap Screen to Start', canvas.width / 2, canvas.height / 2 + 40);
}


function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gameOverMessage, canvas.width / 2, canvas.height / 2 - 40);
    
    if (gameOverMessage === 'You Win!') {
        ctx.font = '30px Arial';
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    }

    ctx.font = '20px Arial';
    ctx.fillText('Press Enter, Space, or Tap Screen to Play Again', canvas.width / 2, canvas.height / 2 + 70);
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

function spawnParticles(x, y, amount, color) {
    for (let i = 0; i < amount; i++) {
        particles.push(new Particle(x, y, color, 8, 40));
    }
}

function triggerScreenShake(duration, magnitude) {
    camera.shakeDuration = duration;
    camera.shakeMagnitude = magnitude;
}


function updateDynamicObjects() {
    dynamicObjects.forEach(obj => {
        if (obj.type === 'enemy_patrol' || obj.type === 'moving_platform') {
            obj.x += obj.speed * obj.direction;
            obj.velocityX = obj.speed * obj.direction;
            if (obj.x > obj.startX + obj.range || obj.x < obj.startX) {
                obj.direction *= -1;
            }
        } else if (obj.type === 'enemy_shooter') {
            obj.shootCooldown--;
            obj.direction = (player.x < obj.x) ? -1 : 1;
            if (obj.shootCooldown <= 0) {
                const bulletX = obj.x + (obj.width / 2);
                const bulletY = obj.y + (obj.height / 2);
                enemyBullets.push(new EnemyBullet(bulletX, bulletY, obj.direction));
                obj.shootCooldown = 180; 
            }
        }
    });
}

function updateCamera() {
    if (camera.shakeDuration > 0) {
        camera.shakeDuration--;
    }

    camera.x = player.x - canvas.width / 2;
    if (camera.x < 0) camera.x = 0;
    if (camera.x > currentLevelWidth - canvas.width) camera.x = currentLevelWidth - canvas.width;
}

function handleTileCollisions() {
    for (let row = 0; row < currentLevelMap.length; row++) {
        for (let col = 0; col < currentLevelMap[row].length; col++) {
            const tile = currentLevelMap[row][col];
            if (tile === 0 || tile === 1 || tile === 7) continue;

            const tileX = col * TILE_SIZE;
            const tileY = row * TILE_SIZE;
            const tileBox = { x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE };

            if (checkCollision(player, tileBox)) {
                switch (tile) {
                    case 2: // Goal
                        nextLevel();
                        return;
                    case 3: // Coin
                        score += 100;
                        currentLevelMap[row][col] = 0;
                        if (assets.sound_collect_coin) {
                            assets.sound_collect_coin.currentTime = 0;
                            assets.sound_collect_coin.play();
                        }
                        break;
                    case 4: // Gun
                        bullets += 5;
                        currentLevelMap[row][col] = 0;
                        break;
                    case 6: // Spikes
                        player.takeDamage(1);
                        return;
                }
            }
        }
    }
}

const gameStates = {
    HOME: {
        update: () => {
            updateHomeScreenBackground(); // Animate the background
        },
        draw: drawHomeScreen
    },
    PLAYING: {
        update: () => {
            player.update(currentLevelMap, TILE_SIZE, dynamicObjects);
            handleTileCollisions();

            dynamicObjects.forEach(obj => {
                if (obj.type.includes('enemy') && checkCollision(player, obj)) {
                    player.takeDamage(1);
                }
            });

            activeBullets.forEach(bullet => bullet.update());
            activeBullets = activeBullets.filter(bullet => {
                const hitEnemyIndex = dynamicObjects.findIndex(enemy => enemy.type.includes('enemy') && checkCollision(bullet, enemy));
                if (hitEnemyIndex !== -1) {
                    score += 250;
                    const enemy = dynamicObjects[hitEnemyIndex];
                    spawnParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 15, '#c0392b');
                    dynamicObjects.splice(hitEnemyIndex, 1);
                    return false; 
                }
                return bullet.x > -TILE_SIZE && bullet.x < currentLevelWidth;
            });
            
            enemyBullets.forEach(bullet => bullet.update());
            enemyBullets = enemyBullets.filter(bullet => {
                if (checkCollision(bullet, player)) {
                    player.takeDamage(1);
                    return false;
                }
                return bullet.x > -TILE_SIZE && bullet.x < currentLevelWidth;
            });
            
            particles.forEach(p => p.update());
            particles = particles.filter(p => p.life > 0);

            updateDynamicObjects();
            updateCamera();
        },
        draw: () => {
            drawGame();
            pauseBtn.classList.remove('hidden');
        }
    },
    PAUSED: {
        update: () => {},
        draw: () => {
            drawGame();
            drawPauseMenu();
            pauseBtn.classList.remove('hidden');
        }
    },
    GAME_OVER: {
        update: () => {},
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
// Note: We call initHomeScreenBackground() after assets are loaded.
pauseBtn.classList.add('hidden');
setupTouchControls();
setupPauseControls();
loadAssets(() => {
    // This function runs after all assets are loaded
    initHomeScreenBackground(); // Now safe to call this
    gameLoop();
}, (errorMsg) => {
    console.error("Game failed to initialize due to asset loading error.");
    alert(errorMsg);
});