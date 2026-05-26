// Dead Zone Run - Main Script
// Handles screen navigation, keyboard input, shooting, particles, zombie enemies, and core game loop loops.

// DOM Element References
// Grab references to all the HTML elements we need.

// Screens
const startScreen        = document.getElementById('start-screen');
const gameScreen         = document.getElementById('game-screen');
const gameoverScreen     = document.getElementById('gameover-screen');
const waveclearedScreen  = document.getElementById('wavecleared-screen');
const leaderboardScreen  = document.getElementById('leaderboard-screen');

// Start screen elements
const playerNameInput  = document.getElementById('player-name');
const startBtn         = document.getElementById('start-btn');
const leaderboardBtn   = document.getElementById('leaderboard-btn');

// Leaderboard screen elements
const leaderboardBody    = document.getElementById('leaderboard-body');
const leaderboardBackBtn = document.getElementById('leaderboard-back-btn');

// Game screen elements
const canvas      = document.getElementById('game-canvas');
const ctx         = canvas.getContext('2d'); // 2D drawing context for the canvas
const healthValue = document.getElementById('health-value');
const healthFill  = document.getElementById('health-fill');
const scoreValue  = document.getElementById('score-value');
const waveValue   = document.getElementById('wave-value');

// Game over screen elements
const finalName  = document.getElementById('final-name');
const finalKills = document.getElementById('final-kills');
const finalScore = document.getElementById('final-score');
const finalWave  = document.getElementById('final-wave');
const restartBtn = document.getElementById('restart-btn');
const menuBtn    = document.getElementById('menu-btn');

// Wave cleared screen elements
const clearedWaveNum   = document.getElementById('cleared-wave-num');
const nextWaveZombies  = document.getElementById('next-wave-zombies');


// Game State and Settings
let gameState = {
  playerName: 'Anonymous Survivor',
  score: 0,
  wave: 1,
  kills: 0,
  isRunning: false
};

// Active Wave Parameters
let waveZombiesTotal = 5;     // Total zombies to defeat this wave
let waveZombiesSpawned = 0;   // Zombies spawned so far
let isWaveIntermission = false; // True when showing wave completed screen

// Roguelike Upgrades Selection Tracker
let upgradesChosen = [];

// Global tick counter for game loops
let gameTick = 0;

// World Dimensions
const world = {
  width: 2500,  // Large retro battle arena space
  height: 2500
};

// 2D Camera Coordinate Tracker
let camera = {
  x: 0,
  y: 0
};

// Screen shake adds impact when the survivor is hit or explosions fire.
let screenShake = {
  amount: 0,
  frames: 0
};

// Player Object
let player = {
  x: 0,
  y: 0,
  size: 32, // blocky size for retro aesthetic
  health: 100,
  maxHealth: 100,
  speed: 2.2,
  
  // Weapon Stats
  bulletDamage: 10,
  fireRate: 500, // Cooldown in milliseconds (slower base rate for better upgrade value)
  bulletSpeed: 7,
  lastShotTime: 0,

  // New Roguelike Upgrades
  doubleShotCount: 0, // Parallel shots
  spreadShotCount: 0, // Fanned Epic spread shots
  bulletPierceLimit: 1,
  lifestealAmount: 0,
  burnLevel: 0,

  // Legendary Upgrades
  necroBombLevel: 0,
  chainLightningLevel: 0,
  lightningShotCounter: 0,
  orbitingDefenderLevel: 0,
  defenderAngle: 0,

  // New Stackable Upgrades
  damageReduction: 0.0,
  runnersHighLevel: 0,
  movementStart: null,
  bulletSizeModifier: 0.0,
  retaliateLevel: 0,
  retaliateExpiry: 0,
  knockbackModifier: 0.0,
  bounceLimit: 0,
  toxicTrailLevel: 0,
  splinterShotLevel: 0,
  steadyAimLevel: 0,
  dodgeChance: 0.0,
  waveHealPercentage: 0.15
};

// Keyboard Input Tracker
const keys = {
  w: false,
  a: false,
  s: false,
  d: false
};

// Mouse Input Tracker
const mouse = {
  x: 0,
  y: 0,
  isDown: false
};

// Upgrades Registry (10 choices)
// Upgrades Registry (14 choices categorized by rarity)
const UPGRADES_REGISTRY = [
  // 🟢 COMMON
  {
    id: 'damage',
    name: 'Damage Up',
    icon: '[DMG]',
    description: 'Increase bullet damage by 5',
    rarity: 'common',
    apply: () => {
      player.bulletDamage += 5;
    }
  },
  {
    id: 'speed',
    name: 'Speed Up',
    icon: '[MOVE]',
    description: 'Increase player speed by 0.4',
    rarity: 'common',
    apply: () => {
      player.speed += 0.4;
    }
  },
  {
    id: 'maxhealth',
    name: 'Max Health Up',
    icon: '[HP+]',
    description: 'Increase max health by 20 and heal for 20 HP',
    rarity: 'common',
    apply: () => {
      player.maxHealth += 20;
      player.health = Math.min(player.maxHealth, player.health + 20);
    }
  },
  {
    id: 'heal',
    name: 'Heal Boost',
    icon: '[HEAL]',
    description: 'Increases natural wave completion heal by +5% of max HP (Stackable, capped at 35% max)',
    rarity: 'common',
    apply: () => {
      player.waveHealPercentage = Math.min(0.35, player.waveHealPercentage + 0.05);
    }
  },
  {
    id: 'bulletspeed',
    name: 'Bullet Speed Up',
    icon: '[AMMO]',
    description: 'Increase bullet speed by 1',
    rarity: 'common',
    apply: () => {
      player.bulletSpeed += 1;
    }
  },
  {
    id: 'thickskin',
    name: 'Thick Skin',
    icon: '[SKIN]',
    description: 'Reduce all incoming damage taken by 5% (Stackable, capped at 50% max reduction)',
    rarity: 'common',
    apply: () => {
      player.damageReduction = Math.min(0.50, player.damageReduction + 0.05);
    }
  },
  {
    id: 'runnershigh',
    name: "Runner's High",
    icon: '[HIGH]',
    description: 'Gives an extra 0.2 speed boost when moving continuously for over 3 seconds (Stackable, capped at +1.0 max speed)',
    rarity: 'common',
    apply: () => {
      player.runnersHighLevel += 1;
    }
  },
  {
    id: 'giantbullets',
    name: 'Giant Bullets',
    icon: '[SIZE]',
    description: 'Increases physical size and collision hitbox of bullets by 20% (Stackable, capped at +100% size max)',
    rarity: 'common',
    apply: () => {
      player.bulletSizeModifier = Math.min(1.0, player.bulletSizeModifier + 0.20);
    }
  },
  {
    id: 'retaliate',
    name: 'Retaliate',
    icon: '[RAGE]',
    description: 'Taking damage briefly triggers a +0.8 speed boost for 2 seconds (Stackable, duration capped at 4 seconds max)',
    rarity: 'common',
    apply: () => {
      player.retaliateLevel += 1;
    }
  },

  // 🔵 RARE
  {
    id: 'firerate',
    name: 'Fire Rate Up',
    icon: '[FAST]',
    description: 'Reduce fire rate cooldown by 40ms (min 100ms)',
    rarity: 'rare',
    apply: () => {
      player.fireRate = Math.max(100, player.fireRate - 40);
    }
  },
  {
    id: 'lifesteal',
    name: 'Lifesteal',
    icon: '[VAMP]',
    description: 'Heal 2 HP after killing a zombie',
    rarity: 'rare',
    apply: () => {
      player.lifestealAmount += 2;
    }
  },
  {
    id: 'knockbackrounds',
    name: 'Knockback Rounds',
    icon: '[PUSH]',
    description: 'Increases pushback distance on hit by 10% (Stackable, capped at +50% max pushback)',
    rarity: 'rare',
    apply: () => {
      player.knockbackModifier = Math.min(0.50, player.knockbackModifier + 0.10);
    }
  },
  {
    id: 'bouncingcasings',
    name: 'Bouncing Casings',
    icon: '[RICO]',
    description: 'Bullets bounce off map walls and obstacles 1 time (Stackable, capped at 3 bounces max)',
    rarity: 'rare',
    apply: () => {
      player.bounceLimit = Math.min(3, player.bounceLimit + 1);
    }
  },
  {
    id: 'toxictrail',
    name: 'Toxic Trail',
    icon: '[MUCK]',
    description: 'Leave a faint chemical trail that deals minor damage over time and slows zombies by 10% (Stackable, slow effect caps at 40% max)',
    rarity: 'rare',
    apply: () => {
      player.toxicTrailLevel += 1;
    }
  },
  {
    id: 'splintershot',
    name: 'Splinter Shot',
    icon: '[CHIP]',
    description: 'Bullets split into 2 small, low-damage shrapnel pieces upon hitting walls or enemies (Stackable, shrapnel damage caps at 50% max)',
    rarity: 'rare',
    apply: () => {
      player.splinterShotLevel += 1;
    }
  },
  {
    id: 'steadyaim',
    name: 'Steady Aim',
    icon: '[STILL]',
    description: 'Increase damage by 6, but only if you are standing completely still while shooting (Stackable, capped at +30 max static damage)',
    rarity: 'rare',
    apply: () => {
      player.steadyAimLevel += 1;
    }
  },
  {
    id: 'phaseshift',
    name: 'Phase Shift',
    icon: '[VEIL]',
    description: 'Gain a 5% chance to completely dodge/evade any incoming zombie attack (Stackable, capped at 25% max dodge)',
    rarity: 'rare',
    apply: () => {
      player.dodgeChance = Math.min(0.25, player.dodgeChance + 0.05);
    }
  },

  // 🟣 EPIC
  {
    id: 'doubleshot',
    name: 'Double Shot',
    icon: '[TWIN]',
    description: 'Adds +1 bullet! Shoots parallel side-by-side; switches to a narrow fan spray at 4+ bullets.',
    rarity: 'epic',
    apply: () => {
      player.spreadShotCount += 1;
    }
  },
  {
    id: 'pierce',
    name: 'Piercing Bullet',
    icon: '[THRU]',
    description: 'Bullets can pass through 1 extra zombie',
    rarity: 'epic',
    apply: () => {
      player.bulletPierceLimit += 1;
    }
  },
  {
    id: 'burn',
    name: 'Burn Bullet',
    icon: '[FIRE]',
    description: 'Bullets apply burn damage over time to zombies',
    rarity: 'epic',
    apply: () => {
      player.burnLevel += 1;
    }
  },

  // 🟡 LEGENDARY
  {
    id: 'heavycaliber',
    name: 'Heavy Caliber',
    icon: '[HEAVY]',
    description: 'Massive damage boost (+25), but reduces speed (-0.2) and slows fire rate (+50ms)',
    rarity: 'legendary',
    apply: () => {
      player.bulletDamage += 25;
      player.speed = Math.max(1.0, player.speed - 0.2); // clamp at 1.0 minimum speed so the player doesn't become static
      player.fireRate += 50;
    }
  },
  {
    id: 'necrobomb',
    name: 'Necro-Bomb',
    icon: '[BOMB]',
    description: 'Killed zombies have 20% chance to explode, dealing AoE splash damage (Stackable!)',
    rarity: 'legendary',
    apply: () => {
      player.necroBombLevel += 1;
    }
  },
  {
    id: 'lightning',
    name: 'Chain Lightning',
    icon: '[VOLT]',
    description: 'Every 4th shot chains lightning to 3 nearby zombies, dealing damage and stunning (Stackable!)',
    rarity: 'legendary',
    apply: () => {
      player.chainLightningLevel += 1;
    }
  },
  {
    id: 'defender',
    name: 'Orbiting Defender',
    icon: '[RING]',
    description: 'Orbiting energy blade circles tightly, dealing contact damage to zombies (Stackable!)',
    rarity: 'legendary',
    apply: () => {
      player.orbitingDefenderLevel += 1;
    }
  }
];

// Combat Arrays
let bullets = [];
let zombies = [];
let enemyProjectiles = []; // For Acid Spitter projectile blobs
let toxicTrails = [];      // For chemical trail slowing and DoT pools
let lightningArcs = []; // For chain lightning cyan arc drawings
let gameParticles = []; // For muzzle flashes, blood splatters, and impact sparks

// Spawning Variables
let lastZombieSpawnTime = 0;
const baseZombieSpawnDelay = 1500; // Wave 1 spawn pacing in milliseconds

// Wave Scaling Helpers
// These formulas keep early waves fair, then add stronger horde pressure later.
function getWaveZombieTotal(wave) {
  const extraWaves = Math.max(0, wave - 1);
  return Math.floor(5 + extraWaves * 3 + Math.pow(extraWaves, 1.35));
}

function getZombieSpawnDelay(wave) {
  const extraWaves = Math.max(0, wave - 1);
  return Math.max(520, baseZombieSpawnDelay - extraWaves * 90);
}

function getZombieSpawnBatchSize(wave) {
  const extraWaves = Math.max(0, wave - 1);
  return Math.min(4, 1 + Math.floor(extraWaves / 4));
}

function getMaxActiveZombies(wave) {
  return 10 + Math.floor(wave * 2.4);
}

function getZombieStatScales(wave) {
  const extraWaves = Math.max(0, wave - 1);

  return {
    health: 1 + extraWaves * 0.07,
    speed: 1 + Math.min(0.35, extraWaves * 0.018),
    damage: 1 + extraWaves * 0.03,
    score: 1 + extraWaves * 0.06
  };
}

// Procedural ground features array
let groundDetails = [];

// Solid map props that bullets can bounce from and characters cannot pass through
let obstacles = [];

// Long-lived stains give the map aftermath as fights unfold.
let floorStains = [];

// Game loop animation reference
let animationFrameId = null;


// Screen Navigation
// Only one screen should be visible at a time.

/**
 * Switches to the specified screen.
 * @param {HTMLElement} screen - The screen element to show.
 */
function showScreen(screen) {
  // Hide all screens
  startScreen.classList.remove('active');
  gameScreen.classList.remove('active');
  gameoverScreen.classList.remove('active');
  waveclearedScreen.classList.remove('active');
  leaderboardScreen.classList.remove('active');

  // Show the target screen
  screen.classList.add('active');
}


// Leaderboard
// Data is loaded from Supabase. This array holds the current data to render.
// Falls back to sample data if Supabase is not configured or fails.

const sampleLeaderboardData = [
  { player_name: 'ZombieSlayer99',   score: 12450, wave_reached: 18, zombies_killed: 237 },
  { player_name: 'DeadWalker',       score: 9870,  wave_reached: 14, zombies_killed: 182 },
  { player_name: 'BrainsNoMore',     score: 8320,  wave_reached: 12, zombies_killed: 156 },
  { player_name: 'SurvivalKing',     score: 7100,  wave_reached: 11, zombies_killed: 134 },
  { player_name: 'HeadShotHero',     score: 5640,  wave_reached: 9,  zombies_killed: 108 },
  { player_name: 'RunOrDie',         score: 4200,  wave_reached: 8,  zombies_killed: 89  },
  { player_name: 'LastStanding',     score: 3150,  wave_reached: 7,  zombies_killed: 72  },
  { player_name: 'NoMercy',          score: 2400,  wave_reached: 6,  zombies_killed: 58  },
  { player_name: 'PixelSurvivor',    score: 1800,  wave_reached: 5,  zombies_killed: 43  },
  { player_name: 'FreshMeat',        score: 600,   wave_reached: 2,  zombies_killed: 14  },
];

/**
 * Renders the leaderboard table from an array of score entries.
 * If no data is provided or the array is empty, shows a message.
 * @param {Array} data - Array of { player_name, score, wave_reached, zombies_killed }
 */
function renderLeaderboard(data) {
  // Clear existing rows
  leaderboardBody.innerHTML = '';

  // If no data, show a message row
  if (!data || data.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="5" style="text-align:center; color: var(--text-muted); padding: 2rem;">No scores yet. Be the first survivor!</td>';
    leaderboardBody.appendChild(tr);
    return;
  }

  // Sort descending by score (safety sort for any data source)
  const sorted = [...data].sort((a, b) => b.score - a.score);

  sorted.forEach((entry, index) => {
    const rank = index + 1;
    const tr = document.createElement('tr');

    // Add rank class for top-3 styling
    if (rank <= 3) {
      tr.classList.add('rank-' + rank);
    }

    // Rank medal for top 3
    const rankSymbols = { 1: '👑', 2: '🥈', 3: '🥉' };
    const rankDisplay = rankSymbols[rank] || rank;

    tr.innerHTML =
      '<td>' + rankDisplay + '</td>' +
      '<td>' + escapeHTML(entry.player_name) + '</td>' +
      '<td>' + entry.score.toLocaleString() + '</td>' +
      '<td>' + entry.wave_reached + '</td>' +
      '<td>' + entry.zombies_killed + '</td>';

    leaderboardBody.appendChild(tr);
  });
}

/** Safely escape HTML to prevent injection from player names. */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}


// Canvas Setup
// Resize the canvas to fill the window so graphics look sharp.

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // Keep pixel renderings super crisp (disable anti-aliasing)
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
}

// Resize immediately and whenever the window size changes
resizeCanvas();
window.addEventListener('resize', resizeCanvas);


// Start Game
// Called when the player clicks "Start Game" or presses Enter.

function startGame() {
  // Read the player's name (use default if left blank)
  const name = playerNameInput.value.trim();
  gameState.playerName = name || 'Anonymous Survivor';

  // Reset general game state
  gameState.score = 0;
  gameState.wave = 1;
  gameState.kills = 0;
  
  // Reset active wave parameters
  waveZombiesTotal = getWaveZombieTotal(gameState.wave);
  waveZombiesSpawned = 0;
  isWaveIntermission = false;

  // Reset player configuration
  player.health = 100;
  player.maxHealth = 100;
  player.speed = 2.2;
  player.lastShotTime = 0;
  player.bulletDamage = 10;
  player.fireRate = 500;
  player.bulletSpeed = 7;
  player.doubleShotCount = 0;
  player.spreadShotCount = 0;
  player.bulletPierceLimit = 1;
  player.lifestealAmount = 0;
  player.burnLevel = 0;
  player.necroBombLevel = 0;
  player.chainLightningLevel = 0;
  player.lightningShotCounter = 0;
  player.orbitingDefenderLevel = 0;
  player.defenderAngle = 0;

  // Reset 10 new upgrades state properties
  player.damageReduction = 0.0;
  player.runnersHighLevel = 0;
  player.movementStart = null;
  player.bulletSizeModifier = 0.0;
  player.retaliateLevel = 0;
  player.retaliateExpiry = 0;
  player.knockbackModifier = 0.0;
  player.bounceLimit = 0;
  player.toxicTrailLevel = 0;
  player.splinterShotLevel = 0;
  player.steadyAimLevel = 0;
  player.dodgeChance = 0.0;
  player.waveHealPercentage = 0.15;

  // Clear chosen upgrades
  upgradesChosen = [];
  gameTick = 0;

  // Clear combat arrays
  bullets = [];
  zombies = [];
  enemyProjectiles = [];
  toxicTrails = [];
  lightningArcs = [];
  gameParticles = [];
  floorStains = [];
  screenShake.amount = 0;
  screenShake.frames = 0;
  lastZombieSpawnTime = 0;

  // Make sure the canvas is the right size and configured
  resizeCanvas();

  // Position player directly in the center of the 2500x2500 world
  player.x = world.width / 2;
  player.y = world.height / 2;

  // Initialize camera offsets
  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;

  // Clear inputs pressed state
  keys.w = false;
  keys.a = false;
  keys.s = false;
  keys.d = false;
  mouse.isDown = false;

  // Generate static details distributed throughout the entire world bounds
  generateMapObstacles();
  generateGroundDetails();

  // Update the HUD to match the reset state
  updateHUD();

  // Switch to the game screen
  showScreen(gameScreen);

  // Stop any active game loops to prevent parallel execution
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  // Set running state and launch game loop
  gameState.isRunning = true;
  gameLoop();
}


// Core Game Loop
// Executes 60 times a second using requestAnimationFrame.

function gameLoop() {
  if (!gameState.isRunning || isWaveIntermission) return;

  update();
  render();

  animationFrameId = requestAnimationFrame(gameLoop);
}


// Game Physics & State Updates

function update() {
  gameTick += 1;

  // Update Orbiting Defender rotating blades angle
  if (player.orbitingDefenderLevel > 0) {
    player.defenderAngle += 0.04;
  }

  // Update Toxic Trail puddle lifetimes
  for (let i = toxicTrails.length - 1; i >= 0; i--) {
    toxicTrails[i].life -= 1;
    if (toxicTrails[i].life <= 0) {
      toxicTrails.splice(i, 1);
    }
  }

  // Update Lightning Arcs segment lifespans
  for (let i = lightningArcs.length - 1; i >= 0; i--) {
    lightningArcs[i].life -= lightningArcs[i].decay;
    if (lightningArcs[i].life <= 0) {
      lightningArcs.splice(i, 1);
    }
  }

  // 1. Calculate player movement vectors
  let dx = 0;
  let dy = 0;

  if (keys.w) dy -= 1;
  if (keys.s) dy += 1;
  if (keys.a) dx -= 1;
  if (keys.d) dx += 1;

  const isMoving = (dx !== 0 || dy !== 0);

  // Track movement time for Runner's High
  if (isMoving) {
    if (player.movementStart === null) {
      player.movementStart = Date.now();
    }
  } else {
    player.movementStart = null;
  }

  // Calculate dynamic movement speed with boosts
  let currentSpeed = player.speed;
  let isRunnersHighActive = false;
  let isRetaliateActive = false;

  // Runner's High boost
  if (player.runnersHighLevel > 0 && player.movementStart !== null) {
    if (Date.now() - player.movementStart >= 3000) {
      currentSpeed += Math.min(1.0, player.runnersHighLevel * 0.2);
      isRunnersHighActive = true;
    }
  }

  // Retaliate boost
  if (player.retaliateLevel > 0 && Date.now() < player.retaliateExpiry) {
    currentSpeed += 0.8;
    isRetaliateActive = true;
  }

  // Normalize diagonal movement vector so diagonal travel isn't faster
  if (dx !== 0 && dy !== 0) {
    const length = Math.sqrt(dx * dx + dy * dy);
    dx /= length;
    dy /= length;
  }

  // Apply movement speed
  player.x += dx * currentSpeed;
  player.y += dy * currentSpeed;

  // Spawn visual feedback trailing sparks if speed boosts are active
  if (isMoving) {
    // Spawn Toxic Trail chemical puddle drop every 10 frames
    if (player.toxicTrailLevel > 0 && gameTick % 10 === 0) {
      toxicTrails.push({
        x: player.x,
        y: player.y,
        size: 24, // radius in pixels
        life: 300, // lasts 5 seconds at 60 fps
        maxLife: 300,
        level: player.toxicTrailLevel
      });
    }

    if (isRunnersHighActive && Math.random() < 0.25) {
      // Lime green/yellow Runner's High floor trail sparks
      gameParticles.push({
        x: player.x + (Math.random() - 0.5) * 12,
        y: player.y + player.size / 2, // at their feet
        vx: -dx * 0.5 + (Math.random() - 0.5) * 0.3,
        vy: -dy * 0.5 + (Math.random() - 0.5) * 0.3,
        size: Math.floor(Math.random() * 3) + 2,
        color: Math.random() > 0.5 ? '#39ff14' : '#ffee00', // Lime green or glowing yellow
        life: 0.8,
        decay: Math.random() * 0.08 + 0.05
      });
    }
    if (isRetaliateActive && Math.random() < 0.35) {
      // Aggressive bright red spark particles around player body
      gameParticles.push({
        x: player.x + (Math.random() - 0.5) * player.size,
        y: player.y + (Math.random() - 0.5) * player.size,
        vx: (Math.random() - 0.5) * 1,
        vy: -Math.random() * 1.5, // float up slightly
        size: Math.floor(Math.random() * 4) + 3,
        color: '#ff2200', // Crimson red
        life: 0.7,
        decay: Math.random() * 0.1 + 0.06
      });
    }
  }

  // Keep player inside the world boundaries (not just the screen)
  const halfSize = player.size / 2;
  if (player.x < halfSize) player.x = halfSize;
  if (player.x > world.width - halfSize) player.x = world.width - halfSize;
  if (player.y < halfSize) player.y = halfSize;
  if (player.y > world.height - halfSize) player.y = world.height - halfSize;
  resolveEntityObstacleCollision(player);

  // 2. Continuous shooting behavior when holding down mouse
  if (mouse.isDown) {
    shootWeapon();
  }

  // 3. Update bullets coordinate shifts and trail history
  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];

    // Decrement and check bullet lifetime to balance bouncing bullets
    if (b.life !== undefined) {
      b.life -= 1;
      if (b.life <= 0) {
        bullets.splice(i, 1);
        continue;
      }
    }

    const prevX = b.x;
    const prevY = b.y;

    // Log current location to trails array before moving
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 10) {
      b.trail.shift(); // Keep trail length capped for longer lasers
    }

    // Spawn floating sparks in bullet wake (ash/embers)
    if (Math.random() < 0.65) {
      gameParticles.push({
        x: b.x + (Math.random() - 0.5) * 6,
        y: b.y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.floor(Math.random() * 3) + 2, // Tiny blocky sparks (2-5px)
        color: Math.random() > 0.45 ? '#ff5500' : '#ffaa00', // Crimson orange or gold
        life: 0.8,
        decay: Math.random() * 0.08 + 0.05 // Fades quickly
      });
    }

    b.x += b.vx;
    b.y += b.vy;

    // Bounce off arena obstacles when Bouncing Casings is active
    if (handleBulletObstacleCollision(b, i, prevX, prevY)) {
      continue;
    }

    // Handle world boundary collision (discard or bounce)
    if (b.x < 0 || b.x > world.width || b.y < 0 || b.y > world.height) {
      if (b.bounceLeft > 0) {
        b.bounceLeft -= 1;

        // Trigger Splinter Shot wall bounce shrapnel split
        if (player.splinterShotLevel > 0 && !b.isShrapnel) {
          spawnSplinterShrapnel(b.x, b.y, b.vx, b.vy, b.damage);
        }

        // Bounce horizontally
        if (b.x < 0) {
          b.x = 0;
          b.vx = -b.vx;
        } else if (b.x > world.width) {
          b.x = world.width;
          b.vx = -b.vx;
        }

        // Bounce vertically
        if (b.y < 0) {
          b.y = 0;
          b.vy = -b.vy;
        } else if (b.y > world.height) {
          b.y = world.height;
          b.vy = -b.vy;
        }

        // Reset hit history so it can pierce/hit again!
        b.hitZombies = [];
      } else {
        // Trigger Splinter Shot shrapnel split on final death
        if (player.splinterShotLevel > 0 && !b.isShrapnel) {
          spawnSplinterShrapnel(b.x, b.y, b.vx, b.vy, b.damage);
        }

        bullets.splice(i, 1);
      }
    }
  }

  // 3.5. Update enemy acid projectiles and check player hit
  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    let ep = enemyProjectiles[i];

    // Move projectile
    ep.x += ep.vx;
    ep.y += ep.vy;

    if (handleEnemyProjectileObstacleCollision(ep, i)) {
      continue;
    }

    // Spawn tiny acid smoke particles in wake
    if (Math.random() < 0.5) {
      gameParticles.push({
        x: ep.x + (Math.random() - 0.5) * 4,
        y: ep.y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.floor(Math.random() * 2) + 2,
        color: '#73ff00', // Neon lime green
        life: 0.6,
        decay: Math.random() * 0.1 + 0.05
      });
    }

    // Check boundary
    if (ep.x < 0 || ep.x > world.width || ep.y < 0 || ep.y > world.height) {
      enemyProjectiles.splice(i, 1);
      continue;
    }

    // Collision check against Player
    const epDx = player.x - ep.x;
    const epDy = player.y - ep.y;
    const epDist = Math.sqrt(epDx * epDx + epDy * epDy);

    if (epDist < (player.size / 2 + ep.size / 2)) {
      damagePlayer(ep.damage);

      // Splice out projectile on impact
      enemyProjectiles.splice(i, 1);

      if (player.health <= 0) return;
    }
  }

  // 4. Spawn zombies. Later waves spawn faster and in small batches.
  const now = Date.now();
  if (!isWaveIntermission && waveZombiesSpawned < waveZombiesTotal) {
    const spawnDelay = getZombieSpawnDelay(gameState.wave);
    const activeSlots = getMaxActiveZombies(gameState.wave) - zombies.length;

    if (activeSlots > 0 && now - lastZombieSpawnTime >= spawnDelay) {
      const remainingZombies = waveZombiesTotal - waveZombiesSpawned;
      const batchSize = Math.min(getZombieSpawnBatchSize(gameState.wave), remainingZombies, activeSlots);

      for (let i = 0; i < batchSize; i++) {
        spawnZombie();
      }

      waveZombiesSpawned += batchSize;
      lastZombieSpawnTime = now;
    }
  }

  // 5. Update zombie movement and player collision check
  for (let i = zombies.length - 1; i >= 0; i--) {
    let z = zombies[i];

    // Zombie tracks player position (calculating chase vector)
    const zDx = player.x - z.x;
    const zDy = player.y - z.y;
    const distance = Math.sqrt(zDx * zDx + zDy * zDy);

    // Toxic Trail slow & DoT calculations
    z.isOnToxicTrail = false;
    for (let t = 0; t < toxicTrails.length; t++) {
      const trail = toxicTrails[t];
      const tDx = z.x - trail.x;
      const tDy = z.y - trail.y;
      const tDist = Math.sqrt(tDx * tDx + tDy * tDy);

      if (tDist < (z.size / 2 + trail.size)) {
        z.isOnToxicTrail = true;
        z.health -= (3 / 60) * trail.level; // Minor DoT: 3 HP/sec per stack level

        // Spawn occasional green bubbles
        if (Math.random() < 0.05) {
          gameParticles.push({
            x: z.x + (Math.random() - 0.5) * z.size,
            y: z.y + (Math.random() - 0.5) * z.size,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -Math.random() * 0.8,
            size: Math.floor(Math.random() * 2) + 2,
            color: '#39ff14', // neon green bubble
            life: 0.6,
            decay: Math.random() * 0.08 + 0.05
          });
        }
      }
    }

    // Stun status check (Legendary Chain Lightning stun)
    z.stunTicks = z.stunTicks || 0;
    if (z.stunTicks > 0) {
      z.stunTicks -= 1;
    } else {
      if (distance > 0) {
        // Toxic Trail slow effect (10% slow per level, capped at 40% slow)
        const slowFactor = z.isOnToxicTrail ? (1 - Math.min(0.40, 0.10 * player.toxicTrailLevel)) : 1.0;
        z.x += (zDx / distance) * z.speed * slowFactor;
        z.y += (zDy / distance) * z.speed * slowFactor;
      }
    }

    // Orbiting Defender contact damage shredding (Legendary)
    if (player.orbitingDefenderLevel > 0) {
      const radius = 45;
      const contactRadius = z.size / 2 + 10;
      for (let d = 0; d < player.orbitingDefenderLevel; d++) {
        const angleOffset = d * (Math.PI * 2 / player.orbitingDefenderLevel);
        const bladeX = player.x + Math.cos(player.defenderAngle + angleOffset) * radius;
        const bladeY = player.y + Math.sin(player.defenderAngle + angleOffset) * radius;

        const bDx = z.x - bladeX;
        const bDy = z.y - bladeY;
        const bDist = Math.sqrt(bDx * bDx + bDy * bDy);

        if (bDist < contactRadius) {
          z.health -= 1.8 * player.orbitingDefenderLevel; // dealing shred tick damage

          // Spawn contact sparks
          if (Math.random() < 0.25) {
            gameParticles.push({
              x: bladeX,
              y: bladeY,
              vx: (Math.random() - 0.5) * 3,
              vy: (Math.random() - 0.5) * 3,
              size: Math.floor(Math.random() * 2) + 2,
              color: '#ffaa00',
              life: 0.6,
              decay: 0.1
            });
          }
        }
      }
    }

    // Keep zombies inside world boundaries
    const zHalf = z.size / 2;
    if (z.x < zHalf) z.x = zHalf;
    if (z.x > world.width - zHalf) z.x = world.width - zHalf;
    if (z.y < zHalf) z.y = zHalf;
    if (z.y > world.height - zHalf) z.y = world.height - zHalf;
    resolveEntityObstacleCollision(z);

    // Burn Bullet DoT check
    if (z.burnTicks > 0) {
      z.burnTicks -= 1;
      z.health -= (5 / 60) * player.burnLevel; // 5 damage/sec per burn level

      // Spawn volatile rising ember/flame particles
      if (Math.random() < 0.15) {
        gameParticles.push({
          x: z.x + (Math.random() - 0.5) * z.size,
          y: z.y + (Math.random() - 0.5) * z.size,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -Math.random() * 1.5 - 0.5, // Drift upward
          size: Math.floor(Math.random() * 3) + 2, // 2-5px
          color: Math.random() > 0.4 ? '#ff5500' : '#ffea00',
          life: 0.8,
          decay: 0.05
        });
      }
    }

    // Acid Spitter ranged attack spitting logic
    if (z.type === 'spitter') {
      if (distance < 400 && now - z.lastAttackTime >= z.attackCooldown) {
        const spitAngle = Math.atan2(zDy, zDx);
        enemyProjectiles.push({
          x: z.x,
          y: z.y,
          vx: Math.cos(spitAngle) * 4.0,
          vy: Math.sin(spitAngle) * 4.0,
          size: 10,
          damage: z.damage,
          color: '#39ff14'
        });
        z.lastAttackTime = now;

        // Spawn muzzle/splash spit particles
        for (let s = 0; s < 3; s++) {
          gameParticles.push({
            x: z.x,
            y: z.y,
            vx: (Math.random() - 0.5) * 2 + Math.cos(spitAngle) * 1.5,
            vy: (Math.random() - 0.5) * 2 + Math.sin(spitAngle) * 1.5,
            size: Math.floor(Math.random() * 3) + 3,
            color: '#73ff00',
            life: 0.8,
            decay: Math.random() * 0.1 + 0.08
          });
        }
      }
    }

    // Exploder Bomber kamikaze proximity detonation
    if (z.type === 'exploder') {
      if (distance < (player.size / 2 + z.size / 2 + 5)) {
        z.selfDetonated = true;
        z.health = 0; // Mark for death sweep
      }
    }

    // Collision check between Zombie and Player
    if (distance < (player.size / 2 + z.size / 2)) {
      // Resolve player-zombie collision overlap (push zombie back physically)
      const minDist = player.size / 2 + z.size / 2 - 2;
      const overlap = minDist - distance;
      if (overlap > 0 && distance > 0) {
        z.x -= (zDx / distance) * overlap;
        z.y -= (zDy / distance) * overlap;
      }

      // Hit! Verify individual zombie attack rate limits
      if (z.type !== 'spitter' && z.type !== 'exploder') {
        if (now - z.lastAttackTime >= z.attackCooldown) {
          damagePlayer(z.damage);
          z.lastAttackTime = now;

          if (player.health <= 0) {
            return; // Stop updating
          }
        }
      }
    }
  }

  // 5.5. Resolve Zombie-Zombie collision overlaps (Crowd separation)
  for (let j = 0; j < zombies.length; j++) {
    for (let k = j + 1; k < zombies.length; k++) {
      let z1 = zombies[j];
      let z2 = zombies[k];

      const sepDx = z2.x - z1.x;
      const sepDy = z2.y - z1.y;
      const sepDist = Math.sqrt(sepDx * sepDx + sepDy * sepDy);
      const minSep = (z1.size + z2.size) / 2 - 4; // Keep larger bodies from stacking

      if (sepDist < minSep && sepDist > 0) {
        const overlap = minSep - sepDist;
        // Push both zombies away from each other
        const pushX = (sepDx / sepDist) * (overlap / 2);
        const pushY = (sepDy / sepDist) * (overlap / 2);
        z1.x -= pushX;
        z1.y -= pushY;
        z2.x += pushX;
        z2.y += pushY;
      }
    }
  }

  // 5.6. Sweep dead zombies and trigger explosions / scores / kills
  for (let zIdx = zombies.length - 1; zIdx >= 0; zIdx--) {
    let z = zombies[zIdx];
    if (z.health <= 0) {
      if (!z.selfDetonated) {
        gameState.score += z.scoreValue;
        gameState.kills += 1;

        // Lifesteal heal logic
        if (player.lifestealAmount > 0) {
          player.health = Math.min(player.maxHealth, player.health + player.lifestealAmount);
        }

        // Necro-Bomb triggering (Legendary upgrade)
        if (player.necroBombLevel > 0) {
          const chance = player.necroBombLevel * 0.20;
          if (Math.random() < chance) {
            triggerNecroBombExplosion(z.x, z.y);
          }
        }
      }

      // Spawn a dramatic blast of rotten green flesh and crimson blood
      spawnZombieDeathExplosion(z.x, z.y);

      // If it's an exploder zombie, detonate it!
      if (z.type === 'exploder') {
        triggerExplosion(z.x, z.y, z.damage);
      }

      // Remove the zombie
      zombies.splice(zIdx, 1);

      // Update general HUD text
      updateHUD();
    }
  }

  // 6. Collision check between Bullets and Zombies (with Pierce and Burn)
  for (let bIdx = bullets.length - 1; bIdx >= 0; bIdx--) {
    let b = bullets[bIdx];

    for (let zIdx = zombies.length - 1; zIdx >= 0; zIdx--) {
      let z = zombies[zIdx];

      // Prevent hitting the same zombie twice with a single piercing bullet
      if (b.hitZombies && b.hitZombies.includes(z)) continue;

      // Calculate radial distance
      const hitDx = b.x - z.x;
      const hitDy = b.y - z.y;
      const hitDist = Math.sqrt(hitDx * hitDx + hitDy * hitDy);

      // Hit detected!
      if (hitDist < (b.size / 2 + z.size / 2)) {
        z.health -= b.damage;

        // Apply physical knockback pushback force (Knockback Rounds)
        const travelAngle = Math.atan2(b.vy, b.vx);
        const pushForce = 8 * (1 + player.knockbackModifier); // base push 8px
        z.x += Math.cos(travelAngle) * pushForce;
        z.y += Math.sin(travelAngle) * pushForce;

        // Trigger Splinter Shot bullet split
        if (player.splinterShotLevel > 0 && !b.isShrapnel) {
          spawnSplinterShrapnel(b.x, b.y, b.vx, b.vy, b.damage);
        }

        // Apply Burn Bullet DoT if player has upgrade
        if (player.burnLevel > 0) {
          z.burnTicks = 180; // 3 seconds at 60 fps
        }

        // Keep track of hit zombies on this bullet
        if (!b.hitZombies) b.hitZombies = [];
        b.hitZombies.push(z);

        // Spawn yellow plasma collision sparks
        spawnImpactSparks(b.x, b.y);

        // Handle piercing count reductions
        b.pierceLeft = (b.pierceLeft || 1) - 1;
        if (b.pierceLeft <= 0) {
          // Remove the bullet
          bullets.splice(bIdx, 1);
        }

        break; // Stop checking other zombies for this bullet in this frame
      }
    }
  }

  // 7. Update pixel particles (muzzle flashes, blood, sparks)
  for (let i = gameParticles.length - 1; i >= 0; i--) {
    let p = gameParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;

    // Remove expired particles
    if (p.life <= 0) {
      gameParticles.splice(i, 1);
    }
  }

  // Slowly fade old combat stains without wiping the arena clean.
  for (let i = floorStains.length - 1; i >= 0; i--) {
    floorStains[i].life -= floorStains[i].decay;
    if (floorStains[i].life <= 0) {
      floorStains.splice(i, 1);
    }
  }

  if (screenShake.frames > 0) {
    screenShake.frames -= 1;
    screenShake.amount *= 0.86;
  } else {
    screenShake.amount = 0;
  }

  // 8. Smoothly center the 2D camera coordinates on the player
  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;

  // Clamp camera position to prevent looking outside the boundaries of the world map
  if (canvas.width >= world.width) {
    camera.x = world.width / 2 - canvas.width / 2;
  } else {
    if (camera.x < 0) camera.x = 0;
    if (camera.x > world.width - canvas.width) camera.x = world.width - canvas.width;
  }

  if (canvas.height >= world.height) {
    camera.y = world.height / 2 - canvas.height / 2;
  } else {
    if (camera.y < 0) camera.y = 0;
    if (camera.y > world.height - canvas.height) camera.y = world.height - canvas.height;
  }

  // 9. Scan for wave completed
  if (!isWaveIntermission && waveZombiesSpawned === waveZombiesTotal && zombies.length === 0) {
    clearWave();
  }
}


/**
 * Halts active gameplay loops, updates text figures, and shows the Wave Cleared modal.
 */
function clearWave() {
  isWaveIntermission = true;

  // Stop current frame loop checks
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  // Set statistical metrics inside modal
  clearedWaveNum.textContent = gameState.wave;
  
  // Show the stronger horde size for the upcoming wave.
  const nextSize = getWaveZombieTotal(gameState.wave + 1);
  nextWaveZombies.textContent = nextSize;

  // Render 3 randomized upgrade choices
  renderUpgradeChoices();

  // Display wave cleared overlay screen
  showScreen(waveclearedScreen);
}

/**
 * Rolls a rarity tier based on the current wave number and standard weights or milestone rules.
 * @param {number} wave - The current wave completed
 * @returns {string} The rolled rarity ('common', 'rare', 'epic', or 'legendary')
 */
function rollUpgradeRarity(wave) {
  // Guaranteed Milestone: Every 5 waves (Wave 5, 10, 15, etc.), the system rolls Epic (75%) or Legendary (25%) only.
  if (wave % 5 === 0) {
    return Math.random() < 0.25 ? 'legendary' : 'epic';
  }

  // Standard Wave Roll:
  // Common (60%), Rare (25%), Epic (11%), Legendary (4%)
  const roll = Math.random();
  if (roll < 0.60) {
    return 'common';
  } else if (roll < 0.85) {
    return 'rare';
  } else if (roll < 0.96) {
    return 'epic';
  } else {
    return 'legendary';
  }
}

/**
 * Selects 3 random upgrades from UPGRADES_REGISTRY matching the rolled rarity and renders them as clickable cards.
 */
function renderUpgradeChoices() {
  const container = document.getElementById('upgrade-options');
  if (!container) return;

  // Clear existing choices
  container.innerHTML = '';

  // Roll rarity for this intermission
  const rolledRarity = rollUpgradeRarity(gameState.wave);
  console.log(`Rolled Upgrade Rarity for Wave ${gameState.wave}: ${rolledRarity.toUpperCase()}`);

  // Filter upgrades by rolled rarity
  const pool = UPGRADES_REGISTRY.filter(u => u.rarity === rolledRarity);

  // Pick unique random choices (or all available if pool size is smaller)
  let shuffled = [...pool].sort(() => 0.5 - Math.random());
  let selectedUpgrades = shuffled.slice(0, 3);

  selectedUpgrades.forEach(upgrade => {
    // Create card element
    const card = document.createElement('div');
    card.className = 'upgrade-card rarity-' + rolledRarity;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    // Rivets for retro styling
    const rivetTL = document.createElement('div'); rivetTL.className = 'rivet top-left'; card.appendChild(rivetTL);
    const rivetTR = document.createElement('div'); rivetTR.className = 'rivet top-right'; card.appendChild(rivetTR);
    const rivetBL = document.createElement('div'); rivetBL.className = 'rivet bottom-left'; card.appendChild(rivetBL);
    const rivetBR = document.createElement('div'); rivetBR.className = 'rivet bottom-right'; card.appendChild(rivetBR);

    // Card Icon (Bracketed Text)
    const icon = document.createElement('div');
    icon.className = 'upgrade-card-icon';
    icon.textContent = upgrade.icon;
    card.appendChild(icon);

    // Card Title
    const title = document.createElement('h3');
    title.className = 'upgrade-card-title';
    title.textContent = upgrade.name;
    card.appendChild(title);

    // Card Description
    const desc = document.createElement('p');
    desc.className = 'upgrade-card-desc';
    desc.textContent = upgrade.description;
    card.appendChild(desc);

    // Bind click trigger
    card.addEventListener('click', () => {
      // 1. Apply the upgrade
      upgrade.apply();

      // 1.5. Apply natural wave completion heal (base 15% + upgrades, capped at 35% of max HP)
      const healPercent = player.waveHealPercentage || 0.15;
      const healAmount = Math.round(player.maxHealth * healPercent);
      player.health = Math.min(player.maxHealth, player.health + healAmount);
      console.log(`Wave completion heal applied: +${healAmount} HP (${Math.round(healPercent * 100)}% of Max HP)`);

      // 2. Save chosen upgrade name in upgradesChosen
      upgradesChosen.push(upgrade.name);
      console.log('Chosen Upgrade Applied:', upgrade.name, 'Upgrades List:', upgradesChosen);

      // 3. Increment wave and set next wave stats
      gameState.wave += 1;
      waveZombiesSpawned = 0;
      waveZombiesTotal = getWaveZombieTotal(gameState.wave);

      // 4. Reset screen and combat arrays for next wave
      bullets = [];
      zombies = [];
      enemyProjectiles = [];
      toxicTrails = [];
      lightningArcs = [];
      gameParticles = [];
      isWaveIntermission = false;
      lastZombieSpawnTime = Date.now(); // breathing room before spawn

      // 5. Update HUD and return to game screen
      updateHUD();
      showScreen(gameScreen);

      // Prevent parallel loop duplication
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      gameLoop();
    });

    container.appendChild(card);
  });
}


// Spawning Mechanisms

/**
 * Spawns one zombie at a random border just outside the visible browser viewport.
 */
function spawnZombie() {
  let zx, zy;
  const side = Math.floor(Math.random() * 4); // 0: Top, 1: Right, 2: Bottom, 3: Left
  const spawnBuffer = 90; // Larger zombies need extra room to enter from off-screen

  if (side === 0) {
    zx = camera.x + Math.random() * canvas.width;
    zy = camera.y - spawnBuffer;
  } else if (side === 1) {
    zx = camera.x + canvas.width + spawnBuffer;
    zy = camera.y + Math.random() * canvas.height;
  } else if (side === 2) {
    zx = camera.x + Math.random() * canvas.width;
    zy = camera.y + canvas.height + spawnBuffer;
  } else {
    zx = camera.x - spawnBuffer;
    zy = camera.y + Math.random() * canvas.height;
  }

  // Clamp spawn coordinates to always remain inside world map borders
  zx = Math.max(16, Math.min(world.width - 16, zx));
  zy = Math.max(16, Math.min(world.height - 16, zy));

  // Determine zombie type based on progressive wave weights.
  const zombieType = chooseZombieType(gameState.wave);

  if (zombieType === 'tank') {
    // Spawn Heavy Tank Zombie (Bulky armored speed sponge)
    addScaledZombie({
      type: 'tank',
      x: zx,
      y: zy,
      size: 54, // Massive broad frame
      health: 60,
      maxHealth: 60,
      speed: 0.7, // Heavy, rumbling stride
      damage: 20,
      scoreValue: 30,
      lastAttackTime: 0,
      attackCooldown: 1200 // Bites slightly slower due to size
    });
  } else if (zombieType === 'fast') {
    // Spawn Fast Zombie (Small glass cannon runner)
    addScaledZombie({
      type: 'fast',
      x: zx,
      y: zy,
      size: 34, // Easier to track, still the smallest threat
      health: 20,
      maxHealth: 20,
      speed: 1.6, // Rapid charging dash speed!
      damage: 8,
      scoreValue: 15,
      lastAttackTime: 0,
      attackCooldown: 1000
    });
  } else if (zombieType === 'spitter') {
    // Spawn Acid Spitter Zombie (Ranged threat)
    addScaledZombie({
      type: 'spitter',
      x: zx,
      y: zy,
      size: 38, // Slender but more visible
      health: 25,
      maxHealth: 25,
      speed: 0.9, // Slower kiting speed
      damage: 10,
      scoreValue: 25,
      lastAttackTime: 0,
      attackCooldown: 2000 // spits every 2 seconds
    });
  } else if (zombieType === 'exploder') {
    // Spawn Exploder Bomber Zombie (Kamikaze threat)
    addScaledZombie({
      type: 'exploder',
      x: zx,
      y: zy,
      size: 42, // Swollen shape
      health: 15,
      maxHealth: 15,
      speed: 1.3, // Swift approach speed
      damage: 25,
      scoreValue: 20,
      lastAttackTime: 0,
      attackCooldown: 1000
    });
  } else {
    // Spawn Normal Zombie (Original standard specs recalibrated)
    addScaledZombie({
      type: 'normal',
      x: zx,
      y: zy,
      size: 42,
      health: 30,
      maxHealth: 30,
      speed: 1.0, // Slow kiting pace
      damage: 10,
      scoreValue: 10,
      lastAttackTime: 0,
      attackCooldown: 1000
    });
  }
}

function chooseZombieType(wave) {
  const roll = Math.random();

  if (wave === 1) {
    return 'normal';
  }

  if (wave === 2) {
    return roll < 0.30 ? 'fast' : 'normal';
  }

  if (wave === 3) {
    if (roll < 0.12) return 'spitter';
    if (roll < 0.27) return 'tank';
    if (roll < 0.57) return 'fast';
    return 'normal';
  }

  if (wave < 7) {
    if (roll < 0.12) return 'exploder';
    if (roll < 0.28) return 'spitter';
    if (roll < 0.44) return 'tank';
    if (roll < 0.70) return 'fast';
    return 'normal';
  }

  if (wave < 11) {
    if (roll < 0.16) return 'exploder';
    if (roll < 0.34) return 'spitter';
    if (roll < 0.54) return 'tank';
    if (roll < 0.78) return 'fast';
    return 'normal';
  }

  if (roll < 0.20) return 'exploder';
  if (roll < 0.40) return 'spitter';
  if (roll < 0.62) return 'tank';
  if (roll < 0.84) return 'fast';
  return 'normal';
}

function addScaledZombie(zombie) {
  const scales = getZombieStatScales(gameState.wave);
  const scaledHealth = Math.ceil(zombie.health * scales.health);

  zombie.health = scaledHealth;
  zombie.maxHealth = scaledHealth;
  zombie.speed = Number((zombie.speed * scales.speed).toFixed(2));
  zombie.damage = Math.ceil(zombie.damage * scales.damage);
  zombie.scoreValue = Math.round(zombie.scoreValue * scales.score);

  zombies.push(zombie);
}

function circleRectCollision(cx, cy, radius, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
  const dx = cx - closestX;
  const dy = cy - closestY;

  return (dx * dx + dy * dy) <= radius * radius;
}

function resolveEntityObstacleCollision(entity) {
  const radius = entity.size / 2;

  obstacles.forEach(obstacle => {
    const closestX = Math.max(obstacle.x, Math.min(entity.x, obstacle.x + obstacle.width));
    const closestY = Math.max(obstacle.y, Math.min(entity.y, obstacle.y + obstacle.height));
    let dx = entity.x - closestX;
    let dy = entity.y - closestY;
    let distSq = dx * dx + dy * dy;

    if (distSq < radius * radius) {
      if (distSq === 0) {
        const centerX = obstacle.x + obstacle.width / 2;
        const centerY = obstacle.y + obstacle.height / 2;
        dx = entity.x >= centerX ? 1 : -1;
        dy = entity.y >= centerY ? 1 : -1;
        distSq = 2;
      }

      const dist = Math.sqrt(distSq);
      const push = radius - dist + 1;
      entity.x += (dx / dist) * push;
      entity.y += (dy / dist) * push;
    }
  });

  entity.x = Math.max(radius, Math.min(world.width - radius, entity.x));
  entity.y = Math.max(radius, Math.min(world.height - radius, entity.y));
}

function handleBulletObstacleCollision(bullet, bulletIndex, prevX, prevY) {
  const radius = bullet.size / 2;

  for (let i = 0; i < obstacles.length; i++) {
    const obstacle = obstacles[i];

    if (!circleRectCollision(bullet.x, bullet.y, radius, obstacle)) {
      continue;
    }

    if (bullet.bounceLeft > 0) {
      bullet.bounceLeft -= 1;

      if (player.splinterShotLevel > 0 && !bullet.isShrapnel) {
        spawnSplinterShrapnel(bullet.x, bullet.y, bullet.vx, bullet.vy, bullet.damage);
      }

      bounceBulletFromObstacle(bullet, obstacle, prevX, prevY);
      bullet.hitZombies = [];
      spawnObstacleImpactSparks(bullet.x, bullet.y, '#ffaa00');
      return true;
    }

    if (player.splinterShotLevel > 0 && !bullet.isShrapnel) {
      spawnSplinterShrapnel(bullet.x, bullet.y, bullet.vx, bullet.vy, bullet.damage);
    }

    spawnObstacleImpactSparks(bullet.x, bullet.y, '#ff7700');
    bullets.splice(bulletIndex, 1);
    return true;
  }

  return false;
}

function bounceBulletFromObstacle(bullet, obstacle, prevX, prevY) {
  const radius = bullet.size / 2;
  const leftEdge = obstacle.x - radius;
  const rightEdge = obstacle.x + obstacle.width + radius;
  const topEdge = obstacle.y - radius;
  const bottomEdge = obstacle.y + obstacle.height + radius;

  if (prevX <= leftEdge && bullet.x > leftEdge) {
    bullet.x = leftEdge;
    bullet.vx = -Math.abs(bullet.vx);
    return;
  }

  if (prevX >= rightEdge && bullet.x < rightEdge) {
    bullet.x = rightEdge;
    bullet.vx = Math.abs(bullet.vx);
    return;
  }

  if (prevY <= topEdge && bullet.y > topEdge) {
    bullet.y = topEdge;
    bullet.vy = -Math.abs(bullet.vy);
    return;
  }

  if (prevY >= bottomEdge && bullet.y < bottomEdge) {
    bullet.y = bottomEdge;
    bullet.vy = Math.abs(bullet.vy);
    return;
  }

  const centerX = obstacle.x + obstacle.width / 2;
  const centerY = obstacle.y + obstacle.height / 2;
  const overlapX = obstacle.width / 2 + radius - Math.abs(bullet.x - centerX);
  const overlapY = obstacle.height / 2 + radius - Math.abs(bullet.y - centerY);

  if (overlapX < overlapY) {
    const direction = bullet.x >= centerX ? 1 : -1;
    bullet.x += direction * overlapX;
    bullet.vx *= -1;
  } else {
    const direction = bullet.y >= centerY ? 1 : -1;
    bullet.y += direction * overlapY;
    bullet.vy *= -1;
  }
}

function handleEnemyProjectileObstacleCollision(projectile, projectileIndex) {
  const radius = projectile.size / 2;

  for (let i = 0; i < obstacles.length; i++) {
    if (circleRectCollision(projectile.x, projectile.y, radius, obstacles[i])) {
      spawnObstacleImpactSparks(projectile.x, projectile.y, '#39ff14');
      enemyProjectiles.splice(projectileIndex, 1);
      return true;
    }
  }

  return false;
}

function spawnObstacleImpactSparks(x, y, color) {
  for (let i = 0; i < 7; i++) {
    gameParticles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      size: Math.floor(Math.random() * 3) + 3,
      color: color,
      life: 0.75,
      decay: Math.random() * 0.08 + 0.05
    });
  }
}


/**
 * Spawns cyan/blue floating particles when player evades an attack.
 */
function spawnEvadeParticles(x, y) {
  for (let i = 0; i < 8; i++) {
    gameParticles.push({
      x: x + (Math.random() - 0.5) * 16,
      y: y + (Math.random() - 0.5) * 16,
      vx: (Math.random() - 0.5) * 2,
      vy: -Math.random() * 2 - 1, // drift upward
      size: Math.floor(Math.random() * 3) + 3,
      color: '#00ffff', // Electric cyan
      life: 1.0,
      decay: Math.random() * 0.05 + 0.03
    });
  }
}

/**
 * Inflicts damage on the player, applying Phase Shift evasion, Thick Skin reduction, and Retaliate speed triggers.
 * @param {number} rawAmount - The base damage before reductions
 */
function damagePlayer(rawAmount) {
  if (player.health <= 0) return;

  // 1. Evade check (Phase Shift)
  if (player.dodgeChance > 0) {
    if (Math.random() < player.dodgeChance) {
      // Dodged! Spawn evasive particles and bypass all damage
      spawnEvadeParticles(player.x, player.y);
      return;
    }
  }

  // 2. Thick Skin damage reduction
  let reducedAmount = rawAmount;
  if (player.damageReduction > 0) {
    reducedAmount = rawAmount * (1 - player.damageReduction);
  }
  // Clamp damage to at least 1 HP so zombies always deal damage
  const actualDamage = Math.max(1, Math.round(reducedAmount));

  // 3. Deal damage
  player.health = Math.max(0, player.health - actualDamage);
  // (Player blood spray and floor stains removed to clean up visual clutter)
  startScreenShake(7, 12);
  updateHUD();

  // 4. Trigger Retaliate speed boost
  if (player.retaliateLevel > 0) {
    const duration = Math.min(4000, 2000 * player.retaliateLevel); // 2s per stack, cap 4s
    player.retaliateExpiry = Date.now() + duration;
  }

  // 5. Check player death state
  if (player.health <= 0) {
    gameOver();
  }
}


/**
 * Spawns 2 smaller shrapnel bullets angled at +45 and -45 degrees from original direction.
 * @param {number} x - Spawning x position
 * @param {number} y - Spawning y position
 * @param {number} vx - Original bullet velocity x
 * @param {number} vy - Original bullet velocity y
 * @param {number} parentDamage - Original bullet damage
 */
function spawnSplinterShrapnel(x, y, vx, vy, parentDamage) {
  const angle = Math.atan2(vy, vx);
  const speed = Math.sqrt(vx * vx + vy * vy) * 0.8; // slightly slower shrapnel
  const shrapnelDamage = Math.min(player.bulletDamage * 0.5, parentDamage * 0.15 * player.splinterShotLevel);

  const angle1 = angle + Math.PI / 4;
  const angle2 = angle - Math.PI / 4;

  [angle1, angle2].forEach(a => {
    bullets.push({
      x: x,
      y: y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      size: 6, // smaller shrapnel size
      damage: Math.max(1, Math.round(shrapnelDamage)),
      trail: [],
      pierceLeft: 1, // pierces 1 zombie then dies
      bounceLeft: 0, // shrapnel does not bounce to avoid infinite recursion
      hitZombies: [],
      isShrapnel: true,
      life: 45 // Shrapnel expires in 45 frames (~0.75 seconds)
    });
  });
}


// Shooting Weapon System

function shootWeapon() {
  const now = Date.now();

  // Bullet spawn rate cooldown check
  if (now - player.lastShotTime >= player.fireRate) {
    // 1. Calculate angle from player's screen position to mouse cursor screen coordinates
    const playerScreenX = player.x - camera.x;
    const playerScreenY = player.y - camera.y;
    const aimDx = mouse.x - playerScreenX;
    const aimDy = mouse.y - playerScreenY;
    const angle = Math.atan2(aimDy, aimDx);

    // 2. Spawn bullets (combining stackable Parallel Multi-Shot and Epic fanned Spread Shots)
    const totalBullets = 1 + player.spreadShotCount + player.doubleShotCount;

    // Calculate bullet stats dynamically based on upgrades
    const isPlayerMoving = (keys.w || keys.a || keys.s || keys.d);
    let finalDamage = player.bulletDamage;
    if (!isPlayerMoving && player.steadyAimLevel > 0) {
      finalDamage += Math.min(30, player.steadyAimLevel * 6); // Capped at +30 damage
    }
    const finalSize = 10 * (1 + player.bulletSizeModifier); // Giant Bullets modifier

    if (totalBullets < 4) {
      // Perfectly parallel side-by-side bullets for 1, 2, or 3 bullets
      const parallelSpacing = 14; // side-by-side spacing in pixels
      const perpX = -Math.sin(angle);
      const perpY = Math.cos(angle);

      for (let p = 0; p < totalBullets; p++) {
        const parallelOffset = p - (totalBullets - 1) / 2;
        const ox = parallelOffset * parallelSpacing * perpX;
        const oy = parallelOffset * parallelSpacing * perpY;

        bullets.push({
          x: player.x + ox,
          y: player.y + oy,
          vx: Math.cos(angle) * player.bulletSpeed,
          vy: Math.sin(angle) * player.bulletSpeed,
          size: finalSize,
          damage: finalDamage,
          trail: [], // Array of past coordinate points for tracing trails
          pierceLeft: player.bulletPierceLimit,
          bounceLeft: player.bounceLimit, // Bouncing Casings Limit
          hitZombies: [],
          isShrapnel: false,
          life: 150 // Bullet expires in 150 frames (~2.5 seconds) to balance bouncing bullets
        });

        // Spawn barrel flash at each starting muzzle point offset
        spawnMuzzleFlash(player.x + ox, player.y + oy, angle);
      }
    } else {
      // Fan shape for 4 or more bullets, but not too wide so players can still aim
      const fanAngleSpacing = 0.08; // Narrow fanning angle spacing (~4.5 degrees)

      for (let i = 0; i < totalBullets; i++) {
        const offsetIndex = i - (totalBullets - 1) / 2;
        const currentAngle = angle + offsetIndex * fanAngleSpacing;

        bullets.push({
          x: player.x,
          y: player.y,
          vx: Math.cos(currentAngle) * player.bulletSpeed,
          vy: Math.sin(currentAngle) * player.bulletSpeed,
          size: finalSize,
          damage: finalDamage,
          trail: [],
          pierceLeft: player.bulletPierceLimit,
          bounceLeft: player.bounceLimit,
          hitZombies: [],
          isShrapnel: false,
          life: 150 // Bullet expires in 150 frames (~2.5 seconds) to balance bouncing bullets
        });

        // Spawn barrel flash at each muzzle direction
        spawnMuzzleFlash(player.x, player.y, currentAngle);
      }
    }

    // 3. Chain Lightning Check (Legendary)
    if (player.chainLightningLevel > 0) {
      player.lightningShotCounter += 1;
      const triggerShots = Math.max(2, 5 - player.chainLightningLevel);
      if (player.lightningShotCounter >= triggerShots) {
        player.lightningShotCounter = 0;
        triggerChainLightning();
      }
    }

    // 4. Update last shot timestamp
    player.lastShotTime = now;
  }
}

/**
 * Triggers Chain Lightning arcing through up to 3 + chainLightningLevel nearby zombies, dealing damage and stunning them.
 */
function triggerChainLightning() {
  let targetsChain = [];
  let currentPoint = { x: player.x, y: player.y };
  const maxTargets = 3 + player.chainLightningLevel;
  const damage = 15 + player.chainLightningLevel * 5;

  for (let c = 0; c < maxTargets; c++) {
    let closestZ = null;
    let minDist = 400; // max chain jumping range in pixels

    zombies.forEach(z => {
      if (targetsChain.includes(z) || z.health <= 0) return;
      const dx = z.x - currentPoint.x;
      const dy = z.y - currentPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        closestZ = z;
      }
    });

    if (closestZ) {
      // Hit zombie!
      targetsChain.push(closestZ);
      closestZ.health -= damage;
      closestZ.stunTicks = 60; // 1 second stun at 60 fps

      // Save segment into lightning arcs for rendering
      lightningArcs.push({
        x1: currentPoint.x,
        y1: currentPoint.y,
        x2: closestZ.x,
        y2: closestZ.y,
        life: 1.0,
        decay: 0.08
      });

      // Spawn bright blue/cyan electricity sparks
      for (let p = 0; p < 6; p++) {
        gameParticles.push({
          x: closestZ.x,
          y: closestZ.y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          size: Math.floor(Math.random() * 3) + 3,
          color: '#00ffff', // neon cyan
          life: 0.8,
          decay: Math.random() * 0.08 + 0.06
        });
      }

      // Next arc starts from the current hit zombie
      currentPoint = { x: closestZ.x, y: closestZ.y };
    } else {
      break; // No more close targets
    }
  }
}


/**
 * Spawns dynamic particle sparks to simulate barrel muzzle flash.
 */
function spawnMuzzleFlash(px, py, angle) {
  const muzzleOffset = player.size / 2 + 2;
  const mx = px + Math.cos(angle) * muzzleOffset;
  const my = py + Math.sin(angle) * muzzleOffset;

  // Spawn 5 retro sparks
  for (let i = 0; i < 5; i++) {
    const spreadAngle = angle + (Math.random() - 0.5) * 0.7;
    const sparkVelocity = Math.random() * 3 + 3;

    gameParticles.push({
      x: mx,
      y: my,
      vx: Math.cos(spreadAngle) * sparkVelocity,
      vy: Math.sin(spreadAngle) * sparkVelocity,
      size: Math.floor(Math.random() * 4) + 4,
      color: Math.random() > 0.4 ? '#ff9900' : '#ffea00',
      life: 1.0,
      decay: Math.random() * 0.08 + 0.06
    });
  }
}


// Particle Generators

/**
 * Spawns yellow impact sparks on bullet impacts.
 */
function spawnImpactSparks(bx, by) {
  for (let i = 0; i < 4; i++) {
    gameParticles.push({
      x: bx,
      y: by,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      size: Math.floor(Math.random() * 3) + 3,
      color: '#ffee00',
      life: 0.8,
      decay: Math.random() * 0.12 + 0.08
    });
  }
}

/**
 * Splatters massive rotting green flesh chunks and blood on zombie kill.
 */
function spawnZombieDeathExplosion(zx, zy) {
  addFloorChemicalStain(zx, zy, 34, 0.34);

  for (let i = 0; i < 10; i++) {
    gameParticles.push({
      x: zx,
      y: zy,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      size: Math.floor(Math.random() * 5) + 4,
      color: Math.random() > 0.35 ? '#2d8a1e' : '#8a0000', // Rotten flesh green or deep crimson blood
      life: 1.0,
      decay: Math.random() * 0.15 + 0.10 // Green blood and chunks fade much faster now
    });
  }
}

/**
 * Blasts bright crimson blood sprays outward from player when taking hit.
 */
function spawnPlayerBloodSpray(px, py) {
  for (let i = 0; i < 12; i++) {
    gameParticles.push({
      x: px,
      y: py,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      size: Math.floor(Math.random() * 4) + 4,
      color: '#ff1111', // Pure crimson blood
      life: 1.0,
      decay: Math.random() * 0.06 + 0.04
    });
  }
}

/**
 * Triggers a massive fiery pixel explosion.
 * Deals splash damage to player and surrounding zombies.
 */
function triggerExplosion(ex, ey, maxDamage) {
  startExplosionShake(ex, ey, 14);
  addFloorScorch(ex, ey, 54);

  // 1. Spawn a large circular blast of particles (orange, red, yellow, and smoky gray)
  const numParticles = 30 + Math.floor(Math.random() * 15);
  for (let i = 0; i < numParticles; i++) {
    const angle = Math.random() * Math.PI * 2;
    const force = Math.random() * 5 + 2;
    const colorRoll = Math.random();
    let color = '#ff3300'; // Pure bright hot red-orange
    if (colorRoll < 0.3) {
      color = '#ffaa00'; // fiery gold
    } else if (colorRoll < 0.6) {
      color = '#ffee00'; // hot yellow
    } else if (colorRoll < 0.8) {
      color = '#555555'; // smoky charcoal gray
    }

    gameParticles.push({
      x: ex,
      y: ey,
      vx: Math.cos(angle) * force,
      vy: Math.sin(angle) * force,
      size: Math.floor(Math.random() * 6) + 4,
      color: color,
      life: 1.0,
      decay: Math.random() * 0.05 + 0.03
    });
  }

  // 2. Damage player if within 90px radius
  const pDx = player.x - ex;
  const pDy = player.y - ey;
  const pDist = Math.sqrt(pDx * pDx + pDy * pDy);
  const explosionRadius = 90;

  if (pDist < explosionRadius) {
    const factor = (explosionRadius - pDist) / explosionRadius;
    const taken = Math.floor(maxDamage * factor);
    if (taken > 0) {
      damagePlayer(taken);
      if (player.health <= 0) return;
    }
  }

  // 3. Splash damage to *other* active zombies within 90px radius
  const maxZombieSplashDamage = 40;
  zombies.forEach(zTarget => {
    const tDx = zTarget.x - ex;
    const tDy = zTarget.y - ey;
    const tDist = Math.sqrt(tDx * tDx + tDy * tDy);
    if (tDist < explosionRadius && tDist > 1) { // tDist > 1 prevents damaging the source itself
      const factor = (explosionRadius - tDist) / explosionRadius;
      const splashDamage = Math.floor(maxZombieSplashDamage * factor);
      if (splashDamage > 0) {
        zTarget.health -= splashDamage;
      }
    }
  });
}

/**
 * Triggers a toxic Necro-Bomb plague explosion when a zombie dies.
 * Deals splash damage to nearby zombies.
 */
function triggerNecroBombExplosion(ex, ey) {
  const radius = 70 + player.necroBombLevel * 15;
  const damage = 20 + player.necroBombLevel * 10;
  startExplosionShake(ex, ey, 9 + player.necroBombLevel * 2);
  addFloorScorch(ex, ey, radius * 0.45);

  // Spawn unique plague green and toxic purple chunky sparks
  const numParticles = 20 + Math.floor(Math.random() * 10);
  for (let i = 0; i < numParticles; i++) {
    const angle = Math.random() * Math.PI * 2;
    const force = Math.random() * 4 + 1.5;
    const color = Math.random() > 0.4 ? '#39ff14' : '#b026ff'; // neon lime green or toxic purple

    gameParticles.push({
      x: ex,
      y: ey,
      vx: Math.cos(angle) * force,
      vy: Math.sin(angle) * force,
      size: Math.floor(Math.random() * 4) + 3, // chunky particles (3-6px)
      color: color,
      life: 0.9,
      decay: Math.random() * 0.05 + 0.03
    });
  }

  // Splash damage to *other* active zombies within the bomb radius
  zombies.forEach(zTarget => {
    const tDx = zTarget.x - ex;
    const tDy = zTarget.y - ey;
    const tDist = Math.sqrt(tDx * tDx + tDy * tDy);
    if (tDist < radius && tDist > 1) { // tDist > 1 prevents damaging the source itself
      const factor = (radius - tDist) / radius;
      const splashDamage = Math.floor(damage * factor);
      if (splashDamage > 0) {
        zTarget.health -= splashDamage;
      }
    }
  });
}




function startScreenShake(amount, frames) {
  screenShake.amount = Math.max(screenShake.amount, amount);
  screenShake.frames = Math.max(screenShake.frames, frames);
}

function startExplosionShake(x, y, baseAmount) {
  const dx = player.x - x;
  const dy = player.y - y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const falloff = Math.max(0.22, 1 - distance / 780);
  startScreenShake(baseAmount * falloff, 16);
}

function getScreenShakeOffset() {
  if (screenShake.amount <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: (Math.random() - 0.5) * screenShake.amount,
    y: (Math.random() - 0.5) * screenShake.amount
  };
}

function addFloorBloodStain(x, y, radius, alpha) {
  addFloorStain('blood', x, y, radius, alpha, 0.00028);
}

function addFloorChemicalStain(x, y, radius, alpha) {
  addFloorStain('chemical', x, y, radius, alpha, 0.0035); // Expire much faster (about 20x faster decay rate)
}

function addFloorScorch(x, y, radius) {
  addFloorStain('scorch', x, y, radius, 0.42, 0.0002);
}

function addFloorStain(type, x, y, radius, alpha, decay) {
  floorStains.push({
    type: type,
    x: x + (Math.random() - 0.5) * 16,
    y: y + (Math.random() - 0.5) * 16,
    radius: radius + Math.random() * 18,
    alpha: alpha,
    angle: Math.random() * Math.PI,
    squash: 0.45 + Math.random() * 0.45,
    life: 1,
    maxLife: 1,
    decay: decay
  });

  if (floorStains.length > 90) {
    floorStains.shift();
  }
}

// Rendering Elements
// Draws the environment, decorations, and characters onto the canvas.

function render() {
  const shakeOffset = getScreenShakeOffset();

  // Clear the screen with deep background color
  ctx.fillStyle = '#090908';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Shift drawing coordinate origin relative to camera location
  ctx.save();
  ctx.translate(shakeOffset.x, shakeOffset.y);
  ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y)); // Floor offsets to keep rendering clean

  // 1. Draw World Arena Floor (layered metal plating instead of pure black)
  drawArenaFloor();

  // 2. Faint tactical grid overlay above the metal plates
  ctx.strokeStyle = 'rgba(92, 130, 136, 0.035)';
  ctx.lineWidth = 1;

  const gridSize = 160; // Matches the lab floor plate size

  for (let x = 0; x <= world.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }

  for (let y = 0; y <= world.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }

  // 3. Draw non-collidable lab clutter and floor damage.
  groundDetails.forEach(drawLabGroundDetail);

  // 3.3. Draw lingering combat stains and containment unit floor marks.
  drawFloorStains();
  drawObstacleGroundMarks();

  // 3.5. Draw solid props and cover that make bounce upgrades useful
  drawObstacles();

  // 3.6. Draw Toxic Trails (Translucent Floor Pools)
  drawToxicTrails();

  // 4. Draw Dotted Aim Guide Sight
  drawAimGuide();

  // 5. Draw Bullets Trails & Core (Detailed Tracer Sparks)
  drawBullets();

  // 5.1. Draw Enemy Projectiles (Glowing acid spitballs)
  drawEnemyProjectiles();

  // 5.2. Draw Chain Lightning neon cyan vector arcs (Legendary)
  drawLightningArcs();

  // 6. Draw Muzzle Flash, Blood, & Spark Particles
  drawGameParticles();

  // 7. Draw active Zombies
  drawZombies();

  // 8. Draw absolute World Borders (Outer Industrial Walls)
  ctx.strokeStyle = '#ff7700'; // Hazard orange outer edge
  ctx.lineWidth = 16;
  ctx.strokeRect(0, 0, world.width, world.height);

  ctx.strokeStyle = '#000000'; // High contrast black outline border
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, world.width - 10, world.height - 10);

  // 8.5. Draw Orbiting Defender energy blades (Legendary)
  drawOrbitingDefender();

  // 9. Draw Player (Detailed 8-bit Blocky Survivor)
  drawPlayer();

  // Restore the transformation matrix
  ctx.restore();

  // 10. Screen-space darkness, vignette, and player-focused visibility.
  drawLightingOverlay();
}

function drawLightingOverlay() {
  const longestScreenSide = Math.max(canvas.width, canvas.height);

  ctx.save();

  // Static facility camera vignette without directional beams or color washes.
  const cornerVignette = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    Math.min(canvas.width, canvas.height) * 0.25,
    canvas.width / 2,
    canvas.height / 2,
    longestScreenSide * 0.76
  );
  cornerVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  cornerVignette.addColorStop(0.72, 'rgba(0, 0, 0, 0.18)');
  cornerVignette.addColorStop(1, 'rgba(0, 0, 0, 0.62)');
  ctx.fillStyle = cornerVignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Thin emergency monitor tint keeps the lab sterile and synthetic.
  ctx.fillStyle = 'rgba(43, 255, 125, 0.025)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.restore();
}

function drawArenaFloor() {
  ctx.fillStyle = '#11171a';
  ctx.fillRect(0, 0, world.width, world.height);

  // Durable lab floor plates with subtle alternating metallic panels.
  const slabSize = 160;
  for (let x = 0; x < world.width; x += slabSize) {
    for (let y = 0; y < world.height; y += slabSize) {
      const shade = ((x / slabSize + y / slabSize) % 2 === 0) ? '#172024' : '#141b1f';
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, slabSize, slabSize);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.fillRect(x + 12, y + 12, 8, 8);
      ctx.fillRect(x + slabSize - 20, y + 12, 8, 8);
      ctx.fillRect(x + 12, y + slabSize - 20, 8, 8);
      ctx.fillRect(x + slabSize - 20, y + slabSize - 20, 8, 8);
    }
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  for (let x = 0; x < world.width; x += slabSize) {
    ctx.fillRect(x, 0, 3, world.height);
  }
  for (let y = 0; y < world.height; y += slabSize) {
    ctx.fillRect(0, y, world.width, 3);
  }

  // Washed-out tactical grid as a HUD overlay, not the actual floor.
  ctx.strokeStyle = 'rgba(92, 130, 136, 0.07)';
  ctx.lineWidth = 1;
  for (let x = 80; x <= world.width; x += 320) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }
  for (let y = 80; y <= world.height; y += 320) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }

  drawLabFloorMarkings();
}

function drawLabFloorMarkings() {
  // Border biohazard warning lanes
  ctx.strokeStyle = 'rgba(196, 138, 26, 0.45)';
  ctx.lineWidth = 10;
  ctx.strokeRect(42, 42, world.width - 84, world.height - 84);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(56, 56, world.width - 112, world.height - 112);

  // Hazard stripe bands across center of arena
  drawHazardStripeBand(world.width / 2 - 260, world.height / 2 - 260, 520, 24);
  drawHazardStripeBand(world.width / 2 - 260, world.height / 2 + 236, 520, 24);

  // Corner anchor bolt plates instead of text
  drawCornerBoltPlate(80, 80);
  drawCornerBoltPlate(world.width - 130, 80);
  drawCornerBoltPlate(80, world.height - 130);
  drawCornerBoltPlate(world.width - 130, world.height - 130);

  // Subtle biohazard symbol at center — visual only, no text
  drawCenterFloorEmblem();
}

function drawHazardStripeBand(x, y, width, height) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.54)';
  ctx.fillRect(x, y, width, height);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  for (let stripe = -height; stripe < width; stripe += 32) {
    ctx.fillStyle = 'rgba(196, 138, 26, 0.64)';
    ctx.beginPath();
    ctx.moveTo(x + stripe, y + height);
    ctx.lineTo(x + stripe + 16, y + height);
    ctx.lineTo(x + stripe + height + 16, y);
    ctx.lineTo(x + stripe + height, y);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawCornerBoltPlate(px, py) {
  const w = 50;
  const h = 50;

  // Dark recessed plate
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(px, py, w, h);
  ctx.fillStyle = 'rgba(40, 52, 56, 0.35)';
  ctx.fillRect(px + 4, py + 4, w - 8, h - 8);

  // Edge bevel
  ctx.strokeStyle = 'rgba(92, 110, 114, 0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 2, py + 2, w - 4, h - 4);

  // Four corner bolts
  const boltColor = 'rgba(150, 170, 174, 0.4)';
  ctx.fillStyle = boltColor;
  ctx.fillRect(px + 8, py + 8, 6, 6);
  ctx.fillRect(px + w - 14, py + 8, 6, 6);
  ctx.fillRect(px + 8, py + h - 14, 6, 6);
  ctx.fillRect(px + w - 14, py + h - 14, 6, 6);

  // Center crosshair indent
  ctx.strokeStyle = 'rgba(118, 145, 148, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + w / 2, py + 14);
  ctx.lineTo(px + w / 2, py + h - 14);
  ctx.moveTo(px + 14, py + h / 2);
  ctx.lineTo(px + w - 14, py + h / 2);
  ctx.stroke();
}

function drawCenterFloorEmblem() {
  const cx = world.width / 2;
  const cy = world.height / 2;

  ctx.save();
  ctx.translate(cx, cy);

  // Outer ring
  ctx.strokeStyle = 'rgba(196, 138, 26, 0.16)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 80, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring
  ctx.strokeStyle = 'rgba(196, 138, 26, 0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 52, 0, Math.PI * 2);
  ctx.stroke();

  // Center dot
  ctx.fillStyle = 'rgba(196, 138, 26, 0.14)';
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  // Three radial biohazard arcs (the classic 3-arc symbol shape)
  ctx.strokeStyle = 'rgba(196, 138, 26, 0.12)';
  ctx.lineWidth = 6;
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(0, 0, 36, angle - 0.35, angle + 0.35);
    ctx.stroke();

    // Radial spoke from inner to outer ring
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 16, Math.sin(angle) * 16);
    ctx.lineTo(Math.cos(angle) * 72, Math.sin(angle) * 72);
    ctx.strokeStyle = 'rgba(196, 138, 26, 0.08)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(196, 138, 26, 0.12)';
    ctx.lineWidth = 6;
  }

  ctx.restore();
}

function drawLabGroundDetail(detail) {
  const x = Math.floor(detail.x);
  const y = Math.floor(detail.y);
  const scale = detail.size;

  if (detail.type === 0) {
    // Metallic floor vent
    const width = 34 + scale * 10;
    const height = 18 + scale * 5;
    ctx.fillStyle = 'rgba(4, 7, 8, 0.58)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = 'rgba(118, 145, 148, 0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = 'rgba(118, 145, 148, 0.18)';
    for (let slot = 6; slot < width - 6; slot += 9) {
      ctx.fillRect(x + slot, y + 4, 3, height - 8);
    }
  } else if (detail.type === 1) {
    // Exposed server floor cabling
    ctx.strokeStyle = detail.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 22 * scale, y + 4);
    ctx.lineTo(x + 36 * scale, y - 8);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x - 2, y - 2, 5, 5);
  } else if (detail.type === 2) {
    // Shattered glass shards
    ctx.fillStyle = 'rgba(180, 226, 222, 0.20)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 8 * scale, y + 2);
    ctx.lineTo(x + 3 * scale, y + 10 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x + 12, y + 8, 4, 2);
    ctx.fillRect(x - 8, y + 4, 3, 3);
  } else if (detail.type === 3) {
    // Floor rivet bolt plate cluster
    const plateW = 20 + scale * 6;
    const plateH = 14 + scale * 4;
    ctx.fillStyle = 'rgba(60, 72, 76, 0.22)';
    ctx.fillRect(x, y, plateW, plateH);
    ctx.strokeStyle = 'rgba(92, 110, 114, 0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, plateW, plateH);
    // Corner bolts
    ctx.fillStyle = 'rgba(140, 160, 164, 0.28)';
    ctx.fillRect(x + 3, y + 3, 4, 4);
    ctx.fillRect(x + plateW - 7, y + 3, 4, 4);
    ctx.fillRect(x + 3, y + plateH - 7, 4, 4);
    ctx.fillRect(x + plateW - 7, y + plateH - 7, 4, 4);
  } else if (detail.type === 4) {
    // Small chemical leak
    ctx.fillStyle = 'rgba(57, 255, 20, 0.15)';
    ctx.beginPath();
    ctx.ellipse(x, y, 12 * scale, 5 * scale, detail.angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(112, 255, 75, 0.16)';
    ctx.fillRect(x - 3, y - 2, 8 * scale, 3);
  }
}

function drawFloorStains() {
  floorStains.forEach(stain => {
    const alpha = Math.max(0, Math.min(stain.alpha, stain.alpha * (stain.life / stain.maxLife)));

    ctx.save();
    ctx.translate(stain.x, stain.y);
    ctx.rotate(stain.angle);
    
    // For chemical stains, draw a circle (do not squash)
    if (stain.type === 'chemical') {
      ctx.scale(1, 1.0);
    } else {
      ctx.scale(1, stain.squash);
    }

    if (stain.type === 'blood') {
      ctx.fillStyle = 'rgba(92, 6, 6, ' + alpha + ')';
    } else if (stain.type === 'chemical') {
      ctx.fillStyle = 'rgba(57, 255, 20, ' + alpha + ')';
    } else {
      ctx.fillStyle = 'rgba(0, 0, 0, ' + alpha + ')';
    }

    ctx.beginPath();
    if (stain.type === 'chemical') {
      ctx.arc(0, 0, stain.radius, 0, Math.PI * 2);
    } else {
      ctx.ellipse(0, 0, stain.radius, stain.radius * 0.55, 0, 0, Math.PI * 2);
    }
    ctx.fill();

    if (stain.type === 'blood') {
      ctx.fillStyle = 'rgba(142, 12, 10, ' + alpha * 0.45 + ')';
      ctx.fillRect(-stain.radius * 0.55, -2, stain.radius * 0.9, 4);
      ctx.fillRect(stain.radius * 0.15, -stain.radius * 0.32, 5, 5);
    } else if (stain.type === 'chemical') {
      ctx.fillStyle = 'rgba(180, 255, 91, ' + alpha * 0.38 + ')';
      ctx.fillRect(-stain.radius * 0.42, -2, stain.radius * 0.84, 4);
      ctx.fillRect(stain.radius * 0.1, stain.radius * 0.18, 6, 6);
    }

    ctx.restore();
  });
}

function drawObstacleGroundMarks() {
  obstacles.forEach(obstacle => {
    if (obstacle.type !== 'containment' && obstacle.type !== 'chemical') {
      return;
    }

    ctx.save();
    ctx.translate(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);

    if (obstacle.type === 'containment') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.beginPath();
      ctx.ellipse(0, 8, obstacle.width * 0.62, obstacle.height * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(57, 255, 20, 0.12)';
      ctx.beginPath();
      ctx.ellipse(0, 6, obstacle.width * 0.68, obstacle.height * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  });
}

function drawObjectShadow(x, y, width, height, alpha) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, ' + alpha + ')';
  ctx.beginPath();
  ctx.ellipse(x + width / 2 + 8, y + height / 2 + 8, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(24, 29, 32, ' + alpha * 0.45 + ')';
  ctx.fillRect(x + 8, y + 8, width, height);
  ctx.restore();
}

function drawObstacles() {
  obstacles.forEach(obstacle => {
    const x = Math.floor(obstacle.x);
    const y = Math.floor(obstacle.y);
    const w = obstacle.width;
    const h = obstacle.height;

    // Soft offset shadow anchors props into the arena floor.
    drawObjectShadow(x, y, w, h, 0.48);

    if (obstacle.type === 'crate') {
      // Wooden supply crate
      ctx.fillStyle = '#3a2414';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#7a4a22';
      ctx.fillRect(x + 5, y + 5, w - 10, h - 10);
      ctx.fillStyle = '#b06b2d';
      ctx.fillRect(x + 10, y + 10, w - 20, 8);
      ctx.fillRect(x + 10, y + h - 18, w - 20, 8);
      ctx.fillStyle = '#2a160b';
      ctx.fillRect(x + Math.floor(w / 2) - 4, y + 8, 8, h - 16);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, w, h);
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 8);
      ctx.lineTo(x + w - 8, y + h - 8);
      ctx.moveTo(x + w - 8, y + 8);
      ctx.lineTo(x + 8, y + h - 8);
      ctx.stroke();
    } else if (obstacle.type === 'chemical') {
      // Chemical containment tank with a bright core
      ctx.fillStyle = '#10130a';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#2e451d';
      ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
      ctx.fillStyle = '#83d12f';
      ctx.fillRect(x + 13, y + 12, w - 26, h - 24);
      ctx.fillStyle = '#151812';
      ctx.fillRect(x + 18, y + 18, w - 36, h - 36);
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(x + Math.floor(w / 2) - 5, y + 12, 10, h - 24);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(57, 255, 20, 0.38)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 5, y - 5, w + 10, h + 10);
    } else if (obstacle.type === 'containment') {
      // Sealed specimen containment unit
      ctx.fillStyle = '#0b1114';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#28363a';
      ctx.fillRect(x + 8, y + 8, w - 16, h - 16);
      ctx.fillStyle = '#0e1818';
      ctx.fillRect(x + 18, y + 14, w - 36, h - 28);
      ctx.fillStyle = 'rgba(57, 255, 20, 0.34)';
      ctx.fillRect(x + 24, y + 20, w - 48, h - 40);
      ctx.fillStyle = '#c48a1a';
      ctx.fillRect(x + 10, y + 10, 14, 8);
      ctx.fillRect(x + w - 24, y + h - 18, 14, 8);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      ctx.strokeRect(x, y, w, h);
    } else if (obstacle.type === 'barrier') {
      // Quarantine barrier: industrial slab with a hazard face
      ctx.fillStyle = '#08080b';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#3b3b43';
      ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
      ctx.fillStyle = '#1a1a20';
      ctx.fillRect(x + 12, y + 12, w - 24, h - 24);
      ctx.fillStyle = '#ff7700';
      ctx.fillRect(x + 18, y + Math.floor(h / 2) - 6, w - 36, 12);
      ctx.fillStyle = '#000000';
      for (let stripe = x + 28; stripe < x + w - 28; stripe += 34) {
        ctx.fillRect(stripe, y + Math.floor(h / 2) - 6, 12, 12);
      }
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      ctx.strokeRect(x, y, w, h);
    } else {
      // Lab console or server plinth
      ctx.fillStyle = '#0a0e11';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#3b4a50';
      ctx.fillRect(x + 5, y + 5, w - 10, h - 10);
      ctx.fillStyle = '#11191c';
      ctx.fillRect(x + 12, y + 12, w - 24, h - 24);
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(x + 18, y + 18, 12, 8);
      ctx.fillRect(x + 38, y + 18, 12, 8);
      ctx.fillStyle = '#c48a1a';
      ctx.fillRect(x + w - 48, y + h - 22, 30, 6);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      ctx.strokeRect(x, y, w, h);
    }
  });
}

/**
 * Renders the player survivor sprite onto the canvas.
 */
/**
 * Renders the player survivor sprite onto the canvas.
 * Pivots dynamically 360 degrees to face mouse cursor.
 */
function drawPlayer() {
  const size = player.size;

  // Calculate dynamic angle towards target pointer relative to camera offset
  const playerScreenX = player.x - camera.x;
  const playerScreenY = player.y - camera.y;
  const aimDx = mouse.x - playerScreenX;
  const aimDy = mouse.y - playerScreenY;
  const angle = Math.atan2(aimDy, aimDx);

  drawObjectShadow(player.x - size * 0.55, player.y - size * 0.35, size * 1.1, size * 0.7, 0.52);

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(angle); // Pivot character space

  // Render elements relative to local origin (0, 0)
  
  // 1. Floor Drop Shadow (flat offset block)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(-14, -12, 26, 26);

  // 2. Tactical Backpack (rendered on their back - left)
  ctx.fillStyle = '#2f2f3a';
  ctx.fillRect(-18, -10, 6, 20);
  ctx.fillStyle = '#ffbb00'; // Gold backpack buckles
  ctx.fillRect(-18, -6, 2, 2);
  ctx.fillRect(-18, 4, 2, 2);

  // 3. Main Torso Suit (Heavy charcoal base)
  ctx.fillStyle = '#4e4e5e';
  ctx.fillRect(-12, -12, 22, 24);
  
  // 4. Utility Plate Vest (Hazard orange & metal shield)
  ctx.fillStyle = '#ff7700'; // Vest base
  ctx.fillRect(-8, -8, 16, 16);
  ctx.fillStyle = '#7c7c8c'; // Center chestplate
  ctx.fillRect(-4, -6, 8, 12);
  ctx.fillStyle = '#39ff14'; // Combat power indicator dot
  ctx.fillRect(-2, -2, 4, 4);

  // 5. Heavy Carbine Rifle (protrudes forward - right)
  ctx.fillStyle = '#1c1c24'; // Carbine base body
  ctx.fillRect(8, 2, 14, 5);
  ctx.fillStyle = '#0c0c10'; // Iron barrel extension
  ctx.fillRect(22, 3, 6, 3);
  ctx.fillStyle = '#7c7c8c'; // Muzzle flash hider cap
  ctx.fillRect(28, 2, 2, 5);

  // 6. Right Arm (wraps around stock)
  ctx.fillStyle = '#ffaa00'; // Utility strap highlight
  ctx.fillRect(-2, -14, 6, 4);
  ctx.fillStyle = '#4e4e5e';
  ctx.fillRect(-2, -14, 6, 3);

  // 7. Left Arm (supports barrel)
  ctx.fillStyle = '#4e4e5e';
  ctx.fillRect(4, 6, 6, 4);

  // 8. Cybernetic Helmet (steel plate shell)
  ctx.fillStyle = '#383845';
  ctx.fillRect(-6, -7, 12, 14);

  // 9. Glowing Neon Visor (on the right - facing direction)
  ctx.fillStyle = '#00ffff';
  ctx.fillRect(2, -5, 4, 10);
  ctx.fillStyle = '#ffffff'; // Visor light reflection dot
  ctx.fillRect(4, -3, 2, 2);

  // 10. Outer Black Pixel Art Outline Border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeRect(-12, -12, 22, 24);

  ctx.restore();
}

/**
 * Renders bullets with high-impact nested plasma paths and glowing cores.
 */
function drawBullets() {
  bullets.forEach(b => {
    // 1. Render continuous nested vector trails if we have historical points
    if (b.trail.length > 1) {
      // Pass A: Wide neon yellow energy sheath (outer glow)
      ctx.strokeStyle = 'rgba(255, 235, 0, 0.25)';
      ctx.lineWidth = b.size;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
      
      ctx.beginPath();
      ctx.moveTo(b.trail[0].x, b.trail[0].y);
      for (let j = 1; j < b.trail.length; j++) {
        ctx.lineTo(b.trail[j].x, b.trail[j].y);
      }
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Pass B: Intense bright gold/yellow envelope (mid glow)
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = b.size * 0.6;
      ctx.beginPath();
      ctx.moveTo(b.trail[0].x, b.trail[0].y);
      for (let j = 1; j < b.trail.length; j++) {
        ctx.lineTo(b.trail[j].x, b.trail[j].y);
      }
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Pass C: Superheated electric white filament core (inner bullet trail)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = b.size * 0.25;
      ctx.beginPath();
      // Start slightly closer to the tip for a tapering beam effect
      const startIdx = Math.floor(b.trail.length / 2);
      ctx.moveTo(b.trail[startIdx].x, b.trail[startIdx].y);
      for (let j = startIdx + 1; j < b.trail.length; j++) {
        ctx.lineTo(b.trail[j].x, b.trail[j].y);
      }
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // 2. Render bullet main projectile head block
    const half = b.size / 2;

    // Outer solid plasma outline (Vibrant neon yellow)
    ctx.fillStyle = '#ffee00';
    ctx.fillRect(Math.floor(b.x - half), Math.floor(b.y - half), b.size, b.size);

    // Inner bright fusing core (White)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.floor(b.x - b.size / 4), Math.floor(b.y - b.size / 4), b.size / 2, b.size / 2);
    
    // High-contrast outline border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.floor(b.x - half), Math.floor(b.y - half), b.size, b.size);
  });
}

/**
 * Renders glowing neon-green toxic acid projectiles with blocky shapes.
 */
function drawEnemyProjectiles() {
  enemyProjectiles.forEach(ep => {
    const half = ep.size / 2;

    // Outer toxic lime glow (Wide green energy sheath)
    ctx.fillStyle = '#73ff00';
    ctx.fillRect(Math.floor(ep.x - half), Math.floor(ep.y - half), ep.size, ep.size);

    // Inner bright fusing neon green core
    ctx.fillStyle = '#39ff14';
    ctx.fillRect(Math.floor(ep.x - ep.size / 4), Math.floor(ep.y - ep.size / 4), ep.size / 2, ep.size / 2);

    // High-contrast black outline border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.floor(ep.x - half), Math.floor(ep.y - half), ep.size, ep.size);
  });
}

/**
 * Renders glowing, translucent green floor chemical puddles for Toxic Trails.
 */
function drawToxicTrails() {
  ctx.save();
  toxicTrails.forEach(trail => {
    // Fade out as it expires
    const alpha = trail.life / trail.maxLife;

    // Outer glow ring
    ctx.globalAlpha = alpha * 0.20;
    ctx.fillStyle = '#39ff14'; // Lime green
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, trail.size, 0, Math.PI * 2);
    ctx.fill();

    // Inner puddle core
    ctx.globalAlpha = alpha * 0.40;
    ctx.fillStyle = '#228b22'; // Forest chemical green
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, trail.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

/**
 * Renders jagged neon-cyan Chain Lightning electrical vectors on the canvas.
 */
function drawLightningArcs() {
  ctx.save();
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  lightningArcs.forEach(arc => {
    ctx.globalAlpha = arc.life;
    ctx.beginPath();
    ctx.moveTo(arc.x1, arc.y1);

    // Procedural jagged electric lightning bolt segments
    const segments = 4;
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      const px = arc.x1 + (arc.x2 - arc.x1) * t;
      const py = arc.y1 + (arc.y2 - arc.y1) * t;

      // Perpendicular deflection vector
      const perpX = -(arc.y2 - arc.y1);
      const perpY = (arc.x2 - arc.x1);
      const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);

      let ox = 0;
      let oy = 0;
      if (perpLength > 0) {
        // Jagged deflection magnitude (up to 16px)
        const offsetAmt = (Math.random() - 0.5) * 16;
        ox = (perpX / perpLength) * offsetAmt;
        oy = (perpY / perpLength) * offsetAmt;
      }

      ctx.lineTo(px + ox, py + oy);
    }

    ctx.lineTo(arc.x2, arc.y2);
    ctx.stroke();
  });

  ctx.restore();
}

/**
 * Renders the Legendary Orbiting Defender energy blades circling the player.
 */
function drawOrbitingDefender() {
  if (player.orbitingDefenderLevel <= 0) return;

  const radius = 45;
  const size = 12;
  const half = size / 2;

  for (let d = 0; d < player.orbitingDefenderLevel; d++) {
    const angleOffset = d * (Math.PI * 2 / player.orbitingDefenderLevel);
    const bladeX = player.x + Math.cos(player.defenderAngle + angleOffset) * radius;
    const bladeY = player.y + Math.sin(player.defenderAngle + angleOffset) * radius;

    ctx.save();
    ctx.translate(bladeX, bladeY);
    ctx.rotate(player.defenderAngle + angleOffset + Math.PI / 4); // spin blade locally

    // Draw glowing orange energy blade square
    ctx.fillStyle = '#ff7700'; // Rusty orange outer bevel
    ctx.fillRect(-half, -half, size, size);

    ctx.fillStyle = '#ffee00'; // Hot yellow glowing center core
    ctx.fillRect(-half + 3, -half + 3, size - 6, size - 6);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(-half, -half, size, size);

    ctx.restore();
  }
}



/**
 * Renders all active zombies in detailed matching 8-bit blocky styles.
 * Pivots dynamically to face the player.
 */
function drawZombies() {
  zombies.forEach(z => {
    const size = z.size;
    const baseSpriteSizes = {
      normal: 32,
      fast: 24,
      spitter: 28,
      exploder: 30,
      tank: 40
    };
    const spriteScale = size / (baseSpriteSizes[z.type] || baseSpriteSizes.normal);

    // Calculate angle from zombie center pointing directly to player
    const zDx = player.x - z.x;
    const zDy = player.y - z.y;
    const angle = Math.atan2(zDy, zDx);

    drawObjectShadow(z.x - size * 0.52, z.y - size * 0.32, size * 1.04, size * 0.64, 0.5);

    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.rotate(angle); // Pivot zombie space towards player
    ctx.scale(spriteScale, spriteScale); // Match the sprite to its larger hitbox

    if (z.type === 'tank') {
      // ==================== HEAVY TANK ZOMBIE SPRITE DESIGN (40px) ====================
      
      // 1. Floor Drop Shadow (larger offset block)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(-18, -16, 36, 32);

      // 2. Heavy Armored Back-Plate (Dark iron/steel armor lining)
      ctx.fillStyle = '#1e1f26';
      ctx.fillRect(-22, -14, 8, 28);
      ctx.fillStyle = '#7c7c8c'; // Plate rivets
      ctx.fillRect(-20, -10, 2, 2);
      ctx.fillRect(-20, 8, 2, 2);

      // 3. Main Torso (concrete-gray heavy riot vest over rotting dark green)
      ctx.fillStyle = '#124409'; // Rotting moss green flesh base
      ctx.fillRect(-14, -14, 24, 28);
      ctx.fillStyle = '#4b4b54'; // Riot plating vest chest
      ctx.fillRect(-8, -10, 16, 20);
      ctx.fillStyle = '#ff7700'; // Rusty warning decals
      ctx.fillRect(-2, -6, 4, 12);

      // 4. Exposed Heavy Ribs/Spikes
      ctx.fillStyle = '#e8e8d8';
      ctx.fillRect(4, -8, 2, 4);
      ctx.fillRect(4, 4, 2, 4);

      // 5. Left Heavy Reaching Arm (thick green muscle)
      ctx.fillStyle = '#124409';
      ctx.fillRect(8, 6, 14, 6);
      ctx.fillStyle = '#a10b0b'; // Blooded bone-tipped spikes
      ctx.fillRect(22, 6, 3, 6);

      // 6. Right Heavy Grab Arm (thick green muscle)
      ctx.fillStyle = '#0f3807';
      ctx.fillRect(8, -12, 16, 6);
      ctx.fillStyle = '#a10b0b';
      ctx.fillRect(24, -12, 3, 6);

      // 7. Reinforced Helmet/Skull Cap (metal visor head)
      ctx.fillStyle = '#1c1d22';
      ctx.fillRect(-8, -9, 14, 18);

      // 8. Glowing Feral Orange/Yellow Cyber Eyes
      ctx.fillStyle = '#ff9900';
      ctx.fillRect(2, -6, 4, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, -3, 2, 2);

      // 9. Outer Black Pixel Art Outline Border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(-14, -14, 24, 28);

    } else if (z.type === 'fast') {
      // ==================== FAST ZOMBIE SPRITE DESIGN (24px) ====================
      
      // 1. Floor Drop Shadow (smaller offset block)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(-10, -9, 18, 18);

      // 2. Exposed Rotten Spine (small bloody column)
      ctx.fillStyle = '#8a0000';
      ctx.fillRect(-12, -4, 3, 8);
      ctx.fillStyle = '#eae2cd';
      ctx.fillRect(-12, -2, 2, 2);

      // 3. Main Torso (Dirty mustard-yellow asylum jumpsuit)
      ctx.fillStyle = '#8c6b0c';
      ctx.fillRect(-9, -9, 16, 18);

      // 4. Exposed Rotten Chest (slender green decay & exposed bone)
      ctx.fillStyle = '#659c0e';
      ctx.fillRect(-6, -6, 10, 12);
      ctx.fillStyle = '#9e1111'; // Small blood core
      ctx.fillRect(-2, -3, 5, 6);

      // 5. Left Clawing Arm (reaching forward - bottom right)
      ctx.fillStyle = '#659c0e';
      ctx.fillRect(4, 4, 12, 3);
      ctx.fillStyle = '#0f0f13'; // Sharp black claw tips
      ctx.fillRect(16, 4, 2, 3);

      // 6. Right Reaching Arm (extra long slender claw - top right)
      ctx.fillStyle = '#528209';
      ctx.fillRect(4, -7, 16, 3);
      ctx.fillStyle = '#0f0f13'; // Sharp black claw tips
      ctx.fillRect(20, -7, 2, 3);

      // 7. Exposed Rotting Skull (bloody exposed cranium brains)
      ctx.fillStyle = '#659c0e';
      ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = '#b30909'; // Bloody exposed brains on skull top
      ctx.fillRect(-2, -5, 5, 3);

      // 8. Glowing Neon Yellow Visor/Rage Eyes
      ctx.fillStyle = '#ffee00';
      ctx.fillRect(1, -3, 3, 6);

      // 9. Outer Black Pixel Art Outline Border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-9, -9, 16, 18);

    } else if (z.type === 'spitter') {
      // ==================== ACID SPITTER ZOMBIE SPRITE DESIGN (28px) ====================
      // 1. Floor Drop Shadow (slender block shadow)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(-12, -10, 22, 20);

      // 2. Main Torso Suit (Industrial hazardous-yellow jumpsuit)
      ctx.fillStyle = '#bfa50e'; // Hazmat yellow base
      ctx.fillRect(-10, -10, 18, 20);

      // 3. Chemical Filtration Tank on back (charcoal cylinder)
      ctx.fillStyle = '#2b2b35';
      ctx.fillRect(-14, -6, 4, 12);
      ctx.fillStyle = '#39ff14'; // Green safety valve glowing indicator
      ctx.fillRect(-14, -2, 2, 2);

      // 4. Bloated Glowing Throat Pouch (slime green chamber)
      ctx.fillStyle = '#73ff00'; // Bladder chamber
      ctx.fillRect(-3, -8, 8, 16);
      ctx.fillStyle = '#39ff14'; // Brightest toxic core
      ctx.fillRect(0, -5, 4, 10);

      // 5. Left Arm (dripping neon-lime slime - bottom right)
      ctx.fillStyle = '#bfa50e';
      ctx.fillRect(4, 5, 10, 3);
      ctx.fillStyle = '#73ff00'; // Slime drip tip
      ctx.fillRect(14, 5, 2, 3);

      // 6. Right Arm (dripping neon-lime slime - top right)
      ctx.fillStyle = '#9e880c';
      ctx.fillRect(4, -8, 10, 3);
      ctx.fillStyle = '#73ff00'; // Slime drip tip
      ctx.fillRect(14, -8, 2, 3);

      // 7. Hazmat Hood & Visor (green gasmask glass)
      ctx.fillStyle = '#1c1c22'; // Gasmask black rubber faceplate
      ctx.fillRect(-5, -6, 10, 12);
      ctx.fillStyle = '#39ff14'; // Glowing neon-green bio-visor
      ctx.fillRect(1, -4, 3, 8);
      ctx.fillStyle = '#ffffff'; // light reflection
      ctx.fillRect(3, -2, 1, 2);

      // 8. Outer Black Pixel Art Outline Border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-10, -10, 18, 20);

    } else if (z.type === 'exploder') {
      // ==================== EXPLODER BOMBER ZOMBIE SPRITE DESIGN (30px) ====================
      // 1. Floor Drop Shadow (chunky round block shadow)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(-14, -13, 26, 26);

      // 2. Slag/Ash Charcoal Back-Plating (heavy dark charcoal)
      ctx.fillStyle = '#1f1a1d';
      ctx.fillRect(-15, -12, 6, 24);

      // 3. Bloated Torso (swollen blistered volatile orange & crimson flesh)
      ctx.fillStyle = '#a61c00'; // Crimson swollen skin base
      ctx.fillRect(-11, -12, 22, 24);
      
      // 4. Glowing Molten Fissures/Blisters (unstable energy)
      ctx.fillStyle = '#ff5100'; // Swollen hot orange core blister
      ctx.fillRect(-5, -9, 12, 18);
      ctx.fillStyle = '#ffee00'; // Electric superheated volcanic core sparks
      ctx.fillRect(-1, -5, 6, 10);
      ctx.fillRect(-7, -4, 2, 2);
      ctx.fillRect(3, 4, 2, 2);

      // 5. Left Grab Arm (bloated fiery claw - bottom right)
      ctx.fillStyle = '#a61c00';
      ctx.fillRect(5, 6, 11, 4);
      ctx.fillStyle = '#ffaa00'; // Blazing hot claws
      ctx.fillRect(16, 6, 2, 4);

      // 6. Right Grab Arm (bloated fiery claw - top right)
      ctx.fillStyle = '#7a1400';
      ctx.fillRect(5, -10, 11, 4);
      ctx.fillStyle = '#ffaa00'; // Blazing hot claws
      ctx.fillRect(16, -10, 2, 4);

      // 7. Swollen Molten Skull (crackling yellow fire cap brains)
      ctx.fillStyle = '#a61c00';
      ctx.fillRect(-6, -7, 12, 14);
      ctx.fillStyle = '#ff9900'; // Brain cavity is boiling fire
      ctx.fillRect(-2, -7, 6, 4);

      // 8. Glowing Feral Volatile Red Eyes
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(2, -4, 4, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, -2, 2, 2);

      // 9. Outer Black Pixel Art Outline Border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeRect(-11, -12, 22, 24);

    } else {
      // ==================== NORMAL ZOMBIE SPRITE DESIGN (32px) ====================

      // 1. Floor Drop Shadow (flat offset block)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(-14, -12, 26, 26);

      // 2. Rotting Spine Vertebrae (exposed bone white & blood red along left back edge)
      ctx.fillStyle = '#8a1111'; // Blood smear background
      ctx.fillRect(-16, -6, 4, 12);
      ctx.fillStyle = '#e5dec9'; // Bone pieces
      ctx.fillRect(-16, -4, 2, 2);
      ctx.fillRect(-16, 2, 2, 2);

      // 3. Main Torso (Decaying mud-brown worker coat)
      ctx.fillStyle = '#4a3b32';
      ctx.fillRect(-12, -12, 22, 24);

      // 4. Exposed Rotten Cavity (moss-green tissue & white ribs)
      ctx.fillStyle = '#226b14'; // Rotting green background
      ctx.fillRect(-8, -8, 14, 16);
      ctx.fillStyle = '#8a0000'; // Blood pocket
      ctx.fillRect(-4, -4, 8, 8);
      ctx.fillStyle = '#e8e8d8'; // Bone ribs
      ctx.fillRect(-2, -6, 2, 3);
      ctx.fillRect(-2, 3, 2, 3);
      ctx.fillRect(2, -6, 2, 3);
      ctx.fillRect(2, 3, 2, 3);

      // 5. Left Clawing Arm (reaching forward - bottom right)
      ctx.fillStyle = '#226b14';
      ctx.fillRect(6, 6, 12, 4);
      ctx.fillStyle = '#ff1111'; // Blood-stained claw tip
      ctx.fillRect(18, 6, 2, 4);

      // 6. Right Grab Arm (long reaching limb - top right)
      ctx.fillStyle = '#1c5410';
      ctx.fillRect(6, -10, 16, 4);
      ctx.fillStyle = '#ff1111'; // Blood-stained claw tip
      ctx.fillRect(22, -10, 2, 4);

      // 7. Rotten Infected Skull (decaying skull cap)
      ctx.fillStyle = '#1f5e12';
      ctx.fillRect(-6, -7, 12, 14);

      // 8. Glowing Cyber/Infected Crimson Visor Eyes (on the right - facing player)
      ctx.fillStyle = '#ff2222';
      ctx.fillRect(2, -5, 4, 10);
      ctx.fillStyle = '#ffffff'; // Feral glint reflection dot
      ctx.fillRect(4, -3, 2, 2);

      // 9. Outer Black Pixel Art Outline Border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeRect(-12, -12, 22, 24);
    }

    ctx.restore();

    // 10. Draw HUD health indicator bar in world space (above rotated zombie)
    if (z.health < z.maxHealth) {
      const barW = size;
      const barH = 5;
      const bx = z.x - size / 2;
      const by = z.y - size / 2 - 14;

      // Dark background border
      ctx.fillStyle = '#000000';
      ctx.fillRect(bx, by, barW, barH);

      // Red remaining health fill
      ctx.fillStyle = '#ff2222';
      const fillW = Math.max(0, (z.health / z.maxHealth) * barW);
      ctx.fillRect(bx, by, fillW, barH);
    }
  });
}

/**
 * Draws active muzzle flash sparks and decay structures on the canvas.
 */
function drawGameParticles() {
  gameParticles.forEach(p => {
    // Set particle opacity to fit current lifetime
    ctx.globalAlpha = p.life;

    // Calculate shrinking physical dimension based on current lifetime
    const activeSize = Math.max(1, Math.floor(p.size * p.life));

    ctx.fillStyle = p.color;
    
    // Draw blood splatters and enemy flesh chunks as circles, others as retro squares
    if (p.color === '#ff1111' || p.color === '#2d8a1e' || p.color === '#8a0000') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, activeSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(
        Math.floor(p.x - activeSize / 2),
        Math.floor(p.y - activeSize / 2),
        activeSize,
        activeSize
      );
    }
  });

  // Reset globalAlpha to full opacity
  ctx.globalAlpha = 1.0;
}

/**
 * Renders aiming laser guidance system tracking client cursor.
 */
function drawAimGuide() {
  // Aiming math relative to screen translations
  const playerScreenX = player.x - camera.x;
  const playerScreenY = player.y - camera.y;
  const aimDx = mouse.x - playerScreenX;
  const aimDy = mouse.y - playerScreenY;
  const angle = Math.atan2(aimDy, aimDx);

  const startDist = player.size / 2 + 6;
  const sightLength = 60; // Dotted projection length

  const sx = player.x + Math.cos(angle) * startDist;
  const sy = player.y + Math.sin(angle) * startDist;
  const ex = player.x + Math.cos(angle) * (startDist + sightLength);
  const ey = player.y + Math.sin(angle) * (startDist + sightLength);

  // Toxic green dashed retro indicator guide
  ctx.strokeStyle = 'rgba(57, 255, 20, 0.4)';
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 6]); // Dash dimensions

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  // Reset line-dash styling for core rendering elements
  ctx.setLineDash([]);
}


// Update HUD
// Syncs the on-screen HUD with the current player stats.

function updateHUD() {
  healthValue.textContent = player.health;
  scoreValue.textContent  = gameState.score;
  waveValue.textContent   = gameState.wave;

  // Update retro segmented health bar width
  if (healthFill) {
    const clampedHealth = Math.max(0, Math.min(100, player.health));
    healthFill.style.width = clampedHealth + '%';
  }
}


// Ground Details Generation
// Generates procedural coordinates distributed throughout the extensive 2500x2500 world space.
// Keeps items beautifully spaced and checks for obstacles overlap so things are never cluttered.

function generateGroundDetails() {
  groundDetails = [];
  const numDetails = 140; // slightly reduced count since they don't stack up anymore

  let attempts = 0;
  while (groundDetails.length < numDetails && attempts < 1500) {
    attempts++;
    const roll = Math.random();
    let detailType = 0;
    if (roll < 0.26) {
      detailType = 0; // vents
    } else if (roll < 0.48) {
      detailType = 1; // exposed cabling
    } else if (roll < 0.68) {
      detailType = 2; // shattered glass
    } else if (roll < 0.84) {
      detailType = 3; // rivet bolt plates
    } else {
      detailType = 4; // chemical leak
    }
    const scale = Math.floor(Math.random() * 2) + 2;
    
    // Approximate bounding box of details to prevent overlapping
    let w = 34 + scale * 10;
    let h = 18 + scale * 5;
    if (detailType === 1) { w = 36 * scale; h = 12 * scale; }
    else if (detailType === 2) { w = 24; h = 24; }
    else if (detailType === 3) { w = 20 + scale * 6; h = 14 + scale * 4; }
    else if (detailType === 4) { w = 24 * scale; h = 10 * scale; }

    // Bounded coordinates in world dimensions (2500x2500)
    const wx = Math.random() * (world.width - w - 80) + 40;
    const wy = Math.random() * (world.height - h - 80) + 40;

    let tooClose = false;

    // Check overlap with solid obstacles (we want ground details to be clear of solid props)
    const padObstacle = 20;
    const candidateRect = {
      x: wx - padObstacle,
      y: wy - padObstacle,
      width: w + padObstacle * 2,
      height: h + padObstacle * 2
    };
    for (let j = 0; j < obstacles.length; j++) {
      if (rectsOverlap(candidateRect, obstacles[j])) {
        tooClose = true;
        break;
      }
    }

    // Check overlap with other ground details to prevent "stacking vents"
    if (!tooClose) {
      for (let j = 0; j < groundDetails.length; j++) {
        const gd = groundDetails[j];
        const dist = Math.hypot(wx - gd.x, wy - gd.y);
        
        // Vents and chemical leaks shouldn't crowd each other
        const minDist = (detailType === 0 || gd.type === 0 || detailType === 4 || gd.type === 4) ? 140 : 60;
        if (dist < minDist) {
          tooClose = true;
          break;
        }
      }
    }

    if (!tooClose) {
      groundDetails.push({
        type: detailType,
        x: wx,
        y: wy,
        size: scale,
        angle: Math.random() * Math.PI,
        color: Math.random() > 0.5 ? 'rgba(57, 255, 20, 0.34)' : 'rgba(196, 138, 26, 0.28)'
      });
    }
  }
}

function generateMapObstacles() {
  obstacles = [];

  // Hand-placed landmarks make the arena feel intentional.
  const centerX = world.width / 2;
  const centerY = world.height / 2;
  addObstacle('barrier', centerX - 430, centerY - 330, 190, 54);
  addObstacle('containment', centerX + 270, centerY - 360, 170, 78);
  addObstacle('console', centerX - 500, centerY + 280, 180, 62);
  addObstacle('chemical', centerX + 390, centerY + 250, 82, 108);

  const obstacleTypes = [
    { type: 'crate', minW: 64, maxW: 84, minH: 64, maxH: 84 },
    { type: 'barrier', minW: 150, maxW: 230, minH: 46, maxH: 58 },
    { type: 'containment', minW: 130, maxW: 190, minH: 66, maxH: 84 },
    { type: 'console', minW: 130, maxW: 200, minH: 52, maxH: 70 },
    { type: 'chemical', minW: 70, maxW: 86, minH: 92, maxH: 118 }
  ];

  let attempts = 0;
  while (obstacles.length < 18 && attempts < 500) {
    attempts += 1;
    const preset = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    const width = Math.floor(randomBetween(preset.minW, preset.maxW));
    const height = Math.floor(randomBetween(preset.minH, preset.maxH));
    const x = Math.floor(randomBetween(90, world.width - width - 90));
    const y = Math.floor(randomBetween(130, world.height - height - 90));

    if (canPlaceObstacle(x, y, width, height)) {
      addObstacle(preset.type, x, y, width, height);
    }
  }
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function addObstacle(type, x, y, width, height) {
  obstacles.push({
    type: type,
    x: Math.floor(x),
    y: Math.floor(y),
    width: Math.floor(width),
    height: Math.floor(height)
  });
}

function canPlaceObstacle(x, y, width, height) {
  const centerX = world.width / 2;
  const centerY = world.height / 2;
  const obstacleCenterX = x + width / 2;
  const obstacleCenterY = y + height / 2;
  const dx = obstacleCenterX - centerX;
  const dy = obstacleCenterY - centerY;
  const spawnSafeRadius = 260;

  if (Math.sqrt(dx * dx + dy * dy) < spawnSafeRadius) {
    return false;
  }

  const padding = 110; // Spreads out obstacles beautifully for clean paths and perfect bouncing bullet setups
  const candidate = {
    x: x - padding,
    y: y - padding,
    width: width + padding * 2,
    height: height + padding * 2
  };

  for (let i = 0; i < obstacles.length; i++) {
    if (rectsOverlap(candidate, obstacles[i])) {
      return false;
    }
  }

  return true;
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}


// Game Over
// Call this function when the player's health reaches 0.

function gameOver() {
  gameState.isRunning = false;
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  // Fill in the final stats on the game-over screen
  finalName.textContent  = gameState.playerName;
  finalKills.textContent = gameState.kills;
  finalScore.textContent = gameState.score;
  finalWave.textContent  = gameState.wave;

  // Save the run to Supabase (runs in background, won't block the UI)
  saveScore(
    gameState.playerName,
    gameState.score,
    gameState.wave,
    gameState.kills,
    upgradesChosen
  );

  // Switch to the game-over screen
  showScreen(gameoverScreen);
}


// Keyboard Input Event Listeners
window.addEventListener('keydown', function(event) {
  const key = event.key.toLowerCase();
  if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
    keys[key] = true;
  }
});

window.addEventListener('keyup', function(event) {
  const key = event.key.toLowerCase();
  if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
    keys[key] = false;
  }
});


// Mouse Tracking Input Event Listeners
window.addEventListener('mousemove', function(event) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = event.clientX - rect.left;
  mouse.y = event.clientY - rect.top;
});

window.addEventListener('mousedown', function(event) {
  // Capture left-clicks when active in gameplay
  if (event.button === 0 && gameState.isRunning) {
    mouse.isDown = true;
  }
});

window.addEventListener('mouseup', function(event) {
  if (event.button === 0) {
    mouse.isDown = false;
  }
});


// Button Event Listeners

// Start Game button
startBtn.addEventListener('click', startGame);

// Allow pressing Enter in the name field to start the game
playerNameInput.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    startGame();
  }
});

// Leaderboard button — load from Supabase and open leaderboard screen
leaderboardBtn.addEventListener('click', async function() {
  // Show loading state
  leaderboardBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-secondary); padding: 2rem;">Loading scores...</td></tr>';
  showScreen(leaderboardScreen);

  // Try to load from Supabase
  const data = await loadLeaderboard();

  // If Supabase returned data, use it; otherwise fall back to sample data
  if (data && data.length > 0) {
    renderLeaderboard(data);
  } else {
    // Supabase not configured or empty — show sample data
    renderLeaderboard(sampleLeaderboardData);
  }
});

// Leaderboard back button — return to start screen
leaderboardBackBtn.addEventListener('click', function() {
  showScreen(startScreen);
});

// Restart button on the game-over screen
restartBtn.addEventListener('click', startGame);

// Main Menu button on the game-over screen
menuBtn.addEventListener('click', function() {
  showScreen(startScreen);
});

// Upgrades chosen listener / continue action handled directly on card selections

// Keyboard Shortcut for Testing
// Press "G" during gameplay to trigger the game-over screen.
window.addEventListener('keydown', function(event) {
  if (event.key === 'g' && gameState.isRunning) {
    // Simulate death for testing
    player.health = 0;
    gameState.score = Math.floor(Math.random() * 500);
    gameState.wave = Math.floor(Math.random() * 10) + 1;
    gameState.kills = Math.floor(Math.random() * 150);
    updateHUD();
    gameOver();
  }
});
