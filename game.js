// Get the canvas and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const pauseBtn = document.getElementById('pause-btn');

// -- GAME CONSTANTS & VARIABLES --
const TILE_SIZE = 40;
const GRAVITY = 0.5;
const PLAYER_SPEED = 5;
const JUMP_POWER = 12;

let score = 0;
let currentLevelIndex = 0;
let gameState = 'HOME'; // 'HOME', 'PLAYING', 'PAUSED', 'GAME_OVER'

// ASSET MANAGEMENT
const assets = {};
const assetPaths = {
    wall: 'assets/wall.png',
    coin: 'assets/coin.png',
    goal: 'assets/goal.png',
    phantom_wall: 'assets/phantom_wall.png',
    spikes: 'assets/spikes.png',
    enemy: 'assets/enemy.png',
    player_idle: 'assets/player_idle.png',
    player_jump: 'assets/player_jump.png'
};

function loadAssets(onComplete) {
    let assetsLoaded = 0;
    const totalAssets = Object.keys(assetPaths).length;

    const onAssetLoad = () => {
        assetsLoaded++;
        if (assetsLoaded === totalAssets) {
            onComplete();
        }
    };

    for (const name in assetPaths) {
        assets[name] = new Image();
        assets[name].src = assetPaths[name];
        assets[name].onload = onAssetLoad;
        assets[name].onerror = () => {
            console.error(`Failed to load asset: ${assetPaths[name]}`);
            onAssetLoad();
        };
    }
}


// -- LEVEL STRUCTURES --
// 0=Empty | 1=Platform | 2=Goal | 3=Coin | 5=Enemy | 6=Spikes | 7=Phantom Wall
const originalLevels = [
    // Level 1
    {
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 1],
            [1, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 1],
            [1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 3, 0, 0, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 3, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
            [1, 0, 3, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ]
    },
    // Level 2
    {
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
            [1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 3, 0, 1],
            [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1],
            [1, 0, 3, 0, 0, 1, 3, 0, 1, 3, 0, 1, 3, 0, 1, 0, 3, 0, 0, 1],
            [1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1],
            [1, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1],
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
    }
];
let currentLevelMap;
let currentLevelWidth;
let dynamicObjects = [];

// -- PLAYER & CAMERA OBJECTS --
const player = {
    x: 80, y: 80,
    width: TILE_SIZE - 10, height: TILE_SIZE - 5,
    velocityX: 0, velocityY: 0,
    isJumping: false,
    direction: 1, // 1 for right, -1 for left
    color: '#ff5733'
};
const camera = { x: 0, y: 0 };

// -- PAUSE MENU --
const resumeBtn = { x: canvas.width / 2 - 100, y: canvas.height / 2 - 25, width: 200, height: 50 };
const exitBtn = { x: canvas.width / 2 - 100, y: canvas.height / 2 + 45, width: 200, height: 50 };

// -- KEYBOARD & TOUCH INPUT --
const keys = { ArrowLeft: false, ArrowRight: false, ArrowUp: false };

window.addEventListener('keydown', (e) => {
    if ((gameState === 'HOME' || gameState === 'GAME_OVER') && e.code === 'Enter') {
        startGame();
    } else if (gameState === 'PLAYING' && e.code in keys) {
        keys[e.code] = true;
    } else if (e.code === 'Escape') {
        if (gameState === 'PLAYING') gameState = 'PAUSED';
        else if (gameState === 'PAUSED') gameState = 'PLAYING';
    }
});
window.addEventListener('keyup', (e) => { if (e.code in keys) keys[e.code] = false; });

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
    canvas.addEventListener('touchstart', (e) => { if (gameState === 'HOME' || gameState === 'GAME_OVER') startGame(); });
}

function setupPauseControls() {
    pauseBtn.addEventListener('click', () => {
        if (gameState === 'PLAYING') gameState = 'PAUSED';
    });

    canvas.addEventListener('click', (e) => {
        if (gameState !== 'PAUSED') return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Check if Resume button is clicked
        if (mouseX >= resumeBtn.x && mouseX <= resumeBtn.x + resumeBtn.width &&
            mouseY >= resumeBtn.y && mouseY <= resumeBtn.y + resumeBtn.height) {
            gameState = 'PLAYING';
        }

        // Check if Exit button is clicked
        if (mouseX >= exitBtn.x && mouseX <= exitBtn.x + exitBtn.width &&
            mouseY >= exitBtn.y && mouseY <= exitBtn.y + exitBtn.height) {
            gameState = 'HOME';
        }
    });
}


// -- GAME STATE & LEVEL MANAGEMENT --
function loadLevel(levelIndex) {
    const levelData = originalLevels[levelIndex];
    currentLevelMap = JSON.parse(JSON.stringify(levelData.map));
    currentLevelWidth = currentLevelMap[0].length * TILE_SIZE;
    dynamicObjects = [];
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
function resetPlayer() { player.x = 80; player.y = 80; player.velocityX = 0; player.velocityY = 0; player.direction = 1; }
function startGame() { score = 0; currentLevelIndex = 0; loadLevel(currentLevelIndex); gameState = 'PLAYING'; }
function nextLevel() { currentLevelIndex++; if (currentLevelIndex >= originalLevels.length) gameState = 'GAME_OVER'; else loadLevel(currentLevelIndex); }

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
                const coinSize = TILE_SIZE * 0.8;
                const offset = (TILE_SIZE - coinSize) / 2;
                if (assets.coin && assets.coin.complete && assets.coin.naturalHeight !== 0) {
                    ctx.drawImage(assets.coin, tileX + offset, tileY + offset, coinSize, coinSize);
                } else {
                    ctx.fillStyle = '#ffff00';
                    ctx.beginPath();
                    ctx.arc(tileX + TILE_SIZE / 2, tileY + TILE_SIZE / 2, (TILE_SIZE / 3) * 0.8, 0, Math.PI * 2);
                    ctx.fill();
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

    const playerAsset = player.isJumping ? assets.player_jump : assets.player_idle;
    if (playerAsset && playerAsset.complete && playerAsset.naturalHeight !== 0) {
        const playerX = player.x - camera.x;
        const playerY = player.y - camera.y;
        if (player.direction === 1) {
            ctx.drawImage(playerAsset, playerX, playerY, player.width, player.height);
        } else {
            ctx.save();
            ctx.translate(playerX + player.width, playerY);
            ctx.scale(-1, 1);
            ctx.drawImage(playerAsset, 0, 0, player.width, player.height);
            ctx.restore();
        }
    } else {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x - camera.x, player.y - camera.y, player.width, player.height);
    }

    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`Level: ${currentLevelIndex + 1}`, canvas.width - 120, 30);
}

function drawHomeScreen() {
    // Reset canvas state for this specific screen to ensure visibility
    ctx.globalAlpha = 1.0; // Ensure full opacity
    ctx.fillStyle = '#000'; // Set background color to black

    // Draw background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw title text
    ctx.fillStyle = '#fff'; // Set text color to white
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Dangerous Dave Clone', canvas.width / 2, canvas.height / 2 - 40);

    // Draw instruction text
    ctx.font = '24px Arial';
    ctx.fillText('Press Enter or Tap Screen to Start', canvas.width / 2, canvas.height / 2 + 20);
}

function drawGameOverScreen() {
    // Draw the semi-transparent background overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the "You Win!" text
    ctx.fillStyle = '#fff';
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('You Win!', canvas.width / 2, canvas.height / 2 - 40);
    
    // Draw the final score
    ctx.font = '30px Arial';
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    
    // Draw the instruction to play again
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
                    case 6:
                        resetPlayer();
                        return;
                }
            }
        }
    }
}

function update() {
    player.velocityX = 0;
    if (keys.ArrowLeft) {
        player.velocityX = -PLAYER_SPEED;
        player.direction = -1;
    }
    if (keys.ArrowRight) {
        player.velocityX = PLAYER_SPEED;
        player.direction = 1;
    }
    if (keys.ArrowUp && !player.isJumping) {
        player.velocityY = -JUMP_POWER;
        player.isJumping = true;
    }

    player.velocityY += GRAVITY;

    player.x += player.velocityX;
    for (let row = 0; row < currentLevelMap.length; row++) {
        for (let col = 0; col < currentLevelMap[row].length; col++) {
            const tile = currentLevelMap[row][col];
            if (tile === 1) {
                const tileX = col * TILE_SIZE;
                const tileY = row * TILE_SIZE;
                if (checkCollision(player, { x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE })) {
                    if (player.velocityX > 0) player.x = tileX - player.width;
                    if (player.velocityX < 0) player.x = tileX + TILE_SIZE;
                }
            }
        }
    }

    player.y += player.velocityY;
    for (let row = 0; row < currentLevelMap.length; row++) {
        for (let col = 0; col < currentLevelMap[row].length; col++) {
            const tile = currentLevelMap[row][col];
            if (tile === 1) {
                const tileX = col * TILE_SIZE;
                const tileY = row * TILE_SIZE;
                if (checkCollision(player, { x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE })) {
                    if (player.velocityY > 0) {
                        player.y = tileY - player.height;
                        player.isJumping = false;
                    }
                    if (player.velocityY < 0) player.y = tileY + TILE_SIZE;
                    player.velocityY = 0;
                }
            }
        }
    }

    handleTileCollisions();

    dynamicObjects.forEach(obj => {
        if (checkCollision(player, obj)) {
            resetPlayer();
            return;
        }
    });

    updateDynamicObjects();
    updateCamera();
}

// -- MAIN GAME LOOP --
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'PLAYING') {
        pauseBtn.style.display = 'block';
    } else {
        pauseBtn.style.display = 'none';
    }

    switch (gameState) {
        case 'HOME':
            drawHomeScreen();
            break;
        case 'PLAYING':
            update();
            drawGame();
            break;
        case 'PAUSED':
            drawGame();
            drawPauseMenu();
            break;
        case 'GAME_OVER':
            drawGameOverScreen();
            break;
    }
    requestAnimationFrame(gameLoop);
}


// --- INITIALIZE ---
setupTouchControls();
setupPauseControls();
loadAssets(gameLoop);