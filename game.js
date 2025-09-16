// Get the canvas and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// -- GAME CONSTANTS & VARIABLES --
const TILE_SIZE = 40;
const GRAVITY = 0.5;
const PLAYER_SPEED = 5;
const JUMP_POWER = 12;

let score = 0;
let currentLevelIndex = 0;
let gameState = 'HOME'; // 'HOME', 'PLAYING', 'GAME_OVER'

// -- LEVEL STRUCTURES --
// 0=Empty | 1=Platform | 2=Goal | 3=Gem | 5=Enemy | 6=Spikes | 7=Phantom Wall
const originalLevels = [
    // Level 1
    {
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
            [1, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 1],
            [1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 3, 0, 0, 1, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 3, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
            [1, 0, 3, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ]
    },
    // Level 2
    {
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 2, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 3, 0, 1],
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
let dynamicObjects = []; // To hold enemies and moving traps

// -- PLAYER & CAMERA OBJECTS --
const player = {
    x: 80, y: 80,
    width: TILE_SIZE - 10, height: TILE_SIZE - 5,
    velocityX: 0, velocityY: 0,
    isJumping: false,
    color: '#ff5733'
};
const camera = { x: 0, y: 0 };

// -- KEYBOARD & TOUCH INPUT --
const keys = { ArrowLeft: false, ArrowRight: false, Space: false };
window.addEventListener('keydown', (e) => {
    if ((gameState === 'HOME' || gameState === 'GAME_OVER') && e.code === 'Enter') startGame();
    else if (gameState === 'PLAYING' && e.code in keys) keys[e.code] = true;
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
    btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); keys.Space = true; });
    btnJump.addEventListener('touchend', (e) => { e.preventDefault(); keys.Space = false; });
    canvas.addEventListener('touchstart', (e) => { if (gameState === 'HOME' || gameState === 'GAME_OVER') startGame(); });
}

// -- GAME STATE & LEVEL MANAGEMENT --
function loadLevel(levelIndex) {
    const levelData = originalLevels[levelIndex];
    currentLevelMap = JSON.parse(JSON.stringify(levelData.map));
    currentLevelWidth = currentLevelMap[0].length * TILE_SIZE;
    dynamicObjects = [];
    for (let row = 0; row < currentLevelMap.length; row++) {
        for (let col = 0; col < currentLevelMap[row].length; col++) {
            if (currentLevelMap[row][col] === 5) { // Enemy
                dynamicObjects.push({ x: col * TILE_SIZE, y: row * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, type: 'enemy', speed: 1, direction: 1, startX: col * TILE_SIZE, range: 120 });
                currentLevelMap[row][col] = 0;
            }
        }
    }
    resetPlayer();
}
function resetPlayer() { player.x = 80; player.y = 80; player.velocityX = 0; player.velocityY = 0; }
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
            if (tile === 1 || tile === 7) { ctx.fillStyle = '#3498db'; ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE); }
            else if (tile === 2) { ctx.fillStyle = '#f1c40f'; ctx.fillRect(tileX + 10, tileY + 10, TILE_SIZE - 20, TILE_SIZE - 20); }
            else if (tile === 3) { ctx.fillStyle = '#9b59b6'; ctx.beginPath(); ctx.arc(tileX + TILE_SIZE / 2, tileY + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2); ctx.fill(); }
            else if (tile === 6) { ctx.fillStyle = '#95a5a6'; ctx.beginPath(); for (let i = 0; i < TILE_SIZE; i += 10) { ctx.moveTo(tileX + i, tileY + TILE_SIZE); ctx.lineTo(tileX + i + 5, tileY); ctx.lineTo(tileX + i + 10, tileY + TILE_SIZE); } ctx.closePath(); ctx.fill(); }
        }
    }
    dynamicObjects.forEach(obj => { if (obj.type === 'enemy') { ctx.fillStyle = '#c0392b'; ctx.fillRect(obj.x - camera.x, obj.y - camera.y, obj.width, obj.height); } });
    ctx.fillStyle = player.color; ctx.fillRect(player.x - camera.x, player.y - camera.y, player.width, player.height);
    ctx.fillStyle = '#fff'; ctx.font = '24px Arial'; ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 30); ctx.fillText(`Level: ${currentLevelIndex + 1}`, canvas.width - 120, 30);
}
function drawHomeScreen() { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#fff'; ctx.font = '50px Arial'; ctx.textAlign = 'center'; ctx.fillText('Dangerous Dave Clone', canvas.width / 2, canvas.height / 2 - 40); ctx.font = '24px Arial'; ctx.fillText('Press Enter or Tap Screen to Start', canvas.width / 2, canvas.height / 2 + 20); }
function drawGameOverScreen() { ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#fff'; ctx.font = '50px Arial'; ctx.textAlign = 'center'; ctx.fillText('You Win!', canvas.width / 2, canvas.height / 2 - 40); ctx.font = '30px Arial'; ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20); ctx.font = '20px Arial'; ctx.fillText('Press Enter or Tap Screen to Play Again', canvas.width / 2, canvas.height / 2 + 70); }

// -- COLLISION & UPDATE LOGIC --
function checkCollision(objA, objB) { return (objA.x < objB.x + objB.width && objA.x + objA.width > objB.x && objA.y < objB.y + objB.height && objA.y + objA.height > objB.y); }
function updateDynamicObjects() { dynamicObjects.forEach(obj => { if (obj.type === 'enemy') { obj.x += obj.speed * obj.direction; if (obj.x > obj.startX + obj.range || obj.x < obj.startX) obj.direction *= -1; } }); }
function updateCamera() { camera.x = player.x - canvas.width / 2; if (camera.x < 0) camera.x = 0; if (camera.x > currentLevelWidth - canvas.width) camera.x = currentLevelWidth - canvas.width; }

/**
 * NEW: Axis-Separated Collision Handling.
 * This function is now called twice: once for the X-axis and once for the Y-axis.
 * This prevents corner-snagging and tunneling bugs.
 */
function handleTileCollisions() {
    for (let row = 0; row < currentLevelMap.length; row++) {
        for (let col = 0; col < currentLevelMap[row].length; col++) {
            const tile = currentLevelMap[row][col];
            if (tile === 0 || tile === 7) continue; // Skip empty and phantom tiles

            const tileX = col * TILE_SIZE;
            const tileY = row * TILE_SIZE;
            const tileBox = { x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE };

            if (checkCollision(player, tileBox)) {
                switch(tile) {
                    case 1: // Solid wall
                        // This logic is now handled in the main update loop by separating axes
                        break;
                    case 2: // Goal
                        nextLevel();
                        return; // Exit to avoid further checks after level change
                    case 3: // Gem
                        score += 100;
                        currentLevelMap[row][col] = 0; // Remove gem
                        break;
                    case 6: // Spikes
                        resetPlayer();
                        return; // Exit to avoid further checks after player reset
                }
            }
        }
    }
}

// Main update function with NEW separated axis logic
function update() {
    // 1. Get Input
    player.velocityX = 0;
    if (keys.ArrowLeft) player.velocityX = -PLAYER_SPEED;
    if (keys.ArrowRight) player.velocityX = PLAYER_SPEED;
    if (keys.Space && !player.isJumping) {
        player.velocityY = -JUMP_POWER;
        player.isJumping = true;
    }

    // 2. Apply forces (Gravity)
    player.velocityY += GRAVITY;

    // 3. Handle Horizontal Movement and Collisions
    player.x += player.velocityX;
    for (let row = 0; row < currentLevelMap.length; row++) {
        for (let col = 0; col < currentLevelMap[row].length; col++) {
            const tile = currentLevelMap[row][col];
            if (tile === 1) { // Only check solid walls
                const tileX = col * TILE_SIZE;
                const tileY = row * TILE_SIZE;
                if (checkCollision(player, {x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE})) {
                    if (player.velocityX > 0) player.x = tileX - player.width;
                    if (player.velocityX < 0) player.x = tileX + TILE_SIZE;
                }
            }
        }
    }
    
    // 4. Handle Vertical Movement and Collisions
    player.y += player.velocityY;
    for (let row = 0; row < currentLevelMap.length; row++) {
        for (let col = 0; col < currentLevelMap[row].length; col++) {
            const tile = currentLevelMap[row][col];
            if (tile === 1) { // Only check solid walls
                const tileX = col * TILE_SIZE;
                const tileY = row * TILE_SIZE;
                 if (checkCollision(player, {x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE})) {
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
    
    // 5. Handle collisions with non-solid tiles (gems, goals, spikes)
    handleTileCollisions();

    // 6. Handle collisions with dynamic objects (enemies)
    dynamicObjects.forEach(obj => {
        if (checkCollision(player, obj)) {
            resetPlayer();
            return;
        }
    });

    // 7. Update other game elements
    updateDynamicObjects();
    updateCamera();
}


// -- MAIN GAME LOOP --
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    switch (gameState) {
        case 'HOME': drawHomeScreen(); break;
        case 'PLAYING': update(); drawGame(); break;
        case 'GAME_OVER': drawGameOverScreen(); break;
    }
    requestAnimationFrame(gameLoop);
}


// --- INITIALIZE ---
setupTouchControls(); // Call the setup function for mobile controls
gameLoop(); // Start the game
