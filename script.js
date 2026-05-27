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

// Cheat Panel elements
const cheatPanel    = document.getElementById('cheat-panel');
const cheatCloseBtn = document.getElementById('cheat-close-btn');

// Pause elements & state
const pauseScreen = document.getElementById('pause-screen');
let isPaused = false;


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
let waveKillCount = 0;         // Kills made in the current wave (used by Slow Start)
let waveStartTick = 0;         // Game tick when the current wave began

// Roguelike Upgrades Selection Tracker
let upgradesChosen = [];

// Sound & Music Synthesizer Engine (Vanilla Web Audio API)
const audio = {
  ctx: null,
  isMuted: false,
  musicTimer: null,
  musicStep: 0,
  musicBpm: 125,

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser.");
    }
  },

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopMusic();
    } else {
      this.resume();
      if (gameState.isRunning) {
        this.startMusic();
      }
    }
    return this.isMuted;
  },

  // 🔊 Synthesize short sound effects dynamically
  playSfx(type) {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    switch (type) {
      case 'shoot': {
        // High-to-low retro laser sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }
      case 'hit': {
        // Quick high-passed noise-like pop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.08);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }
      case 'kill': {
        // Retro crunch sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.15);

        gain.gain.setValueAtTime(0.20, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
      case 'playerHit': {
        // Deep low frequency warning punch
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.25);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }
      case 'dash': {
        // Retro cyber-whoosh sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.22);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
        break;
      }
      case 'explosion': {
        // Heavy explosion rumble (low pitch + decaying gain)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.65);

        gain.gain.setValueAtTime(0.48, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.65);
        break;
      }
      case 'upgrade': {
        // Futuristic major power-up chime arpeggio
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4 -> E4 -> G4 -> C5
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noteTime = now + idx * 0.08;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, noteTime);

          gain.gain.setValueAtTime(0.18, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.005, noteTime + 0.22);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(noteTime);
          osc.stop(noteTime + 0.22);
        });
        break;
      }
      case 'bossSpawn': {
        // Impending low roaring sweeps
        for (let i = 0; i < 2; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const delay = i * 0.25;

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(110 - i * 20, now + delay);
          osc.frequency.linearRampToValueAtTime(30, now + delay + 0.85);

          gain.gain.setValueAtTime(0.35, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.85);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.85);
        }
        break;
      }
    }
  },

  // 🎵 Synthesize continuous loops for the background music (cyber arpeggiator sequencer)
  startMusic() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || this.musicTimer) return;

    const stepIntervalMs = (60 / this.musicBpm / 2) * 1000; // eighth notes loop
    this.musicTimer = setInterval(() => {
      this.playMusicStep();
    }, stepIntervalMs);
  },

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  },

  playMusicStep() {
    if (this.isMuted || !this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const step = this.musicStep;

    const chordNotes = [
      82.41, 82.41, 164.81, 82.41,
      97.99, 97.99, 195.99, 97.99,
      73.42, 73.42, 146.83, 73.42,
      65.41, 65.41, 130.81, 130.81
    ];

    const freq = chordNotes[step % chordNotes.length];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.20);

    if (step % 8 === 2) {
      const melodyFreq = freq * 3.0;
      const mOsc = ctx.createOscillator();
      const mGain = ctx.createGain();

      mOsc.type = 'sine';
      mOsc.frequency.setValueAtTime(melodyFreq, now);

      mGain.gain.setValueAtTime(0.04, now);
      mGain.gain.exponentialRampToValueAtTime(0.001, now + 0.40);

      mOsc.connect(mGain);
      mGain.connect(ctx.destination);
      mOsc.start(now);
      mOsc.stop(now + 0.45);
    } else if (step % 16 === 10) {
      const melodyFreq = freq * 4.0;
      const mOsc = ctx.createOscillator();
      const mGain = ctx.createGain();

      mOsc.type = 'sine';
      mOsc.frequency.setValueAtTime(melodyFreq, now);

      mGain.gain.setValueAtTime(0.03, now);
      mGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      mOsc.connect(mGain);
      mGain.connect(ctx.destination);
      mOsc.start(now);
      mOsc.stop(now + 0.40);
    }

    this.musicStep = (step + 1) % 16;
  }
};

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
  speed: 1.7, // Decreased base player speed for high-tension survival gameplay

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
  waveHealPercentage: 0.15,

  // 11 New Roguelike Upgrades Schema Extension
  critChance: 0.0,
  finisherDamage: 0.0,
  secondWindLevel: 0,
  secondWindTriggered: false,
  bioShieldLevel: 0,
  bioShieldActive: false,
  bioShieldTimer: 0,
  cryoCapsuleLevel: 0,
  reflexDashLevel: 0,
  reflexDashCooldown: 0,
  reflexDashDuration: 0,
  reflexDashVx: 0,
  reflexDashVy: 0,
  labMineLevel: 0,
  labMineTimer: 0,
  stimulantLevel: 0,
  overclockLevel: 0,
  overclockShotCounter: 0,
  killFrenzyLevel: 0,
  killFrenzyHistory: [],
  killFrenzyTimer: 0
};

// Keyboard Input Tracker
const keys = {
  w: false,
  a: false,
  s: false,
  d: false
};
const activeKeys = {};
const cheatPanelPassword = ['2', '0', '0', '5'].join('');

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
    description: 'Increase bullet damage by 5 (Capped at +100 max)',
    rarity: 'common',
    apply: () => {
      player.bulletDamage = Math.min(100, player.bulletDamage + 5);
    }
  },
  {
    id: 'speed',
    name: 'Speed Up',
    icon: '[MOVE]',
    description: 'Increase player speed by 0.20 (Capped at +2.50 max)',
    rarity: 'common',
    apply: () => {
      player.speed = Number((Math.min(4.2, player.speed + 0.20)).toFixed(2));
    }
  },
  {
    id: 'maxhealth',
    name: 'Max Health Up',
    icon: '[HP+]',
    description: 'Increase max health by 25 and heal for 25 HP (Capped at +250 max)',
    rarity: 'common',
    apply: () => {
      player.maxHealth = Math.min(350, player.maxHealth + 25); // 100 base + 250 cap = 350 max limit
      player.health = Math.min(player.maxHealth, player.health + 25);
    }
  },
  {
    id: 'heal',
    name: 'Heal Boost',
    icon: '[HEAL]',
    description: 'Increases natural wave completion heal by +5% of max HP (Stackable, capped at 75% max)',
    rarity: 'common',
    apply: () => {
      player.waveHealPercentage = Number((Math.min(0.75, player.waveHealPercentage + 0.05)).toFixed(2));
    }
  },
  {
    id: 'bulletspeed',
    name: 'Bullet Speed Up',
    icon: '[AMMO]',
    description: 'Increase bullet speed by 2.00 (Capped at 20 max)',
    rarity: 'common',
    apply: () => {
      player.bulletSpeed = Number((Math.min(20, player.bulletSpeed + 2.00)).toFixed(2));
    }
  },
  {
    id: 'thickskin',
    name: 'Thick Skin',
    icon: '[SKIN]',
    description: 'Reduce all incoming damage taken by 5.0% (Stackable, capped at 50% max reduction)',
    rarity: 'common',
    apply: () => {
      player.damageReduction = Number((Math.min(0.50, player.damageReduction + 0.050)).toFixed(4));
    }
  },
  {
    id: 'runnershigh',
    name: "Runner's High",
    icon: '[HIGH]',
    description: 'Gives an extra 0.15 speed boost when moving continuously for over 3 seconds (Stackable, capped at +1.0 max speed)',
    rarity: 'common',
    apply: () => {
      player.runnersHighLevel += 1;
    }
  },
  {
    id: 'giantbullets',
    name: 'Giant Bullets',
    icon: '[SIZE]',
    description: 'Increases physical size and collision hitbox of bullets by 20% (Stackable, capped at +120% size max)',
    rarity: 'common',
    apply: () => {
      player.bulletSizeModifier = Number((Math.min(1.2, player.bulletSizeModifier + 0.20)).toFixed(2));
    }
  },
  {
    id: 'retaliate',
    name: 'Retaliate',
    icon: '[RAGE]',
    description: 'Taking damage briefly triggers a +0.30 speed boost per stack (up to +1.5 max) for 2s (Stackable, duration capped at 6s max)',
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
    description: 'Reduce fire rate cooldown by 30ms (min 150ms)',
    rarity: 'rare',
    apply: () => {
      player.fireRate = Math.max(150, player.fireRate - 30);
    }
  },
  {
    id: 'lifesteal',
    name: 'Lifesteal',
    icon: '[VAMP]',
    description: 'Heal 0.25 HP after killing a zombie (Capped at 5 HP max)',
    rarity: 'rare',
    apply: () => {
      player.lifestealAmount = Number((Math.min(5.0, player.lifestealAmount + 0.25)).toFixed(2));
    }
  },
  {
    id: 'knockbackrounds',
    name: 'Knockback Rounds',
    icon: '[PUSH]',
    description: 'Increases pushback distance on hit by 10% (Stackable, capped at +150% max pushback)',
    rarity: 'rare',
    apply: () => {
      player.knockbackModifier = Number((Math.min(1.5, player.knockbackModifier + 0.10)).toFixed(2));
    }
  },
  {
    id: 'bouncingcasings',
    name: 'Bouncing Casings',
    icon: '[RICO]',
    description: 'Bullets bounce off map walls and obstacles +1 time per stack (Stackable, capped at 5 bounces max)',
    rarity: 'rare',
    apply: () => {
      player.bounceLimit = Math.min(5, player.bounceLimit + 1);
    }
  },
  {
    id: 'toxictrail',
    name: 'Toxic Trail',
    icon: '[MUCK]',
    description: 'Leave a faint chemical trail that deals minor damage over time (3 HP/sec per stack) and slows zombies by 20% (Stackable, slow effect caps at 70% max)',
    rarity: 'rare',
    apply: () => {
      player.toxicTrailLevel += 1;
    }
  },
  {
    id: 'splintershot',
    name: 'Splinter Shot',
    icon: '[CHIP]',
    description: 'Bullets split into fanned shrapnel pieces upon hitting walls/enemies. Each stack adds +2 split bullets (Caps at 10 split bullets max, damage capped at 40%)',
    rarity: 'rare',
    apply: () => {
      player.splinterShotLevel = Math.min(9, player.splinterShotLevel + 2); // Caps at level 9 (yields 10 split bullets)
    }
  },
  {
    id: 'steadyaim',
    name: 'Steady Aim',
    icon: '[STILL]',
    description: 'Increase damage by 10, but only if you are standing completely still while shooting (Stackable, capped at +60 max static damage)',
    rarity: 'rare',
    apply: () => {
      player.steadyAimLevel += 1;
    }
  },
  {
    id: 'phaseshift',
    name: 'Phase Shift',
    icon: '[VEIL]',
    description: 'Gain a 5% chance to completely dodge/evade any incoming zombie attack (Stackable, capped at 45% max dodge)',
    rarity: 'rare',
    apply: () => {
      player.dodgeChance = Number((Math.min(0.45, player.dodgeChance + 0.05)).toFixed(3));
    }
  },

  // 🟣 EPIC
  {
    id: 'doubleshot',
    name: 'Double Shot',
    icon: '[TWIN]',
    description: 'Adds +1 bullet! But all bullets deal -45% damage. Shoots parallel side-by-side; switches to narrow fan at 4+ bullets.',
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
    description: 'Bullets gain +10% chance to become fire rounds that burn zombies and deal +10% damage (Capped at 30% chance).',
    rarity: 'epic',
    apply: () => {
      player.burnLevel = Math.min(3, player.burnLevel + 1);
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
    description: 'Orbiting energy blade circles at a wide distance, dealing massive contact damage to zombies (Stackable, capped at 5 blades max)',
    rarity: 'legendary',
    apply: () => {
      player.orbitingDefenderLevel = Math.min(5, player.orbitingDefenderLevel + 1);
    }
  },
  {
    id: 'weakpointscan',
    name: 'Weak Point Scan',
    icon: '[CRIT]',
    description: 'Bullets gain +5% critical chance to deal 1.75x damage (Capped at 35% chance)',
    rarity: 'common',
    apply: () => {
      player.critChance = Number((Math.min(0.35, player.critChance + 0.05)).toFixed(2));
    }
  },
  {
    id: 'finisherrounds',
    name: 'Finisher Rounds',
    icon: '[EXEC]',
    description: 'Deal +8% damage to zombies below 35% HP (Capped at +60% execute damage)',
    rarity: 'epic',
    apply: () => {
      player.finisherDamage = Number((Math.min(0.60, player.finisherDamage + 0.08)).toFixed(2));
    }
  },
  {
    id: 'secondwind',
    name: 'Second Wind',
    icon: '[REVIVE]',
    description: 'Once per run, survive fatal damage and restore 40 HP. Re-picking adds +15 HP (Capped at 100 HP)',
    rarity: 'legendary',
    apply: () => {
      player.secondWindLevel = Math.min(5, player.secondWindLevel + 1);
    }
  },
  {
    id: 'bioshield',
    name: 'Bio-Shield',
    icon: '[SHIELD]',
    description: 'Every 12 seconds, block the next zombie hit. Stacks reduce cooldown by 1s (Capped at 6s)',
    rarity: 'epic',
    apply: () => {
      player.bioShieldLevel = Math.min(7, player.bioShieldLevel + 1);
      if (player.bioShieldTimer === 0) {
        player.bioShieldTimer = (12 - player.bioShieldLevel) * 60; // 60 ticks per sec
      }
    }
  },
  {
    id: 'cryocapsule',
    name: 'Cryo Capsule',
    icon: '[FREEZE]',
    description: 'Bullets gain +10% chance to become cryo rounds that slow zombies (Capped at 30% chance)',
    rarity: 'epic',
    apply: () => {
      player.cryoCapsuleLevel = Math.min(3, player.cryoCapsuleLevel + 1);
    }
  },
  {
    id: 'reflexdash',
    name: 'Reflex Dash',
    icon: '[DASH]',
    description: 'Press Space to dash a short distance (6s cooldown, stacks reduce by 1.0s, cap at 3s)',
    rarity: 'rare',
    apply: () => {
      player.reflexDashLevel = Math.min(7, player.reflexDashLevel + 1);
    }
  },
  {
    id: 'labmine',
    name: 'Lab Mine',
    icon: '[MINE]',
    description: 'Every 8 seconds, drop an explosive mine behind you. Stacks reduce cooldown by 1.5s and increase damage (Capped at 3s cooldown)',
    rarity: 'rare',
    apply: () => {
      player.labMineLevel = Math.min(6, player.labMineLevel + 1);
    }
  },
  {
    id: 'combatstim',
    name: 'Combat Stimulant',
    icon: '[STIM]',
    description: 'Gain +10% fire rate and +0.15 speed, but lose 5 max HP per stack (Fire rate cap +40%)',
    rarity: 'common',
    apply: () => {
      player.stimulantLevel = Math.min(7, player.stimulantLevel + 1);
      player.maxHealth = Math.max(10, player.maxHealth - 5);
      player.health = Math.min(player.maxHealth, player.health);
    }
  },
  {
    id: 'overclockedweapon',
    name: 'Overclocked Weapon',
    icon: '[OVER]',
    description: 'Every 10th shot fires a +50% damage supercharged bullet (Stacks reduce to every 5th shot)',
    rarity: 'epic',
    apply: () => {
      player.overclockLevel = Math.min(6, player.overclockLevel + 1);
    }
  },
  {
    id: 'killfrenzy',
    name: 'Kill Frenzy',
    icon: '[FRENZY]',
    description: 'Defeating 5 zombies quickly grants +30% speed and +30% fire rate for 3s (Capped at 8s duration)',
    rarity: 'rare',
    apply: () => {
      player.killFrenzyLevel = Math.min(6, player.killFrenzyLevel + 1);
    }
  },
  {
    id: 'slowstart',
    name: 'Slow Start',
    icon: '[RAMP]',
    description: 'Begin each wave at -50% attack speed. Speed ramps up linearly over 10 seconds to reach 2.5x. Stacks raise the cap to 3x.',
    rarity: 'legendary',
    apply: () => {
      player.slowStartLevel = Math.min(3, player.slowStartLevel + 1);
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
let explosions = [];    // For high-fidelity animated radial explosions
let activeMines = [];   // For dropped explosive mines in world bounds
let pendingSummons = []; // Necromancer warning circles before summoned enemies appear

// Patient Zero Boss Tracking
let bossesDefeated = 0;
let activeBoss = null; // Reference to the current boss zombie in the zombies array
const totalActiveZombiesCap = 45; // Performance cap for total active zombies (standard + summoned) to maintain 60fps
const bossSummonCooldown = 8000;  // Boss summons every 8 seconds
const bossSummonCastTime = 1200;  // Red flash warning before summon

// Spawning Variables
let lastZombieSpawnTime = 0;
const baseZombieSpawnDelay = 1500; // Wave 1 spawn pacing in milliseconds
const necromancerSummonCooldown = 11000; // Slightly slower than before so summons are less spammy
const necromancerSummonCastTime = 1400;  // Gives the player a clear visual warning before spawns

// Wave Scaling Helpers
// These formulas keep waves 1-20 fair, then push the real horde pressure later.
function getWaveZombieTotal(wave) {
  const safeWave = Math.max(1, wave);

  if (safeWave <= 10) {
    const progress = safeWave - 1;
    return Math.floor(5 + progress * 2 + Math.pow(progress, 1.1));
  }

  if (safeWave <= 25) {
    const progress = safeWave - 10;
    return Math.floor(38 + progress * 3.5 + Math.pow(progress, 1.15));
  }

  const lateProgress = safeWave - 25;
  return Math.floor(122 + lateProgress * 5.0 + Math.pow(lateProgress, 1.45));
}

function getZombieSpawnDelay(wave) {
  const safeWave = Math.max(1, wave);

  if (safeWave <= 10) {
    return Math.max(1000, baseZombieSpawnDelay - (safeWave - 1) * 50);
  }

  if (safeWave <= 25) {
    return Math.max(700, 1020 - (safeWave - 10) * 22);
  }

  return Math.max(400, 690 - (safeWave - 25) * 8);
}

function getZombieSpawnBatchSize(wave) {
  if (wave < 9) return 1;
  if (wave < 19) return 2;
  if (wave < 31) return 3;
  return 4;
}

function getMaxActiveZombies(wave) {
  const safeWave = Math.max(1, wave);

  if (safeWave <= 20) {
    return 10 + Math.floor(safeWave * 1.2);
  }

  return Math.min(60, 34 + Math.floor((safeWave - 20) * 1.5));
}

function getZombieStatScales(wave) {
  const extraWaves = Math.max(0, wave - 1);
  const steadyWaves = Math.min(extraWaves, 14); // Waves 1 to 15 (gentle scaling)
  const lateWaves = Math.max(0, extraWaves - 14); // Wave 16+ (late-game challenge)

  // Post-boss permanent scaling: +8% health, +6% damage, +2% speed per boss defeated
  const bossHealthBonus = 1 + bossesDefeated * 0.08;
  const bossDamageBonus = 1 + bossesDefeated * 0.06;
  const bossSpeedBonus = 1 + bossesDefeated * 0.02;

  return {
    health: (1 + steadyWaves * 0.03 + lateWaves * 0.05 + Math.pow(lateWaves, 1.25) * 0.015) * bossHealthBonus,
    speed: (1 + steadyWaves * 0.008 + Math.min(0.70, lateWaves * 0.012)) * bossSpeedBonus,
    damage: (1 + steadyWaves * 0.012 + lateWaves * 0.025 + Math.pow(lateWaves, 1.1) * 0.003) * bossDamageBonus,
    score: 1 + extraWaves * 0.055
  };
}

function isBossWave(wave) {
  return wave >= 20 && wave % 20 === 0;
}

// Procedural ground features array
let groundDetails = [];

// Offscreen canvas for the static arena floor (pre-rendered once per game start)
let floorCanvas = null;
let floorCtx   = null;

// Cached vignette gradient – rebuilt only when canvas resizes
let cachedVignette  = null;
let vignetteW = 0;
let vignetteH = 0;

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
  if (leaderboardScreen) leaderboardScreen.classList.remove('active');

  // Show the target screen
  screen.classList.add('active');
}

/**
 * Toggles the developer cheat panel visibility and handles pausing the game loop.
 */
function toggleCheatPanel() {
  if (!cheatPanel) return;

  if (cheatPanel.classList.contains('active')) {
    cheatPanel.classList.remove('active');
    // Resume core loop if gameplay is active and not showing wave intermission
    if (gameState.isRunning && !isWaveIntermission) {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      gameLoop();
    }
  } else {
    cheatPanel.classList.add('active');
    // Pause the game loops during developer configuration
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  }
}

/**
 * Asks for the developer password before opening the cheat panel.
 * Closing an already-open panel never requires the password.
 */
function requestCheatPanelAccess() {
  if (!cheatPanel) return;

  if (cheatPanel.classList.contains('active')) {
    toggleCheatPanel();
    return;
  }

  const enteredPassword = window.prompt('Developer access code:');

  if (enteredPassword === cheatPanelPassword) {
    toggleCheatPanel();
  } else if (enteredPassword !== null) {
    console.warn('Developer cheat panel access denied.');
  }
}

/**
 * Procedurally populates the Developer Cheat Panel with all registry upgrades.
 */
function populateCheatPanel() {
  const commonList = document.getElementById('cheat-common-list');
  const rareList = document.getElementById('cheat-rare-list');
  const epicList = document.getElementById('cheat-epic-list');
  const legendaryList = document.getElementById('cheat-legendary-list');

  if (!commonList || !rareList || !epicList || !legendaryList) return;

  commonList.innerHTML = '';
  rareList.innerHTML = '';
  epicList.innerHTML = '';
  legendaryList.innerHTML = '';

  UPGRADES_REGISTRY.forEach(upgrade => {
    const btn = document.createElement('button');
    btn.className = `cheat-upgrade-btn ${upgrade.rarity}-hover`;
    btn.innerHTML = `
      <div class="cheat-upgrade-header">
        <span class="cheat-upgrade-icon">${upgrade.icon}</span>
        <strong class="cheat-upgrade-name">${upgrade.name}</strong>
      </div>
      <div class="cheat-upgrade-desc">${upgrade.description}</div>
    `;

    btn.addEventListener('click', () => {
      // 1. Apply the upgrade immediately
      upgrade.apply();

      // 2. Save chosen upgrade in active list (demarcated as cheat for transparency)
      upgradesChosen.push(upgrade.name + ' [CHEAT]');
      console.log(`[CHEAT PANEL] Applied upgrade: ${upgrade.name}`);

      // 3. Screen shake visual feedback
      startScreenShake(5, 8);

      // 4. Update core HUD
      updateHUD();
    });

    if (upgrade.rarity === 'common') {
      commonList.appendChild(btn);
    } else if (upgrade.rarity === 'rare') {
      rareList.appendChild(btn);
    } else if (upgrade.rarity === 'epic') {
      epicList.appendChild(btn);
    } else if (upgrade.rarity === 'legendary') {
      legendaryList.appendChild(btn);
    }
  });
}

// Bind Cheat Panel Close Button
if (cheatCloseBtn) {
  cheatCloseBtn.addEventListener('click', toggleCheatPanel);
}

// Initialize Cheat Panel once on file load
populateCheatPanel();
bindCheatPanelQuickControls();

/**
 * Binds click listeners to the developer panel quick action controls.
 */
function bindCheatPanelQuickControls() {
  const prevWaveBtn = document.getElementById('cheat-prev-wave-btn');
  const nextWaveBtn = document.getElementById('cheat-next-wave-btn');
  const skip5Btn = document.getElementById('cheat-skip-5-btn');
  const healBtn = document.getElementById('cheat-heal-btn');
  const killAllBtn = document.getElementById('cheat-kill-all-btn');
  const summonBtns = document.querySelectorAll('.cheat-summon-btn');

  // helper function to skip wave and clean active threats
  function changeWave(offset) {
    if (!gameState.isRunning) return;
    
    // Adjust wave number
    gameState.wave = Math.max(1, gameState.wave + offset);
    
    // Recalculate wave metrics
    waveZombiesTotal = isBossWave(gameState.wave)
      ? Math.floor(getWaveZombieTotal(gameState.wave) * 0.4)
      : getWaveZombieTotal(gameState.wave);
    waveZombiesSpawned = 0;
    waveKillCount = 0;
    activeBoss = null;

    // Clear currently active entities on the board
    zombies = [];
    enemyProjectiles = [];
    bullets = [];
    toxicTrails = [];
    lightningArcs = [];
    explosions = [];
    activeMines = [];
    pendingSummons = [];

    // Trigger visual/haptic response
    startScreenShake(8, 12);
    updateHUD();
    console.log(`[CHEAT PANEL] Wave changed to ${gameState.wave}`);
  }

  if (prevWaveBtn) {
    prevWaveBtn.addEventListener('click', () => changeWave(-1));
  }
  if (nextWaveBtn) {
    nextWaveBtn.addEventListener('click', () => changeWave(1));
  }
  if (skip5Btn) {
    skip5Btn.addEventListener('click', () => changeWave(5));
  }

  if (healBtn) {
    healBtn.addEventListener('click', () => {
      if (!gameState.isRunning) return;
      player.health = player.maxHealth;
      
      // Spawn healing sparks
      for (let s = 0; s < 15; s++) {
        const a = Math.random() * Math.PI * 2;
        const f = Math.random() * 3 + 1;
        gameParticles.push({
          x: player.x,
          y: player.y,
          vx: Math.cos(a) * f,
          vy: Math.sin(a) * f,
          size: Math.floor(Math.random() * 4) + 2,
          color: '#39ff14', // heal emerald green
          life: 0.8,
          decay: 0.05
        });
      }
      
      startScreenShake(3, 6);
      updateHUD();
      console.log(`[CHEAT PANEL] Player fully healed.`);
    });
  }

  if (killAllBtn) {
    killAllBtn.addEventListener('click', () => {
      if (!gameState.isRunning) return;
      
      zombies.forEach(z => {
        // Spawn chiptune-like blood splash particles
        for (let s = 0; s < 6; s++) {
          gameParticles.push({
            x: z.x,
            y: z.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            size: Math.floor(Math.random() * 3) + 2,
            color: '#a10b0b', // dark zombie blood
            life: 0.7,
            decay: Math.random() * 0.1 + 0.05
          });
        }
      });
      
      zombies = [];
      enemyProjectiles = [];
      pendingSummons = [];
      activeBoss = null;
      
      startScreenShake(12, 16);
      updateHUD();
      console.log(`[CHEAT PANEL] All enemies cleared.`);
    });
  }

  summonBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!gameState.isRunning) return;
      const type = e.currentTarget.getAttribute('data-type');
      spawnSpecificZombie(type);
      startScreenShake(4, 6);
      console.log(`[CHEAT PANEL] Summoned specific zombie: ${type}`);
    });
  });

  // Boss summon button
  const bossBtn = document.getElementById('cheat-summon-boss-btn');
  if (bossBtn) {
    bossBtn.addEventListener('click', () => {
      if (!gameState.isRunning) return;
      if (activeBoss) {
        console.log('[CHEAT PANEL] Boss already active!');
        return;
      }
      spawnPatientZero();
      console.log('[CHEAT PANEL] Summoned Patient Zero boss!');
    });
  }
}

function spawnSpecificZombie(type) {
  let zx, zy;
  const side = Math.floor(Math.random() * 4);
  const spawnBuffer = 90;

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

  zx = Math.max(16, Math.min(world.width - 16, zx));
  zy = Math.max(16, Math.min(world.height - 16, zy));

  const typesConfig = {
    normal: { size: 42, health: 30, speed: 0.75, damage: 10, score: 10, attackCooldown: 1000 },
    fast: { size: 34, health: 20, speed: 1.2, damage: 8, score: 15, attackCooldown: 1000 },
    tank: { size: 54, health: 60, speed: 0.5, damage: 20, score: 30, attackCooldown: 1200 },
    spitter: { size: 38, health: 25, speed: 0.7, damage: 10, score: 25, attackCooldown: 2000 },
    necromancer: { size: 46, health: 40, speed: 0.6, damage: 12, score: 50, attackCooldown: 1000 },
    exploder: { size: 42, health: 15, speed: 1.45, damage: 45, score: 25, attackCooldown: 1000 },
    rusher: { size: 46, health: 45, speed: 1.55, damage: 18, score: 40, attackCooldown: 1000 }
  };

  const config = typesConfig[type] || typesConfig.normal;
  addScaledZombie({
    type: type,
    x: zx,
    y: zy,
    size: config.size,
    health: config.health,
    maxHealth: config.health,
    speed: config.speed,
    damage: config.damage,
    scoreValue: config.score,
    lastAttackTime: 0,
    attackCooldown: config.attackCooldown,
    hasHitPlayer: false
  });

  // Spawn summon sparks
  for (let p = 0; p < 10; p++) {
    const pAngle = Math.random() * Math.PI * 2;
    const pSpeed = Math.random() * 2 + 1;
    gameParticles.push({
      x: zx,
      y: zy,
      vx: Math.cos(pAngle) * pSpeed,
      vy: Math.sin(pAngle) * pSpeed,
      size: Math.floor(Math.random() * 3) + 2,
      color: '#ff7700', // orange sparks
      life: 0.7,
      decay: 0.05
    });
  }
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

    // Rank display for top 3 (numbers only, emoji-free)
    const rankDisplay = rank;

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
  player.speed = 1.7; // Decreased base player speed
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

  // Reset 11 New Upgrades properties
  player.critChance = 0.0;
  player.finisherDamage = 0.0;
  player.secondWindLevel = 0;
  player.secondWindTriggered = false;
  player.bioShieldLevel = 0;
  player.bioShieldActive = false;
  player.bioShieldTimer = 0;
  player.cryoCapsuleLevel = 0;
  player.reflexDashLevel = 0;
  player.reflexDashCooldown = 0;
  player.reflexDashDuration = 0;
  player.reflexDashVx = 0;
  player.reflexDashVy = 0;
  player.labMineLevel = 0;
  player.labMineTimer = 0;
  player.stimulantLevel = 0;
  player.overclockLevel = 0;
  player.overclockShotCounter = 0;
  player.killFrenzyLevel = 0;
  player.killFrenzyHistory = [];
  player.killFrenzyTimer = 0;
  player.slowStartLevel = 0;

  // Clear chosen upgrades
  upgradesChosen = [];
  gameTick = 0;
  waveKillCount = 0;
  waveStartTick = 0;

  // Clear combat arrays
  bullets = [];
  zombies = [];
  enemyProjectiles = [];
  toxicTrails = [];
  lightningArcs = [];
  gameParticles = [];
  floorStains = [];
  explosions = [];
  activeMines = [];
  pendingSummons = [];
  screenShake.amount = 0;
  screenShake.frames = 0;
  lastZombieSpawnTime = 0;
  bossesDefeated = 0;
  activeBoss = null;

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
  buildStaticFloor();   // Pre-render static floor to offscreen canvas
  cachedVignette = null; // Invalidate vignette cache on new game

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
  document.getElementById('pause-btn').style.display = 'flex';
  audio.resume();
  audio.startMusic();
  gameLoop();
}


let lastLoopTime = 0;
let loopAccumulator = 0;
const timestep = 1000 / 120; // Exactly 8.33ms per game tick (120Hz)

function gameLoop(timestamp) {
  if (!gameState.isRunning || isWaveIntermission || isPaused) {
    lastLoopTime = 0; // Reset tracking on pause/intermission
    return;
  }

  if (!timestamp) {
    timestamp = performance.now();
  }

  if (!lastLoopTime) {
    lastLoopTime = timestamp;
  }

  let elapsed = timestamp - lastLoopTime;
  
  // Guard against "spiral of death" (cap catch-up time to 250ms)
  if (elapsed > 250) {
    elapsed = 250;
  }

  lastLoopTime = timestamp;
  loopAccumulator += elapsed;

  // Run updates at a fixed 60Hz rate
  while (loopAccumulator >= timestep) {
    update();
    loopAccumulator -= timestep;
  }

  render();

  animationFrameId = requestAnimationFrame(gameLoop);
}


// Game Physics & State Updates

function update() {
  gameTick += 1;

  // Update Orbiting Defender rotating blades angle (slower, heavy orbit)
  if (player.orbitingDefenderLevel > 0) {
    player.defenderAngle += 0.018;
  }

  // Update Bio-Shield regeneration timer
  if (player.bioShieldLevel > 0 && !player.bioShieldActive) {
    player.bioShieldTimer -= 1;
    if (player.bioShieldTimer <= 0) {
      player.bioShieldActive = true;
      player.bioShieldTimer = 0;
      // Soft cyan activation sparks
      for (let s = 0; s < 12; s++) {
        const a = Math.random() * Math.PI * 2;
        const f = Math.random() * 2 + 1;
        gameParticles.push({
          x: player.x,
          y: player.y,
          vx: Math.cos(a) * f,
          vy: Math.sin(a) * f,
          size: Math.floor(Math.random() * 3) + 2,
          color: '#00ffff',
          life: 0.6,
          decay: 0.05
        });
      }
    }
  }

  // Update Lab Mines dropping & lifetimes
  if (player.labMineLevel > 0) {
    player.labMineTimer = (player.labMineTimer || 0) - 1;
    if (player.labMineTimer <= 0) {
      activeMines.push({
        x: player.x,
        y: player.y,
        size: 20,
        damage: 50 + player.labMineLevel * 25
      });
      // Reset cooldown timer: reduces from 8s to 3s
      const cdSec = Math.max(3.0, 8.0 - (player.labMineLevel - 1) * 1.5);
      player.labMineTimer = cdSec * 60;
    }
  }

  // Check Mines triggers against zombies
  for (let mIdx = activeMines.length - 1; mIdx >= 0; mIdx--) {
    const mine = activeMines[mIdx];
    for (let zIdx = 0; zIdx < zombies.length; zIdx++) {
      const z = zombies[zIdx];
      const mDx = z.x - mine.x;
      const mDy = z.y - mine.y;
      const distSq = mDx * mDx + mDy * mDy;
      const rangeSum = z.size / 2 + mine.size / 2;

      if (distSq < rangeSum * rangeSum) {
        // Boom! Explode the mine!
        triggerExplosion(mine.x, mine.y, mine.damage);
        activeMines.splice(mIdx, 1);
        break; // break out of zombies loop for this mine
      }
    }
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

  // Update Explosions lifespans
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].life -= explosions[i].decay;
    if (explosions[i].life <= 0) {
      explosions.splice(i, 1);
    }
  }

  // 0. Handle player stun status (inflicted by Rusher zombie)
  player.stunTicks = player.stunTicks || 0;
  if (player.stunTicks > 0) {
    player.stunTicks -= 1;
    // Spawn dizzy/stun star particles above player's head!
    if (gameTick % 8 === 0) {
      const pAngle = (gameTick * 0.25) % (Math.PI * 2);
      gameParticles.push({
        x: player.x + Math.cos(pAngle) * 16,
        y: player.y - 12 + Math.sin(pAngle) * 6,
        vx: 0,
        vy: -0.2,
        size: 3,
        color: '#ffd700', // Gold dizzy stars
        life: 0.6,
        decay: 0.04
      });
    }
    // Cancel dash
    player.reflexDashDuration = 0;
    // Overwrite input to prevent movement
    keys.w = false;
    keys.s = false;
    keys.a = false;
    keys.d = false;
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

  // Combat Stimulant speed boost
  if (player.stimulantLevel > 0) {
    currentSpeed += player.stimulantLevel * 0.15;
  }

  // Kill Frenzy speed boost (+30% movement speed)
  if (player.killFrenzyTimer > 0) {
    player.killFrenzyTimer -= 1;
    currentSpeed += player.speed * 0.30;
  }

  // Reflex Dash Cooldown decrement
  if (player.reflexDashCooldown > 0) {
    player.reflexDashCooldown -= 1;
  }

  // Runner's High boost
  if (player.runnersHighLevel > 0 && player.movementStart !== null) {
    if (Date.now() - player.movementStart >= 3000) {
      currentSpeed += Math.min(1.0, player.runnersHighLevel * 0.15);
      isRunnersHighActive = true;
    }
  }

  // Retaliate boost
  if (player.retaliateLevel > 0 && Date.now() < player.retaliateExpiry) {
    currentSpeed += Math.min(1.5, player.retaliateLevel * 0.30);
    isRetaliateActive = true;
  }

  // Apply movement speed or active Dash surge
  if (player.reflexDashDuration > 0) {
    player.reflexDashDuration -= 1;
    player.x += player.reflexDashVx;
    player.y += player.reflexDashVy;

    // Spawn cyber-blue shadow particle trails trailing the player surge
    gameParticles.push({
      x: player.x,
      y: player.y,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: player.size - 2,
      color: '#00ddff', // bright cyber-blue shadow
      life: 0.3,
      decay: 0.03
    });
  } else {
    // Normalize diagonal movement vector so diagonal travel isn't faster
    if (dx !== 0 && dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }

    // Apply standard WASD movement speed
    player.x += dx * currentSpeed;
    player.y += dy * currentSpeed;
  }

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
    if (b.trail.length > 6) {
      b.trail.shift(); // Keep trail length capped for longer lasers
    }

    // Spawn floating sparks in bullet wake (ash/embers/smoke/ice motes)
    if (b.isCryo) {
      if (Math.random() < 0.72) {
        gameParticles.push({
          x: b.x + (Math.random() - 0.5) * 7,
          y: b.y + (Math.random() - 0.5) * 7,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          size: Math.floor(Math.random() * 3) + 2,
          color: Math.random() > 0.45 ? '#8ffcff' : '#00ddff',
          life: 0.75,
          decay: Math.random() * 0.08 + 0.05
        });
      }
    } else if (b.isFire) {
      if (Math.random() < 0.80) {
        const isSmoke = Math.random() > 0.7;
        gameParticles.push({
          x: b.x + (Math.random() - 0.5) * 6,
          y: b.y + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          size: Math.floor(Math.random() * 4) + 3,
          color: isSmoke ? 'rgba(90, 90, 90, 0.35)' : '#ff4500', // Grey smoke or bright orange-red fire
          life: 0.7,
          decay: Math.random() * 0.12 + 0.07
        });
      }
    } else {
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
          spawnSplinterShrapnel(b.x, b.y, b.vx, b.vy, b.damage, null, b.isFire, b.isCryo);
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
          spawnSplinterShrapnel(b.x, b.y, b.vx, b.vy, b.damage, null, b.isFire, b.isCryo);
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

  // Boss wave: spawn Patient Zero at the start of the wave
  if (isBossWave(gameState.wave) && !activeBoss && waveZombiesSpawned === 0) {
    spawnPatientZero();
  }

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

  // Finish any Necromancer casts whose warning circles have completed.
  updatePendingSummons(now);

  // 5. Update zombie movement and player collision check
  for (let i = zombies.length - 1; i >= 0; i--) {
    let z = zombies[i];

    // Zombie tracks player position (calculating chase vector)
    const zDx = player.x - z.x;
    const zDy = player.y - z.y;
    const distance = Math.sqrt(zDx * zDx + zDy * zDy);

    // Toxic Trail slow calculations (Staggered to run once every 6 frames per zombie to save CPU)
    if (z.isOnToxicTrail === undefined || (gameTick + i) % 6 === 0) {
      z.isOnToxicTrail = false;
      for (let t = 0; t < toxicTrails.length; t++) {
        const trail = toxicTrails[t];
        const tDx = z.x - trail.x;
        const tDy = z.y - trail.y;
        const distSq = tDx * tDx + tDy * tDy;
        const rangeSum = z.size / 2 + trail.size;

        if (distSq < rangeSum * rangeSum) {
          z.isOnToxicTrail = true;
          break;
        }
      }
    }

    // Toxic Trail Tick DoT Damage (Balanced to 3 HP/sec, running in discrete 500ms intervals to eliminate lag & particle spam)
    if (z.isOnToxicTrail) {
      z.lastToxicDamageTime = z.lastToxicDamageTime || 0;
      if (now - z.lastToxicDamageTime >= 500) {
        z.health -= 1.5 * player.toxicTrailLevel; // 3 HP/sec per stack = 1.5 HP per 500ms
        z.flashTicks = 8; // Satisfying green hit flash
        z.lastToxicDamageTime = now;

        // Spawn occasional green bubbles on damage tick
        if (Math.random() < 0.35) {
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
    const isStunned = z.stunTicks > 0 && z.type !== 'rusher';
    if (z.stunTicks > 0) {
      z.stunTicks -= 1;
    }

    if (isStunned) {
      // Stun locked, do not move
    } else {
      if (distance > 0) {
        // Toxic Trail slow effect (20% slow per level, capped at 70% slow)
        let slowFactor = (z.isOnToxicTrail && z.type !== 'rusher') ? (1 - Math.min(0.70, 0.20 * player.toxicTrailLevel)) : 1.0;

        // Cryo Capsule slow effect (50% slow)
        z.cryoSlowTicks = z.cryoSlowTicks || 0;
        if (z.cryoSlowTicks > 0) {
          z.cryoSlowTicks -= 1;
          if (z.type !== 'rusher') {
            slowFactor *= 0.50;
          }
        }

        const desiredSpeed = z.speed * slowFactor;

        let vx = 0;
        let vy = 0;

        z.wallFollowTicks = z.wallFollowTicks || 0;
        if (z.wallFollowTicks > 0) {
          z.wallFollowTicks -= 1;
          vx = z.wallFollowVx || 0;
          vy = z.wallFollowVy || 0;
          const currentLen = Math.hypot(vx, vy);
          if (currentLen > 0) {
            vx = (vx / currentLen) * desiredSpeed;
            vy = (vy / currentLen) * desiredSpeed;
          }
        } else if (z.type === 'spitter' || z.type === 'necromancer') {
          const sweetSpotMax = z.type === 'necromancer' ? 450 : 340;
          const sweetSpotMin = z.type === 'necromancer' ? 280 : 220;
          if (distance > sweetSpotMax) {
            // Too far: Move towards the player to get into range
            vx = (zDx / distance) * desiredSpeed;
            vy = (zDy / distance) * desiredSpeed;
          } else if (distance < sweetSpotMin) {
            // Too close: Kite and back away from the player
            vx = -(zDx / distance) * desiredSpeed;
            vy = -(zDy / distance) * desiredSpeed;
          } else {
            // Sweet spot: Stand still
            vx = 0;
            vy = 0;
          }
        } else {
          // Regular zombies always chase directly
          vx = (zDx / distance) * desiredSpeed;
          vy = (zDy / distance) * desiredSpeed;
        }

        // Advanced AABB Look-Ahead Sliding Vector Obstacle Avoidance (Staggered to once every 4 ticks per zombie to optimize CPU load)
        if (vx !== 0 || vy !== 0) {
          z.lastAvoidanceTick = z.lastAvoidanceTick || 0;
          if (z.avoidanceVx !== undefined && (gameTick - z.lastAvoidanceTick < 4)) {
            vx = z.avoidanceVx;
            vy = z.avoidanceVy;
          } else {
            z.lastAvoidanceTick = gameTick;

            const currentSpeed = Math.hypot(vx, vy);
            const dirX = vx / currentSpeed;
            const dirY = vy / currentSpeed;

            const lookAhead = 40; // Pixels to look ahead
            let avoidanceX = 0;
            let avoidanceY = 0;
            let isBlocked = false;

            for (let o = 0; o < obstacles.length; o++) {
              const obs = obstacles[o];

              // 1. Closest point on AABB obstacle to current zombie position
              const closestX = Math.max(obs.x, Math.min(z.x, obs.x + obs.width));
              const closestY = Math.max(obs.y, Math.min(z.y, obs.y + obs.height));
              const distCurrent = Math.hypot(z.x - closestX, z.y - closestY);

              // 2. Closest point on AABB obstacle to anticipated look-ahead position
              const aheadX = z.x + dirX * lookAhead;
              const aheadY = z.y + dirY * lookAhead;
              const closestAheadX = Math.max(obs.x, Math.min(aheadX, obs.x + obs.width));
              const closestAheadY = Math.max(obs.y, Math.min(aheadY, obs.y + obs.height));
              const distAhead = Math.hypot(aheadX - closestAheadX, aheadY - closestAheadY);

              // 3. Collision footprint threshold
              const safetyRadius = z.size / 2 + 12;

              if (distCurrent < safetyRadius || distAhead < safetyRadius) {
                isBlocked = true;

                // Vector pointing outward from closest point on obstacle face
                let dx = z.x - closestX;
                let dy = z.y - closestY;

                if (dx === 0 && dy === 0) {
                  // If center is somehow fully inside, resolve using obstacle center
                  const obsCenterX = obs.x + obs.width / 2;
                  const obsCenterY = obs.y + obs.height / 2;
                  dx = z.x - obsCenterX;
                  dy = z.y - obsCenterY;
                  if (dx === 0 && dy === 0) {
                    dx = 1;
                    dy = 0;
                  }
                }

                const dist = Math.hypot(dx, dy);
                const nx = dist > 0 ? dx / dist : 1;
                const ny = dist > 0 ? dy / dist : 0;

                // sliding vector projection: cancel component going straight into the wall
                const dotNormal = vx * nx + vy * ny;
                if (dotNormal < 0) {
                  vx -= dotNormal * nx;
                  vy -= dotNormal * ny;
                }

                // Target-Aligned Tangential Steering: select tangent pointing closest to destination
                const tx1 = -ny;
                const ty1 = nx;
                const tx2 = ny;
                const ty2 = -nx;

                // The original chase direction we wanted to head towards
                const origVx = (z.type === 'spitter' && distance < 220) ? -zDx : zDx;
                const origVy = (z.type === 'spitter' && distance < 220) ? -zDy : zDy;

                const dot1 = origVx * tx1 + origVy * ty1;
                const dot2 = origVx * tx2 + origVy * ty2;

                const tx = dot1 >= dot2 ? tx1 : tx2;
                const ty = dot1 >= dot2 ? ty1 : ty2;

                // Accumulate active steering force
                avoidanceX += tx * desiredSpeed;
                avoidanceY += ty * desiredSpeed;
              }
            }

            // If blocked, blend sliding velocity (30%) with active steering deflection (70%)
            if (isBlocked) {
              vx = vx * 0.3 + avoidanceX * 0.7;
              vy = vy * 0.3 + avoidanceY * 0.7;
              const newLen = Math.hypot(vx, vy);
              if (newLen > 0) {
                vx = (vx / newLen) * desiredSpeed;
                vy = (vy / newLen) * desiredSpeed;
              }

              // Set wall circumvention memory to bypass local minimum stuckness
              z.wallFollowVx = vx;
              z.wallFollowVy = vy;
              z.wallFollowTicks = 55; // 55 frames of continuous kiting
            }

            // Cache kiting vectors to reuse on standard ticks
            z.avoidanceVx = vx;
            z.avoidanceVy = vy;
          }
        }

        z.x += vx;
        z.y += vy;

        // Rusher engine thruster orange spark trails
        if (z.type === 'rusher' && gameTick % 3 === 0) {
          const moveAngle = Math.atan2(vy, vx);
          gameParticles.push({
            x: z.x - Math.cos(moveAngle) * (z.size / 2),
            y: z.y - Math.sin(moveAngle) * (z.size / 2),
            vx: -Math.cos(moveAngle) * 1.5 + (Math.random() - 0.5) * 0.4,
            vy: -Math.sin(moveAngle) * 1.5 + (Math.random() - 0.5) * 0.4,
            size: Math.floor(Math.random() * 3) + 2,
            color: '#ff5500', // reactor fiery orange trail
            life: 0.5,
            decay: 0.05
          });
        }
      }
    }

    // Orbiting Defender contact damage shredding (Legendary)
    if (player.orbitingDefenderLevel > 0) {
      const radius = 190; // Slower, massive outer orbit perimeter (increased from 140)
      const contactRadius = z.size / 2 + 48; // Made them physically giant sawblades (half of size 96)
      const contactRadiusSq = contactRadius * contactRadius;
      for (let d = 0; d < player.orbitingDefenderLevel; d++) {
        const angleOffset = d * (Math.PI * 2 / player.orbitingDefenderLevel);
        const bladeX = player.x + Math.cos(player.defenderAngle + angleOffset) * radius;
        const bladeY = player.y + Math.sin(player.defenderAngle + angleOffset) * radius;

        const bDx = z.x - bladeX;
        const bDy = z.y - bladeY;
        const distSq = bDx * bDx + bDy * bDy;

        if (distSq < contactRadiusSq) {
          z.health -= 0.8; // Dealing high shred contact damage per blade contact
          z.flashTicks = Math.max(z.flashTicks || 0, 2); // White hit flash when sliced

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
      z.health -= 3 / 60; // Fire bullets burn for a steady 3 HP/sec instead of scaling twice.

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
          vx: Math.cos(spitAngle) * 3.5, // Faster spitter projectile
          vy: Math.sin(spitAngle) * 3.5,
          size: 16, // Larger spitter projectile
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

    // Necromancer Zombie ranged attack casting logic
    if (z.type === 'necromancer') {
      z.lastRangedAttackTime = z.lastRangedAttackTime || 0;
      if (distance < 500 && now - z.lastRangedAttackTime >= 2500) {
        z.lastRangedAttackTime = now;
        const castAngle = Math.atan2(zDy, zDx);
        enemyProjectiles.push({
          x: z.x,
          y: z.y,
          vx: Math.cos(castAngle) * 3.2, // Ranged shadow bolt speed
          vy: Math.sin(castAngle) * 3.2,
          size: 13,
          damage: z.damage + 3, // slightly higher shadow damage
          color: '#ff00ff'
        });

        // Cast magic sparks
        for (let s = 0; s < 4; s++) {
          gameParticles.push({
            x: z.x,
            y: z.y,
            vx: (Math.random() - 0.5) * 2.5 + Math.cos(castAngle) * 1.5,
            vy: (Math.random() - 0.5) * 2.5 + Math.sin(castAngle) * 1.5,
            size: Math.floor(Math.random() * 3) + 3,
            color: '#ff00ff',
            life: 0.8,
            decay: Math.random() * 0.1 + 0.08
          });
        }
      }
    }

    // Necromancer Zombie summoning logic
    if (z.type === 'necromancer') {
      if (!z.lastSummonTime) {
        z.lastSummonTime = now;
      }
      z.summonCooldown = z.summonCooldown || necromancerSummonCooldown;

      if (!z.isSummoning && now - z.lastSummonTime >= z.summonCooldown && gameState.isRunning) {
        if (zombies.length < totalActiveZombiesCap) {
          queueNecromancerSummon(z, now);
          z.lastSummonTime = now;
        } else {
          // Postpone summoning by 2 seconds to check again soon
          z.lastSummonTime = now - z.summonCooldown + 2000;
        }
      }
    }

    // Patient Zero Boss summoning logic
    if (z.type === 'patient_zero') {
      if (!z.lastSummonTime) {
        z.lastSummonTime = now;
      }
      if (!z.isSummoning && now - z.lastSummonTime >= bossSummonCooldown && gameState.isRunning) {
        if (zombies.length < totalActiveZombiesCap) {
          queueBossSummon(z, now);
          z.lastSummonTime = now;
        } else {
          // Postpone summoning by 2 seconds to check again soon
          z.lastSummonTime = now - bossSummonCooldown + 2000;
        }
      }

      // Patient Zero Boss custom shooting logic (every 10 seconds, fires a consecutive burst of 3 bullets from each claw)
      if (!z.lastRangedAttackTime) {
        z.lastRangedAttackTime = now;
        z.rangedAttackBurstLeft = 0;
        z.nextRangedShotTime = 0;
      }
      if (now - z.lastRangedAttackTime >= 10000 && gameState.isRunning && !z.isSummoning && (z.rangedAttackBurstLeft || 0) <= 0) {
        z.lastRangedAttackTime = now;
        z.rangedAttackBurstLeft = 3; // 3 rapid shots in the burst
        z.nextRangedShotTime = now;   // Fire first shot immediately
      }
      if ((z.rangedAttackBurstLeft || 0) > 0 && now >= (z.nextRangedShotTime || 0) && gameState.isRunning && !z.isSummoning) {
        z.rangedAttackBurstLeft -= 1;
        z.nextRangedShotTime = now + 160; // 160ms delay between consecutive shots in the burst (~10 frames)
        fireSingleBossClawShot(z, zDx, zDy);
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

          // Stun the player on Rusher first hit!
          if (z.type === 'rusher' && !z.hasHitPlayer) {
            z.hasHitPlayer = true;
            player.stunTicks = 90; // Stun the player for 1.5 seconds (90 frames)
            startScreenShake(12, 18);
            // Spawn gold dizzy stars instantly
            for (let sIdx = 0; sIdx < 8; sIdx++) {
              const sAngle = (sIdx / 8) * Math.PI * 2;
              gameParticles.push({
                x: player.x,
                y: player.y - 12,
                vx: Math.cos(sAngle) * 0.8,
                vy: Math.sin(sAngle) * 0.8 - 0.4,
                size: 4,
                color: '#ffd700', // Gold dizzy stars
                life: 0.8,
                decay: 0.03
              });
            }
            console.log("[RUSHER] Stunned the player with first charge!");
          }

          // Screen shake on boss contact damage
          if (z.type === 'patient_zero') {
            startScreenShake(6, 10);
          }

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
      const distSq = sepDx * sepDx + sepDy * sepDy;
      const minSep = (z1.size + z2.size) / 2 - 4; // Keep larger bodies from stacking

      if (distSq < minSep * minSep && distSq > 0) {
        const sepDist = Math.sqrt(distSq); // Only compute Math.sqrt when overlapping
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

  // After all crowd separation pushes are calculated, resolve boundary clamp and obstacle collisions once per zombie (O(N) single-pass)
  for (let j = 0; j < zombies.length; j++) {
    let z = zombies[j];
    const zHalf = z.size / 2;
    if (z.x < zHalf) z.x = zHalf;
    if (z.x > world.width - zHalf) z.x = world.width - zHalf;
    if (z.y < zHalf) z.y = zHalf;
    if (z.y > world.height - zHalf) z.y = world.height - zHalf;
    resolveEntityObstacleCollision(z);
  }

  // 5.6. Sweep dead zombies and trigger explosions / scores / kills
  for (let zIdx = zombies.length - 1; zIdx >= 0; zIdx--) {
    let z = zombies[zIdx];
    if (z.health <= 0) {
      if (!z.selfDetonated) {
        audio.playSfx('kill');
        gameState.score += z.scoreValue;
        gameState.kills += 1;
        waveKillCount += 1;

        // Kill Frenzy trigger logic
        if (player.killFrenzyLevel > 0) {
          const nowMs = Date.now();
          player.killFrenzyHistory.push(nowMs);
          player.killFrenzyHistory = player.killFrenzyHistory.filter(t => nowMs - t <= 3000);
          if (player.killFrenzyHistory.length >= 5) {
            player.killFrenzyTimer = Math.min(480, (player.killFrenzyTimer || 0) + 180); // add 3s (180 ticks), cap at 8s (480 ticks)
            // Spawn green/pink frenzy particles around the player
            for (let fP = 0; fP < 5; fP++) {
              gameParticles.push({
                x: player.x + (Math.random() - 0.5) * player.size,
                y: player.y + (Math.random() - 0.5) * player.size,
                vx: (Math.random() - 0.5) * 1.0,
                vy: -Math.random() * 1.5 - 0.5,
                size: Math.floor(Math.random() * 3) + 2,
                color: '#ff0055', // FRENZY PINK
                life: 0.8,
                decay: 0.05
              });
            }
          }
        }

        // Lifesteal heal logic
        if (player.lifestealAmount > 0) {
          player.health = Math.round(Math.min(player.maxHealth, player.health + player.lifestealAmount) * 100) / 100;
        }

        // Necro-Bomb triggering (Legendary upgrade)
        if (player.necroBombLevel > 0 && !z.killedByNecroBomb) {
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

      // Patient Zero boss defeated: apply permanent scaling and bonus score
      if (z.type === 'patient_zero') {
        bossesDefeated += 1;
        activeBoss = null;
        startScreenShake(12, 20);

        // Big death explosion burst
        for (let bp = 0; bp < 25; bp++) {
          const bAngle = Math.random() * Math.PI * 2;
          const bForce = Math.random() * 4 + 1.5;
          gameParticles.push({
            x: z.x,
            y: z.y,
            vx: Math.cos(bAngle) * bForce,
            vy: Math.sin(bAngle) * bForce,
            size: Math.floor(Math.random() * 5) + 3,
            color: bp % 3 === 0 ? '#ff2222' : bp % 3 === 1 ? '#ff8800' : '#ffee00',
            life: 1.2,
            decay: 0.03
          });
        }

        console.log(`[BOSS] Patient Zero defeated! Bosses killed: ${bossesDefeated}. Future zombies buffed.`);
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

      // Calculate radial distance using squared calculations to avoid heavy Math.sqrt
      const hitDx = b.x - z.x;
      const hitDy = b.y - z.y;
      const distSq = hitDx * hitDx + hitDy * hitDy;
      const radiusSum = b.size / 2 + z.size / 2;

      // Hit detected!
      if (distSq < radiusSum * radiusSum) {
        audio.playSfx('hit');
        // Calculate base and upgrades damage
        let damageDealt = b.damage;

        // Weak Point Scan (Critical Hit chance)
        let isCrit = false;
        if (player.critChance > 0 && Math.random() < player.critChance) {
          isCrit = true;
          damageDealt = Math.round(damageDealt * 1.75);
        }

        // Finisher Rounds (+8% execute damage per stack to target below 35% HP)
        if (player.finisherDamage > 0 && z.health < z.maxHealth * 0.35) {
          damageDealt = Math.round(damageDealt * (1 + player.finisherDamage));
        }

        // Apply damage to zombie
        z.health -= damageDealt;
        z.flashTicks = 5; // Trigger white hit flash

        // Cryo rounds slow zombies only when this specific bullet rolled cryo.
        if (b.isCryo) {
          z.cryoSlowTicks = 90; // 1.5 seconds at 60 fps

          for (let cs = 0; cs < 6; cs++) {
            const cAngle = Math.random() * Math.PI * 2;
            const cForce = Math.random() * 2.5 + 1.2;
            gameParticles.push({
              x: b.x,
              y: b.y,
              vx: Math.cos(cAngle) * cForce,
              vy: Math.sin(cAngle) * cForce,
              size: Math.floor(Math.random() * 3) + 2,
              color: cs % 2 === 0 ? '#8ffcff' : '#ffffff',
              life: 0.65,
              decay: Math.random() * 0.08 + 0.05
            });
          }
        }

        // Spawn custom critical hit visual effects (golden sparks)
        if (isCrit) {
          for (let cs = 0; cs < 8; cs++) {
            const cAngle = Math.random() * Math.PI * 2;
            const cForce = Math.random() * 4 + 2;
            gameParticles.push({
              x: b.x,
              y: b.y,
              vx: Math.cos(cAngle) * cForce,
              vy: Math.sin(cAngle) * cForce,
              size: Math.floor(Math.random() * 3) + 3,
              color: '#ffee00', // glowing critical gold spark
              life: 0.8,
              decay: Math.random() * 0.08 + 0.04
            });
          }
        }

        // Apply physical knockback pushback force (Knockback Rounds)
        const travelAngle = Math.atan2(b.vy, b.vx);
        const pushForce = 8 * (1 + player.knockbackModifier); // base push 8px
        if (z.type !== 'rusher' && z.type !== 'patient_zero') {
          z.x += Math.cos(travelAngle) * pushForce;
          z.y += Math.sin(travelAngle) * pushForce;
        }

        // Trigger Splinter Shot bullet split
        if (player.splinterShotLevel > 0 && !b.isShrapnel) {
          spawnSplinterShrapnel(b.x, b.y, b.vx, b.vy, b.damage, z, b.isFire, b.isCryo);
        }

        // Fire rounds apply burn only when this specific bullet rolled fire.
        if (b.isFire) {
          z.burnTicks = Math.max(z.burnTicks || 0, 180); // 3 seconds at 60 fps
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

  // Cap active particles to keep frame time low on all devices
  if (gameParticles.length > 200) {
    gameParticles.splice(0, gameParticles.length - 200);
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
  // Boss wave requires boss to be dead too
  const bossAlive = isBossWave(gameState.wave) && activeBoss !== null;
  if (!isWaveIntermission && waveZombiesSpawned === waveZombiesTotal && zombies.length === 0 && !bossAlive) {
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
      // Play upgrade sound effect
      audio.playSfx('upgrade');
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
      waveKillCount = 0;
      waveStartTick = gameTick;
      activeBoss = null;
      waveZombiesTotal = isBossWave(gameState.wave)
        ? Math.floor(getWaveZombieTotal(gameState.wave) * 0.4)
        : getWaveZombieTotal(gameState.wave);

      // 4. Reset screen and combat arrays for next wave
      bullets = [];
      zombies = [];
      enemyProjectiles = [];
      toxicTrails = [];
      lightningArcs = [];
      gameParticles = [];
      pendingSummons = [];
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
      speed: 0.5, // Decreased base speed from 0.7
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
      speed: 1.2, // Decreased base speed from 1.6
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
      speed: 0.7, // Decreased base speed from 0.9
      damage: 10,
      scoreValue: 25,
      lastAttackTime: 0,
      attackCooldown: 2000 // spits every 2 seconds
    });
  } else if (zombieType === 'necromancer') {
    // Spawn Necromancer Zombie (Summoner threat)
    addScaledZombie({
      type: 'necromancer',
      x: zx,
      y: zy,
      size: 46, // Slender and tall
      health: 40,
      maxHealth: 40,
      speed: 0.6, // Moves slowly
      damage: 12,
      scoreValue: 50,
      lastAttackTime: 0,
      attackCooldown: 1000
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
      speed: 1.45, // UPGRADED speed so it's extremely fast and dangerous!
      damage: 45, // UPGRADED base damage so it deals high blast damage to player!
      scoreValue: 25, // slightly more score for difficulty
      lastAttackTime: 0,
      attackCooldown: 1000
    });
  } else if (zombieType === 'rusher') {
    // Spawn Rusher Zombie (Tanky fast direct charger)
    addScaledZombie({
      type: 'rusher',
      x: zx,
      y: zy,
      size: 46,
      health: 45,
      maxHealth: 45,
      speed: 1.55,
      damage: 18,
      scoreValue: 40,
      lastAttackTime: 0,
      attackCooldown: 1000,
      hasHitPlayer: false
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
      speed: 0.75, // Decreased base speed from 1.0
      damage: 10,
      scoreValue: 10,
      lastAttackTime: 0,
      attackCooldown: 1000
    });
  }
}

function spawnPatientZero() {
  // Pick spawn position off-screen from a random edge
  let bx, by;
  const side = Math.floor(Math.random() * 4);
  const buf = 120;
  if (side === 0) { bx = camera.x + Math.random() * canvas.width; by = camera.y - buf; }
  else if (side === 1) { bx = camera.x + canvas.width + buf; by = camera.y + Math.random() * canvas.height; }
  else if (side === 2) { bx = camera.x + Math.random() * canvas.width; by = camera.y + canvas.height + buf; }
  else { bx = camera.x - buf; by = camera.y + Math.random() * canvas.height; }
  bx = Math.max(30, Math.min(world.width - 30, bx));
  by = Math.max(30, Math.min(world.height - 30, by));

  // Scale boss HP with wave and previous boss defeats (+10% HP per defeated boss)
  const bossHealthScale = 1 + bossesDefeated * 0.10;
  const baseHP = Math.ceil((1000 + gameState.wave * 60) * bossHealthScale);

  const boss = {
    type: 'patient_zero',
    x: bx,
    y: by,
    size: 140,
    health: baseHP,
    maxHealth: baseHP,
    speed: 1.15, // Increased speed from 0.75 to 1.15 to make the boss highly active and threatening!
    damage: 25,
    scoreValue: 500,
    lastAttackTime: 0,
    attackCooldown: 800,
    lastSummonTime: Date.now(),
    lastRangedAttackTime: Date.now() - 5000, // 5 seconds breathing room before first claws projectile barrage!
    isSummoning: false,
    summonCastEndsAt: 0
  };

  zombies.push(boss);
  activeBoss = boss;
  audio.playSfx('bossSpawn');
  startScreenShake(10, 15);
  console.log(`[BOSS] Patient Zero spawned on wave ${gameState.wave}! HP: ${baseHP}`);
}

/**
 * Fires a single pair of massive radioactive projectiles (one from the left claw, one from the right claw)
 * directly towards the player's position, representing a rapid-fire consecutive burst.
 */
function fireSingleBossClawShot(boss, zDx, zDy) {
  const bossAngle = Math.atan2(zDy, zDx);
  const dirX = Math.cos(bossAngle);
  const dirY = Math.sin(bossAngle);
  const perpX = -Math.sin(bossAngle);
  const perpY = Math.cos(bossAngle);

  // Claw Positions (Aligning mathematically with the rendered leviathan arms)
  const rightClawX = boss.x + dirX * 36 + perpX * -36;
  const rightClawY = boss.y + dirY * 36 + perpY * -36;
  const leftClawX  = boss.x + dirX * 36 + perpX * 28;
  const leftClawY  = boss.y + dirY * 36 + perpY * 28;

  // Play a sharp, satisfying weapon discharge sound for each shot in the burst!
  audio.playSfx('shoot');

  // Spawn right claw projectile (fired straight toward the player)
  enemyProjectiles.push({
    x: rightClawX,
    y: rightClawY,
    vx: Math.cos(bossAngle) * 4.6, // Heavy, fast projectile speed
    vy: Math.sin(bossAngle) * 4.6,
    size: 24, // Massive biological radioactive orb!
    damage: 30, // Highly threatening!
    isBoss: true,
    color: '#ffff00'
  });

  // Spawn left claw projectile (fired straight toward the player)
  enemyProjectiles.push({
    x: leftClawX,
    y: leftClawY,
    vx: Math.cos(bossAngle) * 4.6,
    vy: Math.sin(bossAngle) * 4.6,
    size: 24,
    damage: 30,
    isBoss: true,
    color: '#ffff00'
  });

  // Spawn toxic chemical muzzle flash particles at each claw muzzle point!
  [ {x: rightClawX, y: rightClawY}, {x: leftClawX, y: leftClawY} ].forEach(muzzle => {
    for (let p = 0; p < 6; p++) {
      const pAngle = bossAngle + (Math.random() - 0.5) * 0.8;
      const speed = Math.random() * 2 + 1;
      gameParticles.push({
        x: muzzle.x,
        y: muzzle.y,
        vx: Math.cos(pAngle) * speed + (Math.random() - 0.5) * 0.3,
        vy: Math.sin(pAngle) * speed + (Math.random() - 0.5) * 0.3,
        size: Math.floor(Math.random() * 3) + 3,
        color: Math.random() > 0.4 ? '#39ff14' : '#ffff00', // glowing neon slime-green/yellow sparks
        life: 0.7,
      });
    }
  });
}


function queueBossSummon(boss, now) {
  const spots = [];
  // Summon 2 Necromancers
  for (let s = 0; s < 2; s++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 100 + Math.random() * 80;
    spots.push({
      x: Math.max(20, Math.min(world.width - 20, boss.x + Math.cos(angle) * radius)),
      y: Math.max(20, Math.min(world.height - 20, boss.y + Math.sin(angle) * radius)),
      type: 'necromancer'
    });
  }

  // Summon 1 Rusher as the third summon!
  const rAngle = Math.random() * Math.PI * 2;
  const rRadius = 90 + Math.random() * 60;
  spots.push({
    x: Math.max(20, Math.min(world.width - 20, boss.x + Math.cos(rAngle) * rRadius)),
    y: Math.max(20, Math.min(world.height - 20, boss.y + Math.sin(rAngle) * rRadius)),
    type: 'rusher'
  });

  boss.isSummoning = true;
  boss.summonCastEndsAt = now + bossSummonCastTime;

  pendingSummons.push({
    summoner: boss,
    startTime: now,
    spawnTime: now + bossSummonCastTime,
    spots,
    isBossSummon: true
  });

  // Red warning sparks
  for (let p = 0; p < 10; p++) {
    const pAngle = Math.random() * Math.PI * 2;
    const pSpeed = Math.random() * 2 + 0.8;
    gameParticles.push({
      x: boss.x,
      y: boss.y,
      vx: Math.cos(pAngle) * pSpeed,
      vy: Math.sin(pAngle) * pSpeed,
      size: Math.floor(Math.random() * 4) + 2,
      color: p % 2 === 0 ? '#ff2222' : '#ff8800',
      life: 0.9,
      decay: 0.04
    });
  }
}

function chooseZombieType(wave) {
  const roll = Math.random();

  // Wave 1: Only standard normal zombies
  if (wave === 1) {
    return 'normal';
  }

  // Wave 2-3: Debut FAST zombies
  if (wave === 2) {
    return roll < 0.25 ? 'fast' : 'normal';
  }
  if (wave === 3) {
    return roll < 0.35 ? 'fast' : 'normal';
  }

  // Wave 4-5: Debut TANK zombies
  if (wave === 4) {
    if (roll < 0.20) return 'tank';
    if (roll < 0.50) return 'fast';
    return 'normal';
  }
  if (wave === 5) {
    if (roll < 0.25) return 'tank';
    if (roll < 0.55) return 'fast';
    return 'normal';
  }

  // Wave 6-7: Debut SPITTER zombies
  if (wave < 8) {
    if (roll < 0.15) return 'spitter';
    if (roll < 0.35) return 'tank';
    if (roll < 0.65) return 'fast';
    return 'normal';
  }

  // Wave 8-9: Continue normal, fast, tank, spitter
  if (wave < 10) {
    if (roll < 0.18) return 'spitter';
    if (roll < 0.38) return 'tank';
    if (roll < 0.68) return 'fast';
    return 'normal';
  }

  // Wave 10+: Debut EXPLOSION (exploder) zombies. (Wave 10 to 14: no rushers or necromancers yet!)
  if (wave < 15) {
    if (roll < 0.12) return 'exploder';
    if (roll < 0.26) return 'spitter';
    if (roll < 0.44) return 'tank';
    if (roll < 0.70) return 'fast';
    return 'normal';
  }

  // Wave 15+: Debut NECROMANCER zombies! (Wave 15 to 19: no rushers yet!)
  if (wave < 20) {
    if (roll < 0.12) return 'exploder';
    if (roll < 0.22) return 'necromancer'; // debuts at wave 15!
    if (roll < 0.36) return 'spitter';
    if (roll < 0.52) return 'tank';
    if (roll < 0.74) return 'fast';
    return 'normal';
  }

  // Wave 20+: Debut RUSHER zombies as high elite monster! (Wave 20)
  if (wave < 21) {
    if (roll < 0.10) return 'exploder';
    if (roll < 0.17) return 'rusher';      // debuts at wave 20!
    if (roll < 0.26) return 'necromancer';
    if (roll < 0.38) return 'spitter';
    if (roll < 0.52) return 'tank';
    if (roll < 0.74) return 'fast';
    return 'normal';
  }

  // Wave 21-30
  if (wave < 31) {
    if (roll < 0.11) return 'exploder';
    if (roll < 0.20) return 'rusher';
    if (roll < 0.29) return 'necromancer';
    if (roll < 0.44) return 'spitter';
    if (roll < 0.60) return 'tank';
    if (roll < 0.80) return 'fast';
    return 'normal';
  }

  // Wave 31+
  if (roll < 0.14) return 'exploder';
  if (roll < 0.24) return 'rusher';
  if (roll < 0.34) return 'necromancer';
  if (roll < 0.50) return 'spitter';
  if (roll < 0.68) return 'tank';
  if (roll < 0.88) return 'fast';
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

function getSummonedZombieConfig(type) {
  const configMap = {
    normal: { size: 42, health: 30, speed: 0.75, damage: 10, score: 10, attackCooldown: 1000 },
    fast: { size: 34, health: 20, speed: 1.2, damage: 8, score: 15, attackCooldown: 1000 },
    tank: { size: 54, health: 60, speed: 0.5, damage: 20, score: 30, attackCooldown: 1200 },
    spitter: { size: 38, health: 25, speed: 0.7, damage: 10, score: 25, attackCooldown: 2000 },
    necromancer: { size: 46, health: 40, speed: 0.6, damage: 12, score: 50, attackCooldown: 1000 },
    rusher: { size: 46, health: 45, speed: 1.55, damage: 18, score: 40, attackCooldown: 1000 }
  };

  return configMap[type] || configMap.normal;
}

function queueNecromancerSummon(necromancer, now) {
  const possibleTypes = ['normal', 'fast', 'tank', 'spitter'];
  const spots = [];

  for (let sIdx = 0; sIdx < 3; sIdx++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 70 + Math.random() * 70;
    const chosenType = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];

    spots.push({
      x: Math.max(20, Math.min(world.width - 20, necromancer.x + Math.cos(angle) * radius)),
      y: Math.max(20, Math.min(world.height - 20, necromancer.y + Math.sin(angle) * radius)),
      type: chosenType
    });
  }

  necromancer.isSummoning = true;
  necromancer.summonCastEndsAt = now + necromancerSummonCastTime;

  pendingSummons.push({
    summoner: necromancer,
    startTime: now,
    spawnTime: now + necromancerSummonCastTime,
    spots
  });

  // Small casting sparks tell the player this enemy is doing something dangerous.
  for (let p = 0; p < 8; p++) {
    const pAngle = Math.random() * Math.PI * 2;
    const pSpeed = Math.random() * 1.6 + 0.5;
    gameParticles.push({
      x: necromancer.x,
      y: necromancer.y,
      vx: Math.cos(pAngle) * pSpeed,
      vy: Math.sin(pAngle) * pSpeed,
      size: Math.floor(Math.random() * 3) + 2,
      color: p % 2 === 0 ? '#39ff14' : '#ff00ff',
      life: 0.75,
      decay: 0.045
    });
  }
}

function updatePendingSummons(now) {
  for (let i = pendingSummons.length - 1; i >= 0; i--) {
    const summon = pendingSummons[i];
    const summonerAlive = zombies.includes(summon.summoner) && summon.summoner.health > 0;

    if (!summonerAlive) {
      if (summon.summoner) {
        summon.summoner.isSummoning = false;
        summon.summoner.summonCastEndsAt = 0;
      }
      pendingSummons.splice(i, 1);
      continue;
    }

    if (now < summon.spawnTime) {
      continue;
    }

    summon.spots.forEach(spot => {
      spawnSummonedZombie(spot.type, spot.x, spot.y);
    });

    summon.summoner.isSummoning = false;
    summon.summoner.summonCastEndsAt = 0;
    pendingSummons.splice(i, 1);
    startScreenShake(3, 7);
  }
}

function spawnSummonedZombie(type, x, y) {
  const config = getSummonedZombieConfig(type);

  addScaledZombie({
    type,
    x,
    y,
    size: config.size,
    health: config.health,
    maxHealth: config.health,
    speed: config.speed,
    damage: config.damage,
    scoreValue: config.score,
    lastAttackTime: 0,
    attackCooldown: config.attackCooldown,
    hasHitPlayer: false
  });

  // Toxic lab portal particles at each warned spawn point.
  for (let p = 0; p < 6; p++) {
    const pAngle = Math.random() * Math.PI * 2;
    const pSpeed = Math.random() * 2 + 1;
    gameParticles.push({
      x,
      y,
      vx: Math.cos(pAngle) * pSpeed,
      vy: Math.sin(pAngle) * pSpeed,
      size: Math.floor(Math.random() * 3) + 3,
      color: p % 2 === 0 ? '#39ff14' : '#cc00ff',
      life: 0.8,
      decay: Math.random() * 0.08 + 0.04
    });
  }
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
        spawnSplinterShrapnel(bullet.x, bullet.y, bullet.vx, bullet.vy, bullet.damage, null, bullet.isFire, bullet.isCryo);
      }

      bounceBulletFromObstacle(bullet, obstacle, prevX, prevY);
      bullet.hitZombies = [];
      spawnObstacleImpactSparks(bullet.x, bullet.y, '#ffaa00');
      return true;
    }

    if (player.splinterShotLevel > 0 && !bullet.isShrapnel) {
      spawnSplinterShrapnel(bullet.x, bullet.y, bullet.vx, bullet.vy, bullet.damage, null, bullet.isFire, bullet.isCryo);
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

  // Bio-Shield hit blocking (Epic upgrade)
  if (player.bioShieldLevel > 0 && player.bioShieldActive) {
    player.bioShieldActive = false;
    
    // Cooldown reduces by 1s per stack above level 1, capped at 6s minimum (from 12s)
    const cdSec = Math.max(6.0, 12.0 - (player.bioShieldLevel - 1) * 1.0);
    player.bioShieldTimer = cdSec * 60; // 60 ticks per second

    // Spawn cyan absorption energy sparks around player
    for (let s = 0; s < 15; s++) {
      const a = Math.random() * Math.PI * 2;
      const f = Math.random() * 3 + 1;
      gameParticles.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(a) * f,
        vy: Math.sin(a) * f,
        size: Math.floor(Math.random() * 4) + 2,
        color: '#00ffff', // bright cyan energy
        life: 0.8,
        decay: Math.random() * 0.08 + 0.05
      });
    }

    // Trigger subtle screen shake visual response
    startScreenShake(3, 5);
    return; // Block hit completely!
  }

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
  audio.playSfx('playerHit');
  // (Player blood spray and floor stains removed to clean up visual clutter)
  startScreenShake(7, 12);
  updateHUD();

  // 4. Trigger Retaliate speed boost
  if (player.retaliateLevel > 0) {
    const duration = Math.min(6000, 2000 * player.retaliateLevel); // 2s per stack, cap 6s
    player.retaliateExpiry = Date.now() + duration;
  }

  // 5. Check player death state & trigger Second Wind revive rescue if available
  if (player.health <= 0) {
    if (player.secondWindLevel > 0 && !player.secondWindTriggered) {
      player.secondWindTriggered = true;

      // Restores 40 HP, +15 HP per level above 1, capped at 100 HP max
      const reviveHP = Math.min(100, 40 + (player.secondWindLevel - 1) * 15);
      player.health = reviveHP;
      updateHUD();

      // Trigger high-intensity screen shake on revive
      startScreenShake(15, 24);

      // Spawn gold and green healing explosion rings
      for (let s = 0; s < 30; s++) {
        const a = Math.random() * Math.PI * 2;
        const f = Math.random() * 6 + 2;
        gameParticles.push({
          x: player.x,
          y: player.y,
          vx: Math.cos(a) * f,
          vy: Math.sin(a) * f,
          size: Math.floor(Math.random() * 5) + 3,
          color: Math.random() > 0.5 ? '#ffee00' : '#39ff14', // gold or lime green sparks
          life: 1.0,
          decay: Math.random() * 0.05 + 0.02
        });
      }
      return; // Player survived!
    }

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
function spawnSplinterShrapnel(x, y, vx, vy, parentDamage, hitZombie = null, isFire = false, isCryo = false) {
  const angle = Math.atan2(vy, vx);
  const speed = Math.sqrt(vx * vx + vy * vy) * 0.8; // slightly slower shrapnel
  const shrapnelDamage = Math.max(1, Math.round(parentDamage * 0.40)); // Capped damage to exactly 40% of parent bullet damage

  const numSplits = Math.min(10, player.splinterShotLevel + 1); // Caps at 10 bullet split fanned symmetrically
  const totalSpread = Math.PI / 2; // 90 degrees total fanning spread
  const angleStep = numSplits > 1 ? totalSpread / (numSplits - 1) : 0;
  const startAngle = angle - totalSpread / 2;

  for (let s = 0; s < numSplits; s++) {
    const a = startAngle + s * angleStep;
    bullets.push({
      x: x,
      y: y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      size: 6, // smaller shrapnel size
      damage: shrapnelDamage,
      trail: [],
      pierceLeft: 1, // pierces 1 zombie then dies
      bounceLeft: 0, // shrapnel does not bounce to avoid infinite recursion
      hitZombies: hitZombie ? [hitZombie] : [], // Pre-exclude the target zombie that got hit to prevent instant double-hits!
      isShrapnel: true,
      life: 45, // Shrapnel expires in 45 frames (~0.75 seconds)
      isFire,
      isCryo
    });
  }
}


// Shooting Weapon System

function rollBulletElement() {
  const fireChance = Math.min(0.30, player.burnLevel * 0.10);
  const cryoChance = Math.min(0.30, player.cryoCapsuleLevel * 0.10);
  const roll = Math.random();

  return {
    isFire: roll < fireChance,
    isCryo: roll >= fireChance && roll < fireChance + cryoChance
  };
}

function shootWeapon() {
  if (player.stunTicks > 0) return; // Stunned! Can't fire!

  const now = Date.now();

  // Calculate dynamic fire rate cooldown
  let currentFireRate = player.fireRate;
  if (player.stimulantLevel > 0) {
    const stimBonus = Math.min(0.40, player.stimulantLevel * 0.10);
    currentFireRate *= (1 - stimBonus);
  }
  if (player.killFrenzyTimer > 0) {
    currentFireRate *= 0.70; // +30% fire rate reduction (faster firing)
  }

  // Slow Start ramp: starts at 0.5x speed, scales linearly to maxMult speed (2.5x–3x) over 10 seconds (600 ticks) from wave start
  if (player.slowStartLevel > 0) {
    const maxMult = Math.min(3.0, 2.25 + player.slowStartLevel * 0.25); // L1=2.5x, L2=2.75x, L3=3.0x
    const progress = Math.min(1, (gameTick - waveStartTick) / 600); // 10 seconds at 60fps = 600 ticks
    const startCd = currentFireRate * 2.0;
    const endCd = currentFireRate / maxMult;
    currentFireRate = Math.max(50, startCd + (endCd - startCd) * progress);
  }

  // Bullet spawn rate cooldown check
  if (now - player.lastShotTime >= currentFireRate) {
    audio.playSfx('shoot');
    // 1. Calculate angle from player's screen position to mouse cursor screen coordinates
    const playerScreenX = player.x - camera.x;
    const playerScreenY = player.y - camera.y;
    const aimDx = mouse.x - playerScreenX;
    const aimDy = mouse.y - playerScreenY;
    const angle = Math.atan2(aimDy, aimDx);

    // Increment and check Overclocked Weapon count
    let isOverclocked = false;
    if (player.overclockLevel > 0) {
      player.overclockShotCounter += 1;
      const threshold = Math.max(5, 10 - (player.overclockLevel - 1));
      if (player.overclockShotCounter >= threshold) {
        player.overclockShotCounter = 0;
        isOverclocked = true;
      }
    }

    // 2. Spawn bullets (combining stackable Parallel Multi-Shot and Epic fanned Spread Shots)
    const totalBullets = 1 + player.spreadShotCount + player.doubleShotCount;

    // Calculate bullet stats dynamically based on upgrades
    const isPlayerMoving = (keys.w || keys.a || keys.s || keys.d);
    let finalDamage = player.bulletDamage;
    if (!isPlayerMoving && player.steadyAimLevel > 0) {
      finalDamage += Math.min(60, player.steadyAimLevel * 10); // Capped at +60 damage
    }
    // Double Shot penalty: -45% damage when extra bullets are active
    if (player.spreadShotCount > 0) {
      finalDamage = Math.max(1, Math.round(finalDamage * 0.55));
    }
    // Burn Bullet damage boost is now applied on an individual bullet basis (under Chunk 6/7)
    let finalSize = 10 * (1 + player.bulletSizeModifier); // Giant Bullets modifier

    if (isOverclocked) {
      finalDamage = Math.round(finalDamage * 1.5); // +50% damage
      finalSize *= 1.5; // larger projectile visual
    }

    if (totalBullets < 4) {
      // Perfectly parallel side-by-side bullets for 1, 2, or 3 bullets
      const parallelSpacing = 14; // side-by-side spacing in pixels
      const perpX = -Math.sin(angle);
      const perpY = Math.cos(angle);

      for (let p = 0; p < totalBullets; p++) {
        const parallelOffset = p - (totalBullets - 1) / 2;
        const ox = parallelOffset * parallelSpacing * perpX;
        const oy = parallelOffset * parallelSpacing * perpY;
        const element = rollBulletElement();

        bullets.push({
          x: player.x + ox,
          y: player.y + oy,
          vx: Math.cos(angle) * player.bulletSpeed,
          vy: Math.sin(angle) * player.bulletSpeed,
          size: finalSize,
          damage: element.isFire ? Math.round(finalDamage * 1.10) : finalDamage,
          trail: [], // Array of past coordinate points for tracing trails
          pierceLeft: player.bulletPierceLimit,
          maxBounces: player.bounceLimit,
          bounceLeft: player.bounceLimit, // Bouncing Casings Limit
          hitZombies: [],
          isShrapnel: false,
          life: 150, // Bullet expires in 150 frames (~2.5 seconds) to balance bouncing bullets
          isFire: element.isFire,
          isCryo: element.isCryo,
          isOverclocked: isOverclocked
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
        const element = rollBulletElement();

        bullets.push({
          x: player.x,
          y: player.y,
          vx: Math.cos(currentAngle) * player.bulletSpeed,
          vy: Math.sin(currentAngle) * player.bulletSpeed,
          size: finalSize,
          damage: element.isFire ? Math.round(finalDamage * 1.10) : finalDamage,
          trail: [],
          maxBounces: player.bounceLimit,
          bounceLeft: player.bounceLimit,
          hitZombies: [],
          isShrapnel: false,
          life: 150, // Bullet expires in 150 frames (~2.5 seconds) to balance bouncing bullets
          isFire: element.isFire,
          isCryo: element.isCryo,
          isOverclocked: isOverclocked
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
      closestZ.flashTicks = 5; // Trigger white hit flash
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

function triggerExplosion(ex, ey, maxDamage) {
  audio.playSfx('explosion');
  startExplosionShake(ex, ey, 20); // Upgraded screen shake to 20 for massive weight
  addFloorScorch(ex, ey, 90, 'fire'); // Perfect circle crater with glowing cracks

  // Push an active animated radial gradient fireball
  explosions.push({
    type: 'fire',
    x: ex,
    y: ey,
    radius: 140,
    life: 1.0,
    decay: 0.045
  });

  // Spawn nested glowing expanding shockwave rings
  gameParticles.push({
    type: 'shockwave',
    x: ex,
    y: ey,
    maxRadius: 140,
    lineWidth: 5,
    color: '#ff4400',
    life: 1.0,
    decay: 0.04
  });
  gameParticles.push({
    type: 'shockwave',
    x: ex,
    y: ey,
    maxRadius: 100,
    lineWidth: 3,
    color: '#ffee00',
    life: 1.0,
    decay: 0.05
  });

  // Spawn chunky fiery debris particles (35-50 particles) in orange/yellow hues
  const numDebris = 35 + Math.floor(Math.random() * 15);
  for (let i = 0; i < numDebris; i++) {
    const angle = Math.random() * Math.PI * 2;
    const force = Math.random() * 6 + 3;
    const size = Math.floor(Math.random() * 6) + 4;
    const colorRoll = Math.random();
    let color = '#ff4500'; // Hot orange
    if (colorRoll < 0.4) color = '#ffee00'; // Hot yellow
    else if (colorRoll < 0.7) color = '#ff8c00'; // Dark orange

    gameParticles.push({
      x: ex,
      y: ey,
      vx: Math.cos(angle) * force,
      vy: Math.sin(angle) * force,
      size: size,
      color: color,
      life: 1.0,
      decay: Math.random() * 0.05 + 0.02
    });
  }

  // Spawn slow-rising charcoal smoke clouds (15-25 particles) drifting upward
  const numSmoke = 15 + Math.floor(Math.random() * 10);
  for (let i = 0; i < numSmoke; i++) {
    const angle = Math.random() * Math.PI * 2;
    const force = Math.random() * 1.5 + 0.5;
    const size = Math.floor(Math.random() * 8) + 6;
    gameParticles.push({
      x: ex,
      y: ey,
      vx: Math.cos(angle) * force,
      vy: Math.sin(angle) * force - 0.5, // Float slightly upwards
      size: size,
      color: '#555555', // Charcoal smoke
      life: 0.8,
      decay: Math.random() * 0.03 + 0.02
    });
  }

  // Spawn high-velocity golden sparks (20 particles)
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const force = Math.random() * 8 + 4;
    gameParticles.push({
      x: ex,
      y: ey,
      vx: Math.cos(angle) * force,
      vy: Math.sin(angle) * force,
      size: Math.floor(Math.random() * 2) + 1,
      color: '#ffea00',
      life: 0.9,
      decay: Math.random() * 0.08 + 0.06
    });
  }

  const explosionRadius = 140;

  // Damage zombies within explosion radius
  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];
    const zDx = z.x - ex;
    const zDy = z.y - ey;
    const zDist = Math.sqrt(zDx * zDx + zDy * zDy);
    if (zDist < explosionRadius) {
      const factor = (explosionRadius - zDist) / explosionRadius;
      const dmg = Math.floor(maxDamage * factor);
      if (dmg > 0) {
        z.health -= dmg;
        z.flashTicks = 5;
      }
    }
  }

  // Damage player if within 140px radius
  const pDx = player.x - ex;
  const pDy = player.y - ey;
  const pDist = Math.sqrt(pDx * pDx + pDy * pDy);

  if (pDist < explosionRadius) {
    const factor = (explosionRadius - pDist) / explosionRadius;
    const taken = Math.floor(maxDamage * factor);
    if (taken > 0) {
      damagePlayer(taken);
      if (player.health <= 0) return;
    }
  }

}

/**
 * Triggers a toxic Necro-Bomb plague explosion when a zombie dies.
 * Deals splash damage to nearby zombies.
 */
function triggerNecroBombExplosion(ex, ey) {
  audio.playSfx('explosion');
  const radius = 110 + player.necroBombLevel * 25; // Massive upgraded base radius
  const damage = Math.floor((18 + player.necroBombLevel * 6) * 0.8); // Nerfed by an additional 20% to keep damage highly controlled
  startExplosionShake(ex, ey, 12 + player.necroBombLevel * 2);
  addFloorScorch(ex, ey, radius * 0.55, 'necro'); // Glowing toxic crater with custom cracks

  // Push an active animated toxic radial gradient fireball
  explosions.push({
    type: 'necro',
    x: ex,
    y: ey,
    radius: radius,
    life: 1.0,
    decay: 0.04
  });

  // Spawn nested glowing expanding toxic shockwaves
  gameParticles.push({
    type: 'shockwave',
    x: ex,
    y: ey,
    maxRadius: radius,
    lineWidth: 6,
    color: '#39ff14', // Lime green
    life: 1.0,
    decay: 0.035
  });
  gameParticles.push({
    type: 'shockwave',
    x: ex,
    y: ey,
    maxRadius: radius * 0.75,
    lineWidth: 4,
    color: '#b026ff', // Toxic purple
    life: 1.0,
    decay: 0.045
  });

  // Spawn dense poisonous gas clouds (20-30 particles) expanding slowly
  const numPlagueGas = 20 + Math.floor(Math.random() * 10);
  for (let i = 0; i < numPlagueGas; i++) {
    const angle = Math.random() * Math.PI * 2;
    const force = Math.random() * 2 + 0.5;
    const size = Math.floor(Math.random() * 10) + 8;
    const color = Math.random() > 0.5 ? '#39ff14' : '#b026ff';
    gameParticles.push({
      x: ex,
      y: ey,
      vx: Math.cos(angle) * force,
      vy: Math.sin(angle) * force,
      size: size,
      color: color,
      life: 0.9,
      decay: Math.random() * 0.04 + 0.02
    });
  }

  // Spawn high-velocity glowing plague sparks
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const force = Math.random() * 6 + 2;
    gameParticles.push({
      x: ex,
      y: ey,
      vx: Math.cos(angle) * force,
      vy: Math.sin(angle) * force,
      size: Math.floor(Math.random() * 2) + 2,
      color: Math.random() > 0.5 ? '#39ff14' : '#b026ff',
      life: 0.9,
      decay: Math.random() * 0.08 + 0.05
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
        zTarget.flashTicks = 5; // Trigger white hit flash
        if (zTarget.health <= 0) {
          zTarget.killedByNecroBomb = true; // Mark as killed by Necro-Bomb to prevent recursive explosions
        }
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

function addFloorScorch(x, y, radius, type = 'normal') {
  addFloorStain(type === 'necro' ? 'necro_scorch' : 'scorch', x, y, radius, 0.45, 0.0012); // Expirable floor craters (fade out after ~6s to keep arena clean)
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

  if (floorStains.length > 40) {
    floorStains.shift();
  }
}

// Rendering Elements
// Draws the environment, decorations, and characters onto the canvas.

/**
 * Returns true when a world-space point is within the current camera viewport.
 * @param {number} x - World X coordinate.
 * @param {number} y - World Y coordinate.
 * @param {number} [pad=80] - Extra margin in pixels so objects aren't popped at edges.
 */
function isInView(x, y, pad) {
  if (pad === undefined) pad = 80;
  return x + pad > camera.x &&
         x - pad < camera.x + canvas.width &&
         y + pad > camera.y &&
         y - pad < camera.y + canvas.height;
}

/**
 * Pre-renders the static arena floor (tiles + grid lines) to an offscreen canvas
 * once per game start. Each frame the main renderer blits only the visible slice.
 */
function buildStaticFloor() {
  floorCanvas = document.createElement('canvas');
  floorCanvas.width  = world.width;
  floorCanvas.height = world.height;
  floorCtx = floorCanvas.getContext('2d');

  // Base fill
  floorCtx.fillStyle = '#11171a';
  floorCtx.fillRect(0, 0, world.width, world.height);

  // Alternating metallic slab tiles
  const slabSize = 160;
  for (let x = 0; x < world.width; x += slabSize) {
    for (let y = 0; y < world.height; y += slabSize) {
      floorCtx.fillStyle = ((x / slabSize + y / slabSize) % 2 === 0) ? '#172024' : '#141b1f';
      floorCtx.fillRect(x, y, slabSize, slabSize);
      floorCtx.fillStyle = 'rgba(255,255,255,0.035)';
      floorCtx.fillRect(x + 12,           y + 12,           8, 8);
      floorCtx.fillRect(x + slabSize - 20, y + 12,           8, 8);
      floorCtx.fillRect(x + 12,           y + slabSize - 20, 8, 8);
      floorCtx.fillRect(x + slabSize - 20, y + slabSize - 20, 8, 8);
    }
  }

  // Slab divider lines
  floorCtx.fillStyle = 'rgba(0,0,0,0.32)';
  for (let x = 0; x < world.width; x += slabSize) {
    floorCtx.fillRect(x, 0, 3, world.height);
  }
  for (let y = 0; y < world.height; y += slabSize) {
    floorCtx.fillRect(0, y, world.width, 3);
  }

  // Tactical overlay grid (coarse, 320px)
  floorCtx.strokeStyle = 'rgba(92,130,136,0.07)';
  floorCtx.lineWidth = 1;
  for (let x = 80; x <= world.width; x += 320) {
    floorCtx.beginPath(); floorCtx.moveTo(x, 0); floorCtx.lineTo(x, world.height); floorCtx.stroke();
  }
  for (let y = 80; y <= world.height; y += 320) {
    floorCtx.beginPath(); floorCtx.moveTo(0, y); floorCtx.lineTo(world.width, y); floorCtx.stroke();
  }

  // Fine grid overlay (160px – was drawn every frame in render())
  floorCtx.strokeStyle = 'rgba(92,130,136,0.035)';
  floorCtx.lineWidth = 1;
  for (let x = 0; x <= world.width; x += slabSize) {
    floorCtx.beginPath(); floorCtx.moveTo(x, 0); floorCtx.lineTo(x, world.height); floorCtx.stroke();
  }
  for (let y = 0; y <= world.height; y += slabSize) {
    floorCtx.beginPath(); floorCtx.moveTo(0, y); floorCtx.lineTo(world.width, y); floorCtx.stroke();
  }
}

function render() {
  const shakeOffset = getScreenShakeOffset();

  // Clear the screen with deep background color
  ctx.fillStyle = '#090908';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Shift drawing coordinate origin relative to camera location
  ctx.save();
  ctx.translate(shakeOffset.x, shakeOffset.y);
  ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y)); // Floor offsets to keep rendering clean

  // 1. Blit the pre-rendered static floor (only the visible viewport slice)
  if (floorCanvas) {
    const sx = Math.floor(camera.x);
    const sy = Math.floor(camera.y);
    const sw = Math.min(canvas.width,  world.width  - sx);
    const sh = Math.min(canvas.height, world.height - sy);
    if (sw > 0 && sh > 0) {
      ctx.drawImage(floorCanvas, sx, sy, sw, sh, sx, sy, sw, sh);
    }
  }

  // 3. Draw non-collidable lab clutter and floor damage (viewport-culled).
  groundDetails.forEach(d => { if (isInView(d.x, d.y, 80)) drawLabGroundDetail(d); });

  // 3.3. Draw lingering combat stains and containment unit floor marks.
  drawFloorStains();
  drawObstacleGroundMarks();

  // 3.5. Draw solid props and cover that make bounce upgrades useful
  drawObstacles();

  // 3.6. Draw Toxic Trails (Translucent Floor Pools)
  drawToxicTrails();

  // 3.65. Draw Necromancer summon warnings before enemies appear.
  drawPendingSummonTelegraphs();

  // 3.7. Draw dropped Lab Mines
  drawMines();

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

  // 7.5. Draw active glowing radial explosions
  drawExplosions();

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

  // 11. Boss health bar HUD (screen-space, drawn after vignette so it's always visible)
  drawBossHealthBar();
}

function drawLightingOverlay() {
  // Rebuild the vignette gradient only when the canvas is resized (not every frame)
  if (!cachedVignette || canvas.width !== vignetteW || canvas.height !== vignetteH) {
    const longestScreenSide = Math.max(canvas.width, canvas.height);
    cachedVignette = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2,
      Math.min(canvas.width, canvas.height) * 0.25,
      canvas.width / 2, canvas.height / 2,
      longestScreenSide * 0.76
    );
    cachedVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    cachedVignette.addColorStop(0.72, 'rgba(0, 0, 0, 0.18)');
    cachedVignette.addColorStop(1, 'rgba(0, 0, 0, 0.62)');
    vignetteW = canvas.width;
    vignetteH = canvas.height;
  }

  ctx.save();

  ctx.fillStyle = cachedVignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Thin emergency monitor tint keeps the lab sterile and synthetic.
  ctx.fillStyle = 'rgba(43, 255, 125, 0.025)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.restore();
}

function drawBossHealthBar() {
  if (!activeBoss || activeBoss.health <= 0) return;

  ctx.save();

  const barWidth = Math.min(500, canvas.width * 0.45);
  const barHeight = 16;
  const barX = (canvas.width - barWidth) / 2;
  const barY = 30;
  const healthRatio = Math.max(0, activeBoss.health / activeBoss.maxHealth);

  // Dark background bar
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

  // Health fill (pulses brighter red when summoning)
  const summonPulse = activeBoss.isSummoning ? (Math.sin(gameTick * 0.35) + 1) / 2 * 0.3 : 0;
  const r = Math.floor(200 + summonPulse * 55);
  const g = Math.floor(25 + summonPulse * 15);
  ctx.fillStyle = `rgb(${r}, ${g}, 20)`;
  ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);

  // Thin bright border
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

  // Boss name label
  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PATIENT ZERO', canvas.width / 2, barY - 6);

  // Health percentage text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`${Math.ceil(healthRatio * 100)}%`, canvas.width / 2, barY + barHeight + 14);

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
  // Deterministic pseudo-random number based on a seed for stable cracks
  const getDeterministicRandom = (seed) => {
    const val = Math.sin(seed) * 10000;
    return val - Math.floor(val);
  };

  floorStains.forEach(stain => {
    if (!isInView(stain.x, stain.y, stain.radius + 10)) return;
    const alpha = Math.max(0, Math.min(stain.alpha, stain.alpha * (stain.life / stain.maxLife)));

    ctx.save();
    ctx.translate(stain.x, stain.y);
    ctx.rotate(stain.angle);

    // For chemical stains and circular craters, draw perfectly round (do not squash)
    if (stain.type === 'chemical' || stain.type === 'scorch' || stain.type === 'necro_scorch') {
      ctx.scale(1, 1.0);
    } else {
      ctx.scale(1, stain.squash);
    }

    if (stain.type === 'blood') {
      ctx.fillStyle = 'rgba(92, 6, 6, ' + alpha + ')';
    } else if (stain.type === 'chemical') {
      ctx.fillStyle = 'rgba(57, 255, 20, ' + alpha + ')';
    } else if (stain.type === 'necro_scorch') {
      // Toxic Greenish-Black crater background
      ctx.fillStyle = 'rgba(10, 20, 10, ' + alpha * 0.95 + ')';
    } else {
      // Standard scorch: deep charcoal black crater background
      ctx.fillStyle = 'rgba(12, 10, 8, ' + alpha * 0.95 + ')';
    }

    ctx.beginPath();
    if (stain.type === 'chemical' || stain.type === 'scorch' || stain.type === 'necro_scorch') {
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
    } else if (stain.type === 'scorch' || stain.type === 'necro_scorch') {
      // Skip crack detail when many stains are active to keep frame rate stable
      if (floorStains.length > 15) { ctx.restore(); return; }
      // Render deterministic stress fractures radiating outward
      const seed = Math.floor(stain.x + stain.y * 31);
      ctx.strokeStyle = stain.type === 'necro_scorch'
        ? 'rgba(57, 255, 20, ' + alpha * 0.85 + ')' // Glowing toxic green
        : 'rgba(255, 76, 20, ' + alpha * 0.88 + ')'; // Glowing fiery orange

      ctx.lineWidth = Math.max(1.5, stain.radius * 0.022);

      const numCracks = 5;
      for (let j = 0; j < numCracks; j++) {
        const angleSeed = seed + j * 7;
        const lengthSeed = seed + j * 13;

        const crackAngle = (j / numCracks) * Math.PI * 2 + getDeterministicRandom(angleSeed) * 0.5;
        const crackLength = stain.radius * (0.45 + getDeterministicRandom(lengthSeed) * 0.45);

        ctx.beginPath();
        ctx.moveTo(0, 0);

        let cx = 0;
        let cy = 0;
        const steps = 3;
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const stepAngleSeed = angleSeed + s * 17;
          const dev = (getDeterministicRandom(stepAngleSeed) - 0.5) * 0.45;
          const segAngle = crackAngle + dev;
          const segDist = crackLength * t;
          cx = Math.cos(segAngle) * segDist;
          cy = Math.sin(segAngle) * segDist;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }

      // Draw glowing central ember/plague cores
      const numCores = 4;
      for (let c = 0; c < numCores; c++) {
        const coreSeed = seed + c * 23;
        const rDist = stain.radius * 0.22 * getDeterministicRandom(coreSeed);
        const rAngle = getDeterministicRandom(coreSeed + 5) * Math.PI * 2;
        const rx = Math.floor(Math.cos(rAngle) * rDist);
        const ry = Math.floor(Math.sin(rAngle) * rDist);
        const rSize = Math.floor(2 + getDeterministicRandom(coreSeed + 11) * 3);

        if (stain.type === 'necro_scorch') {
          // Glow green or purple
          ctx.fillStyle = getDeterministicRandom(coreSeed + 9) > 0.45
            ? 'rgba(57, 255, 20, ' + alpha * 0.9 + ')'
            : 'rgba(176, 38, 255, ' + alpha * 0.9 + ')';
        } else {
          // Glow fiery orange or gold
          ctx.fillStyle = getDeterministicRandom(coreSeed + 9) > 0.5
            ? 'rgba(255, 120, 0, ' + alpha * 0.95 + ')'
            : 'rgba(255, 220, 0, ' + alpha * 0.95 + ')';
        }
        ctx.fillRect(rx - Math.floor(rSize / 2), ry - Math.floor(rSize / 2), rSize, rSize);
      }
    }

    ctx.restore();
  });
}

function drawObstacleGroundMarks() {
  obstacles.forEach(obstacle => {
    if (obstacle.type !== 'containment' && obstacle.type !== 'chemical') {
      return;
    }
    const cx = obstacle.x + obstacle.width / 2;
    const cy = obstacle.y + obstacle.height / 2;
    if (!isInView(cx, cy, Math.max(obstacle.width, obstacle.height))) return;

    ctx.save();
    ctx.translate(cx, cy);

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

  // Draw Bio-Shield aura if active
  if (player.bioShieldActive) {
    ctx.save();
    // Soft rotating outer cyan energy field
    const bubbleRadius = size * 0.8;
    const pulse = Math.sin(gameTick * 0.1) * 2;
    const rotationAngle = gameTick * 0.03;
    
    ctx.translate(player.x, player.y);
    ctx.rotate(rotationAngle);
    
    // Outer shield glow
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.lineWidth = 4 + pulse;
    ctx.beginPath();
    ctx.arc(0, 0, bubbleRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner shield shell line
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, bubbleRadius - 2, 0, Math.PI * 2);
    ctx.stroke();
    
    // Segmented rotating panels
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, bubbleRadius + 1, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  }
}

/**
 * Renders bullets with high-impact nested plasma paths and glowing cores.
 */
function drawBullets() {
  bullets.forEach(b => {
    if (!isInView(b.x, b.y, b.size + 20)) return;
    // 1. Render continuous nested vector trails if we have historical points
    if (b.trail.length > 1) {
      if (b.isOverclocked) {
        // Red neon energy sheath (outer glow)
        ctx.strokeStyle = 'rgba(255, 0, 50, 0.35)';
        ctx.lineWidth = b.size * 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(b.trail[0].x, b.trail[0].y);
        for (let j = 1; j < b.trail.length; j++) {
          ctx.lineTo(b.trail[j].x, b.trail[j].y);
        }
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Intense crimson-red envelope (mid glow)
        ctx.strokeStyle = '#ff0033';
        ctx.lineWidth = b.size * 0.9;
        ctx.beginPath();
        ctx.moveTo(b.trail[0].x, b.trail[0].y);
        for (let j = 1; j < b.trail.length; j++) {
          ctx.lineTo(b.trail[j].x, b.trail[j].y);
        }
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Superheated hot-white core (inner bullet trail)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = b.size * 0.4;
        ctx.beginPath();
        const startIdx = Math.floor(b.trail.length / 2);
        ctx.moveTo(b.trail[startIdx].x, b.trail[startIdx].y);
        for (let j = startIdx + 1; j < b.trail.length; j++) {
          ctx.lineTo(b.trail[j].x, b.trail[j].y);
        }
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      } else if (b.isFire) {
        // Red-Orange fire sheath (outer glow)
        ctx.strokeStyle = 'rgba(255, 69, 0, 0.35)';
        ctx.lineWidth = b.size * 1.25;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(b.trail[0].x, b.trail[0].y);
        for (let j = 1; j < b.trail.length; j++) {
          ctx.lineTo(b.trail[j].x, b.trail[j].y);
        }
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Intense orange envelope (mid glow)
        ctx.strokeStyle = '#ff5500';
        ctx.lineWidth = b.size * 0.75;
        ctx.beginPath();
        ctx.moveTo(b.trail[0].x, b.trail[0].y);
        for (let j = 1; j < b.trail.length; j++) {
          ctx.lineTo(b.trail[j].x, b.trail[j].y);
        }
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Superheated gold core (inner bullet trail)
        ctx.strokeStyle = '#ffee00';
        ctx.lineWidth = b.size * 0.35;
        ctx.beginPath();
        const startIdx = Math.floor(b.trail.length / 2);
        ctx.moveTo(b.trail[startIdx].x, b.trail[startIdx].y);
        for (let j = startIdx + 1; j < b.trail.length; j++) {
          ctx.lineTo(b.trail[j].x, b.trail[j].y);
        }
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      } else if (b.isCryo) {
        // Frost-blue cryo sheath (outer chill bloom)
        ctx.strokeStyle = 'rgba(80, 220, 255, 0.32)';
        ctx.lineWidth = b.size * 1.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(b.trail[0].x, b.trail[0].y);
        for (let j = 1; j < b.trail.length; j++) {
          ctx.lineTo(b.trail[j].x, b.trail[j].y);
        }
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Sharp cyan energy envelope
        ctx.strokeStyle = '#00d9ff';
        ctx.lineWidth = b.size * 0.7;
        ctx.beginPath();
        ctx.moveTo(b.trail[0].x, b.trail[0].y);
        for (let j = 1; j < b.trail.length; j++) {
          ctx.lineTo(b.trail[j].x, b.trail[j].y);
        }
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Frozen white core
        ctx.strokeStyle = '#e9ffff';
        ctx.lineWidth = b.size * 0.32;
        ctx.beginPath();
        const startIdx = Math.floor(b.trail.length / 2);
        ctx.moveTo(b.trail[startIdx].x, b.trail[startIdx].y);
        for (let j = startIdx + 1; j < b.trail.length; j++) {
          ctx.lineTo(b.trail[j].x, b.trail[j].y);
        }
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      } else {
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
        const startIdx = Math.floor(b.trail.length / 2);
        ctx.moveTo(b.trail[startIdx].x, b.trail[startIdx].y);
        for (let j = startIdx + 1; j < b.trail.length; j++) {
          ctx.lineTo(b.trail[j].x, b.trail[j].y);
        }
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // 2. Render bullet main projectile head block
    const half = b.size / 2;

    if (b.isOverclocked) {
      // Outer fiery outline (Vibrant crimson neon)
      ctx.fillStyle = '#ff0033';
      ctx.fillRect(Math.floor(b.x - half), Math.floor(b.y - half), b.size, b.size);

      // Inner molten core (Pure white)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.floor(b.x - b.size / 4), Math.floor(b.y - b.size / 4), b.size / 2, b.size / 2);

      // High-contrast outline border (dark ruby crimson)
      ctx.strokeStyle = '#3a000a';
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.floor(b.x - half), Math.floor(b.y - half), b.size, b.size);
    } else if (b.isFire) {
      // Outer fiery outline (Vibrant red-orange plasma)
      ctx.fillStyle = '#ff3c00';
      ctx.fillRect(Math.floor(b.x - half), Math.floor(b.y - half), b.size, b.size);

      // Inner molten core (Boiling yellow)
      ctx.fillStyle = '#ffee00';
      ctx.fillRect(Math.floor(b.x - b.size / 4), Math.floor(b.y - b.size / 4), b.size / 2, b.size / 2);

      // High-contrast outline border (dark fire crimson)
      ctx.strokeStyle = '#3d0800';
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.floor(b.x - half), Math.floor(b.y - half), b.size, b.size);
    } else if (b.isCryo) {
      // Outer cryo shell (electric cyan ice)
      ctx.fillStyle = '#00d9ff';
      ctx.fillRect(Math.floor(b.x - half), Math.floor(b.y - half), b.size, b.size);

      // Inner frozen core (cold white)
      ctx.fillStyle = '#e9ffff';
      ctx.fillRect(Math.floor(b.x - b.size / 4), Math.floor(b.y - b.size / 4), b.size / 2, b.size / 2);

      // High-contrast outline border (deep lab blue)
      ctx.strokeStyle = '#002b3d';
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.floor(b.x - half), Math.floor(b.y - half), b.size, b.size);
    } else {
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
    }
  });
}

/**
 * Renders glowing neon-green toxic acid projectiles with blocky shapes.
 */
function drawEnemyProjectiles() {
  enemyProjectiles.forEach(ep => {
    if (!isInView(ep.x, ep.y, ep.size + 30)) return;

    if (ep.isBoss) {
      // Widescreen boss projectile rendering: a heavy radioactive plasma orb
      ctx.save();
      
      // Outer neon shadow aura
      ctx.fillStyle = '#63238a'; // Necrotic purple outer halo
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, ep.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Mid toxic slime shell
      ctx.fillStyle = '#39ff14'; // Slime green main plasma body
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, ep.size * 0.75, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner pulsing bio-active core
      ctx.fillStyle = '#ffff00'; // Neon yellow core
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, ep.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
      
      // Bright white central hot fusion chamber
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, ep.size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      
      // High-contrast block outlines
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, ep.size * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw three orbiting micro-pustules for a biological radioactive chemical design!
      const pulseAngle = (gameTick * 0.08);
      ctx.fillStyle = '#ffff00';
      for (let orb = 0; orb < 3; orb++) {
        const angle = pulseAngle + orb * (Math.PI * 2 / 3);
        const ox = Math.cos(angle) * (ep.size * 0.9);
        const oy = Math.sin(angle) * (ep.size * 0.9);
        
        ctx.beginPath();
        ctx.arc(ep.x + ox, ep.y + oy, ep.size * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      
      ctx.restore();
      return;
    }

    const half = ep.size / 2;
    const isShadow = ep.color === '#ff00ff';

    // Outer glow (Wide energy sheath)
    ctx.fillStyle = isShadow ? '#ff00ff' : '#73ff00';
    ctx.fillRect(Math.floor(ep.x - half), Math.floor(ep.y - half), ep.size, ep.size);

    // Inner bright fusing neon core
    ctx.fillStyle = isShadow ? '#ffffff' : '#39ff14';
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
    if (!isInView(trail.x, trail.y, trail.size + 10)) return;
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
 * Renders dropped, flashing Lab Mines on the canvas floor.
 */
function drawMines() {
  ctx.save();
  activeMines.forEach(m => {
    if (!isInView(m.x, m.y, m.size + 10)) return;
    // Pulse rate depends on mine size/level
    const isPulsing = (gameTick % 20 < 10);
    
    // Outer shadow
    drawObjectShadow(m.x - m.size * 0.6, m.y - m.size * 0.4, m.size * 1.2, m.size * 0.8, 0.4);

    // Mine base cylinder (dark industrial grey with metallic edges)
    ctx.fillStyle = '#2f2f3a';
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Metallic border outline
    ctx.strokeStyle = '#1c1c24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Central yellow/orange hazard pattern
    ctx.fillStyle = '#ff7700';
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size * 0.28, 0, Math.PI * 2);
    ctx.fill();

    // Blinking red central diode
    ctx.fillStyle = isPulsing ? '#ff0033' : '#550000';
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    
    // Glowing aura if diode is active
    if (isPulsing) {
      ctx.strokeStyle = 'rgba(255, 0, 50, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size * 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  ctx.restore();
}

/**
 * Renders jagged neon-cyan Chain Lightning electrical vectors on the canvas.
 */
function drawLightningArcs() {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  lightningArcs.forEach(arc => {
    const alpha = arc.life;

    // Pre-calculate jagged segment points so all three glowing passes align perfectly
    const segments = 5;
    const points = [{ x: arc.x1, y: arc.y1 }];

    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      const px = arc.x1 + (arc.x2 - arc.x1) * t;
      const py = arc.y1 + (arc.y2 - arc.y1) * t;

      const perpX = -(arc.y2 - arc.y1);
      const perpY = (arc.x2 - arc.x1);
      const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);

      let ox = 0;
      let oy = 0;
      if (perpLength > 0) {
        // Jagged deflection magnitude (22px deflection for dramatic electric shapes)
        const offsetAmt = (Math.random() - 0.5) * 22;
        ox = (perpX / perpLength) * offsetAmt;
        oy = (perpY / perpLength) * offsetAmt;
      }
      points.push({ x: px + ox, y: py + oy });
    }
    points.push({ x: arc.x2, y: arc.y2 });

    // --- Pass A: Outer Neon Blue Glowing Aura (Wide) ---
    ctx.strokeStyle = 'rgba(0, 136, 255, ' + alpha * 0.28 + ')';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let p = 1; p < points.length; p++) {
      ctx.lineTo(points[p].x, points[p].y);
    }
    ctx.stroke();

    // --- Pass B: Vibrant Electric Cyan Core (Medium) ---
    ctx.strokeStyle = 'rgba(0, 255, 240, ' + alpha * 0.75 + ')';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let p = 1; p < points.length; p++) {
      ctx.lineTo(points[p].x, points[p].y);
    }
    ctx.stroke();

    // --- Pass C: Superheated Blinding White Filament (Thin Core) ---
    ctx.strokeStyle = 'rgba(255, 255, 255, ' + alpha * 0.95 + ')';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let p = 1; p < points.length; p++) {
      ctx.lineTo(points[p].x, points[p].y);
    }
    ctx.stroke();

    // --- Pass D: Procedural Crackling Branch Forks ---
    ctx.strokeStyle = 'rgba(0, 255, 255, ' + alpha * 0.5 + ')';
    ctx.lineWidth = 1.8;
    for (let s = 1; s < points.length - 1; s++) {
      // 35% chance to branch out at intermediate nodes
      if (Math.random() < 0.35) {
        const pt = points[s];
        // Branch deflection
        const bx = pt.x + (Math.random() - 0.5) * 44;
        const by = pt.y + (Math.random() - 0.5) * 44;

        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(bx, by);

        // Small secondary fork
        if (Math.random() > 0.5) {
          ctx.lineTo(bx + (Math.random() - 0.5) * 20, by + (Math.random() - 0.5) * 20);
        }
        ctx.stroke();
      }
    }
  });

  ctx.restore();
}

/**
 * Renders the Legendary Orbiting Defender energy blades circling the player.
 */
function drawOrbitingDefender() {
  if (player.orbitingDefenderLevel <= 0) return;

  const radius = 190; // Slower, massive outer orbit perimeter (increased from 140)
  const size = 96;   // Made them physically giant sawblades
  const half = size / 2;
  const teethCount = 8;

  for (let d = 0; d < player.orbitingDefenderLevel; d++) {
    const angleOffset = d * (Math.PI * 2 / player.orbitingDefenderLevel);
    const bladeX = player.x + Math.cos(player.defenderAngle + angleOffset) * radius;
    const bladeY = player.y + Math.sin(player.defenderAngle + angleOffset) * radius;

    ctx.save();
    ctx.translate(bladeX, bladeY);

    // High-speed local saw-teeth spinning on center
    ctx.rotate(gameTick * 0.22 + angleOffset);

    // 1. Draw outer glowing red-orange heat halo
    ctx.fillStyle = 'rgba(255, 69, 0, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, half + 5, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw 8 angled saw-teeth (molten steel blades biting the air)
    ctx.fillStyle = '#ff3c00'; // Molten red-orange edge
    for (let i = 0; i < teethCount; i++) {
      const toothAngle = (i * Math.PI * 2 / teethCount);
      ctx.save();
      ctx.rotate(toothAngle);

      ctx.beginPath();
      ctx.moveTo(0, -half * 0.4);
      ctx.lineTo(half * 0.5, -half * 0.4);
      ctx.lineTo(0, -half); // sharp outer point
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // 3. Draw middle steel saw body disc
    ctx.fillStyle = '#ff8800'; // Glowing core orange
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // 4. Draw superheated electric white core disc
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // 5. Draw dark center axle/hub
    ctx.fillStyle = '#22222b';
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // 6. Draw high-contrast black details
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.65, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}



/**
 * Renders all active zombies in detailed matching 8-bit blocky styles.
 * Pivots dynamically to face the player.
 */
function drawPendingSummonTelegraphs() {
  if (pendingSummons.length === 0) return;

  const now = Date.now();

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  pendingSummons.forEach(summon => {
    const castLength = Math.max(1, summon.spawnTime - summon.startTime);
    const progress = Math.max(0, Math.min(1, (now - summon.startTime) / castLength));
    const pulse = (Math.sin(gameTick * 0.25) + 1) / 2;
    const warningAlpha = 0.24 + progress * 0.5 + pulse * 0.08;

    if (summon.summoner) {
      const casterRadius = summon.isBossSummon ? (72 + progress * 22 + pulse * 6) : (58 + progress * 18 + pulse * 5);

      // Boss summons use red, necromancer uses green
      const mainR = summon.isBossSummon ? 255 : 57;
      const mainG = summon.isBossSummon ? 34 : 255;
      const mainB = summon.isBossSummon ? 34 : 20;
      const accentR = summon.isBossSummon ? 255 : 255;
      const accentG = summon.isBossSummon ? 136 : 0;
      const accentB = summon.isBossSummon ? 0 : 255;

      ctx.fillStyle = `rgba(${mainR}, ${mainG}, ${mainB}, 0.055)`;
      ctx.beginPath();
      ctx.arc(summon.summoner.x, summon.summoner.y, casterRadius, 0, Math.PI * 2);
      ctx.fill();

      // Keep this telegraph cheap: no shadowBlur or dashed circles, because those can tank FPS.
      ctx.strokeStyle = `rgba(${mainR}, ${mainG}, ${mainB}, ${warningAlpha * 0.55})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(summon.summoner.x, summon.summoner.y, casterRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(${mainR}, ${mainG}, ${mainB}, ${warningAlpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(summon.summoner.x, summon.summoner.y, casterRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(${accentR}, ${accentG}, ${accentB}, ${0.16 + pulse * 0.18})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(summon.summoner.x, summon.summoner.y, casterRadius * 0.58, 0, Math.PI * 2);
      ctx.stroke();
    }

    summon.spots.forEach((spot, index) => {
      const spotRadius = 24 + progress * 16 + pulse * 3;
      const tickAngle = gameTick * 0.035 + index * 1.8;

      // Boss summon spots use red, necromancer uses green
      const sR = summon.isBossSummon ? 255 : 57;
      const sG = summon.isBossSummon ? 34 : 255;
      const sB = summon.isBossSummon ? 34 : 20;

      ctx.fillStyle = `rgba(${sR}, ${sG}, ${sB}, ${0.04 + progress * 0.08})`;
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, spotRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(${sR}, ${sG}, ${sB}, ${warningAlpha * 0.45})`;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, spotRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(${sR}, ${sG}, ${sB}, ${warningAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, spotRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${0.18 + progress * 0.25})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(spot.x - spotRadius * 0.45, spot.y);
      ctx.lineTo(spot.x + spotRadius * 0.45, spot.y);
      ctx.moveTo(spot.x, spot.y - spotRadius * 0.45);
      ctx.lineTo(spot.x, spot.y + spotRadius * 0.45);
      ctx.stroke();

      for (let t = 0; t < 4; t++) {
        const angle = tickAngle + t * Math.PI / 2;
        const inner = spotRadius * 0.72;
        const outer = spotRadius * 1.08;
        ctx.strokeStyle = `rgba(${summon.isBossSummon ? '255, 136, 0' : '255, 119, 0'}, ${0.32 + progress * 0.32})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(spot.x + Math.cos(angle) * inner, spot.y + Math.sin(angle) * inner);
        ctx.lineTo(spot.x + Math.cos(angle) * outer, spot.y + Math.sin(angle) * outer);
        ctx.stroke();
      }
    });
  });

  ctx.restore();
}

function drawZombies() {
  zombies.forEach(z => {
    if (!isInView(z.x, z.y, z.size + 20)) return;
    const size = z.size;
    const baseSpriteSizes = {
      normal: 32,
      fast: 24,
      spitter: 28,
      exploder: 30,
      tank: 40,
      necromancer: 36,
      rusher: 36,
      patient_zero: 112
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

    // Apply bright white hit flash filter if recently damaged
    let isFlashed = false;
    if (z.flashTicks > 0) {
      z.flashTicks -= 1;
      isFlashed = true;
      if (typeof ctx.filter === 'string') {
        ctx.filter = 'brightness(0) invert(1)';
      }
    }

    if (z.type === 'tank') {
      // Heavy Tank Zombie Sprite Design (40px)

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
      // Fast Zombie Sprite Design (24px)

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
      // Acid Spitter Zombie Sprite Design (28px)
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
      // Exploder Bomber Zombie Sprite Design (30px)
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

    } else if (z.type === 'rusher') {
      // Rusher Charging Zombie Sprite (36px base, scaled up)

      // ==========================================
      // PASS 1: SOLID BLACK OUTLINE PASS
      // ==========================================
      ctx.fillStyle = '#000000';
      // Tail / Exhaust tubes
      ctx.fillRect(-22, -8, 6, 16);
      // Spiky back armor
      ctx.fillRect(-18, -16, 12, 32);
      // Shoulders / spikes
      ctx.fillRect(-10, -22, 12, 44);
      // Torso
      ctx.fillRect(-12, -14, 24, 28);
      // Head
      ctx.fillRect(10, -10, 14, 20);
      // Giant ramming horn / central spike
      ctx.fillRect(20, -6, 8, 12);

      // ==========================================
      // PASS 2: COLOR LAYER PASS
      // ==========================================
      // Exhaust tubes
      ctx.fillStyle = '#2d2d30';
      ctx.fillRect(-20, -6, 4, 12);
      ctx.fillStyle = '#ff5500'; // Hot orange engine flame
      ctx.fillRect(-20, -3, 1, 6);

      // Dark Iron Carapace
      ctx.fillStyle = '#1a1a20'; // Base plate Y narrow
      ctx.fillRect(-16, -12, 10, 24);
      ctx.fillStyle = '#252530'; // Main shoulder plate
      ctx.fillRect(-8, -10, 18, 20);

      // Orange venting reactor seams
      ctx.fillStyle = '#ff5500';
      ctx.fillRect(-10, -8, 2, 16);
      ctx.fillRect(-2, -5, 2, 10);
      ctx.fillStyle = '#ffcc00'; // central reactor spark
      ctx.fillRect(-1, -2, 2, 4);

      // Armored Mutant Shoulders & Spikes
      ctx.fillStyle = '#3a0c0c'; // heavy blood flesh joints
      ctx.fillRect(-6, -18, 4, 4);
      ctx.fillRect(-6, 14, 4, 4);
      ctx.fillStyle = '#ff5500'; // hard orange spike tips
      ctx.fillRect(-8, -20, 2, 2);
      ctx.fillRect(-8, 18, 2, 2);

      // Ramming skull & heavy metal spike
      ctx.fillStyle = '#0a0a0f'; // obsidian skull faceplate
      ctx.fillRect(10, -8, 10, 16);
      ctx.fillStyle = '#ff3300'; // bio-hazard magma eyes
      ctx.fillRect(14, -4, 3, 2);
      ctx.fillRect(14, 2, 3, 2);

      // Heavy ram horn/wedge
      ctx.fillStyle = '#5c6b7d';
      ctx.fillRect(18, -4, 6, 8);
      ctx.fillStyle = '#ffffff'; // gleaming steel point
      ctx.fillRect(22, -2, 2, 4);

    } else if (z.type === 'patient_zero') {
      // Patient Zero Redesigned: The Bio-Hazard Toxic Abomination (112px base, scaled up)

      // ==========================================
      // PASS 1: SOLID BLACK OUTLINE PASS
      // (Draws a slightly larger black silhouette of all parts to create a unified 4px outline)
      // ==========================================
      ctx.fillStyle = '#000000';

      // 1. Spiky Tail Outline Silhouette (Bloated Plague Appendage)
      ctx.fillRect(-57, -13, 22, 26);
      ctx.fillRect(-65, -9, 16, 18);
      ctx.fillRect(-71, -5, 14, 10);
      // Spikes on tail
      ctx.fillRect(-61, -17, 10, 10);
      ctx.fillRect(-61, 7, 10, 10);
      ctx.fillRect(-67, -11, 8, 8);
      ctx.fillRect(-67, 3, 8, 8);
      ctx.fillRect(-73, -6, 7, 7);

      // 2. Back Plate Spikes / Acid Pods Outline Silhouette
      ctx.fillRect(-47, -43, 20, 18);
      ctx.fillRect(-51, -23, 22, 18);
      ctx.fillRect(-51, 5, 22, 18);
      ctx.fillRect(-47, 25, 20, 18);

      // 3. Mutant Shoulders Outline Silhouette
      ctx.fillRect(-19, -45, 34, 24);
      ctx.fillRect(-19, 21, 34, 24);

      // 4. Torso Carapace Outline Silhouette
      ctx.fillRect(-31, -21, 18, 42);
      ctx.fillRect(-23, -31, 44, 62);
      ctx.fillRect(-15, -35, 36, 70);
      ctx.fillRect(7, -23, 16, 46);

      // 5. Head & Spiked Crown Outline Silhouette
      ctx.fillRect(7, -21, 26, 42);
      // Spikes
      ctx.fillRect(3, -29, 14, 14);
      ctx.fillRect(-1, -33, 10, 10);
      ctx.fillRect(3, 15, 14, 14);
      ctx.fillRect(-1, 23, 10, 10);
      // Horns
      ctx.fillRect(25, -15, 12, 10);
      ctx.fillRect(31, -13, 12, 9);
      ctx.fillRect(25, 5, 12, 10);
      ctx.fillRect(31, 4, 12, 9);

      // 6. Leviathan Arms & Claws Outline Silhouette
      // Right Arm (Top)
      ctx.fillRect(9, -37, 26, 18);
      ctx.fillRect(25, -43, 22, 20);
      ctx.fillRect(41, -46, 16, 10); // Claw 1
      ctx.fillRect(41, -38, 20, 11); // Claw 2
      ctx.fillRect(41, -29, 16, 10); // Claw 3
      // Left Arm (Bottom)
      ctx.fillRect(9, 19, 26, 18);
      ctx.fillRect(25, 23, 22, 20);
      ctx.fillRect(41, 19, 16, 10); // Claw 1
      ctx.fillRect(41, 27, 20, 11); // Claw 2
      ctx.fillRect(41, 36, 16, 10); // Claw 3

      // ==========================================
      // PASS 2: COLOR DETAIL PASS (Toxic Bio-Hazard Theme)
      // (Draws the actual colored layers over the black silhouette, forming perfect outlines)
      // ==========================================

      // 1. Decaying Plague Tail
      ctx.fillStyle = '#1c2e1c'; // Deep rotting green
      ctx.fillRect(-54, -10, 16, 20);
      ctx.fillRect(-62, -6, 10, 12);
      ctx.fillRect(-68, -2, 8, 4);
      // Glowing toxic slime pustules / tail tips
      ctx.fillStyle = '#39ff14'; // Slime green glows
      ctx.fillRect(-58, -14, 4, 4);
      ctx.fillRect(-58, 10, 4, 4);
      ctx.fillStyle = '#ffff00'; // Neon yellow chemical tips
      ctx.fillRect(-64, -8, 3, 2);
      ctx.fillRect(-64, 6, 3, 2);
      ctx.fillRect(-70, -3, 2, 2);

      // 2. Weeping Acid Boils & Toxic Nodule Plates (Back Spikes)
      // Back Plate 1 (Top Spikes)
      ctx.fillStyle = '#2d4022'; // Necrotic green-gray shell
      ctx.fillRect(-44, -40, 14, 12);
      ctx.fillStyle = '#39ff14'; // Bulging toxic slime pustule
      ctx.fillRect(-48, -36, 4, 4);
      ctx.fillStyle = '#ffffff'; // Acid reflection glint
      ctx.fillRect(-46, -35, 2, 2);

      // Back Plate 2 (Mid-Top Spikes)
      ctx.fillStyle = '#2d4022';
      ctx.fillRect(-48, -20, 16, 12);
      ctx.fillStyle = '#ffff00'; // Weeping yellow chemical boil
      ctx.fillRect(-54, -16, 6, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-52, -15, 2, 2);

      // Back Plate 3 (Mid-Bottom Spikes)
      ctx.fillStyle = '#2d4022';
      ctx.fillRect(-48, 8, 16, 12);
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(-54, 12, 6, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-52, 13, 2, 2);

      // Back Plate 4 (Bottom Spikes)
      ctx.fillStyle = '#2d4022';
      ctx.fillRect(-44, 28, 14, 12);
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(-48, 32, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-46, 33, 2, 2);

      // 3. Mutated Infected Shoulders (with pulsing vents)
      // Right Mutant Shoulder (Top side)
      ctx.fillStyle = '#182215'; // Decayed carcass gray-green
      ctx.fillRect(-16, -42, 28, 18);
      ctx.fillStyle = '#63238a'; // Purple necrotic plague veins
      ctx.fillRect(-10, -38, 18, 4);
      ctx.fillStyle = '#39ff14'; // Bulging bio-hazard slime vent
      ctx.fillRect(-4, -37, 4, 2);

      // Left Mutant Shoulder (Bottom side)
      ctx.fillStyle = '#182215';
      ctx.fillRect(-16, 24, 28, 18);
      ctx.fillStyle = '#63238a';
      ctx.fillRect(-10, 34, 18, 4);
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(-4, 35, 4, 2);

      // 4. Bloated Plague Carapace & Necrotic Muscle Segments
      // Layer 1: Rear Back Plate (Decayed shell, tapered narrow)
      ctx.fillStyle = '#1e291d';
      ctx.fillRect(-28, -18, 12, 36);

      // Layer 2: Main Shoulder Carapace (Rotting armored tissue, broad middle)
      ctx.fillStyle = '#2b3e2b';
      ctx.fillRect(-20, -28, 38, 56);

      // Layer 3: Chest Carapace (Armored bone breastplates, broad chest)
      ctx.fillStyle = '#401f5c'; // Rotting purplish muscle growths
      ctx.fillRect(-12, -32, 30, 64);

      // Layer 4: Neck Plate (Connects to head)
      ctx.fillStyle = '#334c33';
      ctx.fillRect(10, -20, 10, 40);

      // Infected hyper-mutated flesh under-layer showing through carapace seams
      ctx.fillStyle = '#63238a'; // Glowing purple veins
      ctx.fillRect(-20, -24, 34, 48);
      ctx.fillStyle = '#3c0a1a'; // Dark infected bloody seams
      ctx.fillRect(-14, -20, 24, 40);

      // 5. Exposed Ribcage & Beating Acid Bladder (Heart Core)
      const bossFlash = z.isSummoning ? (Math.sin(gameTick * 0.45) + 1) / 2 : 0;
      ctx.fillStyle = '#0b1a0a'; // Deep toxic shadow inside cavity
      ctx.fillRect(-10, -16, 20, 32);

      // Beating Bio-Hazard Heart Core (Dynamic color shift & pulsing glow)
      const r = 20 + Math.floor(bossFlash * 40);
      const g = 190 + Math.floor(bossFlash * 65) + (z.isSummoning ? 30 : 0);
      const b = 10 + Math.floor(bossFlash * 30);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(-6, -12, 12, 24);
      ctx.fillStyle = '#ccff00'; // High-concentrate lime-yellow acid core
      ctx.fillRect(-3, -8, 6, 16);
      ctx.fillStyle = '#ffffff'; // Biophosphorescent super-hot central chamber
      ctx.fillRect(-1, -4, 2, 8);

      // Ribcage bone plates wrapping around core (Acid-bleached pale green bones)
      ctx.fillStyle = '#d1e0d1';
      ctx.fillRect(-10, -12, 14, 3); // Top rib
      ctx.fillRect(-11, -5, 17, 3);  // Mid ribs
      ctx.fillRect(-11, 2, 17, 3);
      ctx.fillRect(-10, 9, 14, 3);   // Bottom rib
      // Ribcage mossy bone connections
      ctx.fillStyle = '#9aa89a';
      ctx.fillRect(-12, -14, 3, 28);

      // 6. Acid-Drenched Leviathan Arms
      // Right Leviathan Arm (Top Side)
      ctx.fillStyle = '#1e351e'; // Rotten mutated mossy joint
      ctx.fillRect(12, -34, 20, 12);
      ctx.fillStyle = '#3a0c4f'; // Forearm plague growth plate
      ctx.fillRect(28, -40, 16, 14);
      // 3 Glowing Toxic Razor Claws
      ctx.fillStyle = '#39ff14'; // Bright green glowing acid claws
      ctx.fillRect(44, -43, 10, 4); // Claw 1
      ctx.fillRect(44, -35, 14, 5); // Claw 2 (Longest center digit)
      ctx.fillRect(44, -26, 10, 4); // Claw 3
      // Claws yellow acid-hardened tips
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(54, -43, 2, 4);
      ctx.fillRect(58, -35, 3, 5);
      ctx.fillRect(54, -26, 2, 4);
      // Bio-active chemical pod on hand
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(38, -36, 6, 7);

      // Left Leviathan Arm (Bottom Side)
      ctx.fillStyle = '#1e351e';
      ctx.fillRect(12, 22, 20, 12);
      ctx.fillStyle = '#3a0c4f';
      ctx.fillRect(28, 26, 16, 14);
      // 3 Glowing Toxic Razor Claws
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(44, 22, 10, 4); // Claw 1
      ctx.fillRect(44, 30, 14, 5); // Claw 2
      ctx.fillRect(44, 39, 10, 4); // Claw 3
      // Claws yellow acid-hardened tips
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(54, 22, 2, 4);
      ctx.fillRect(58, 30, 3, 5);
      ctx.fillRect(54, 39, 2, 4);
      // Bio-active chemical pod on hand
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(38, 29, 6, 7);

      // 7. Bloated Mossy Armored Skull
      ctx.fillStyle = '#2a382a'; // Deep moldy green bone skull
      ctx.fillRect(10, -18, 20, 36);
      ctx.fillStyle = '#4f2070'; // Plague bloated armored crown nodes
      ctx.fillRect(14, -14, 18, 28);
      // Crown Spikes
      ctx.fillStyle = '#1c2e1c';
      ctx.fillRect(6, -26, 8, 8);
      ctx.fillRect(2, -30, 4, 4);
      ctx.fillRect(6, 18, 8, 8);
      ctx.fillRect(2, 26, 4, 4);
      // Dual Acid-Coated Glowing Horns
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(28, -12, 6, 4);
      ctx.fillRect(34, -10, 6, 3);
      ctx.fillRect(28, 8, 6, 4);
      ctx.fillRect(34, 7, 6, 3);

      // 8. Cluster of Glowing Yellow Spider-like Eyes & Dripping Acid Maw
      ctx.fillStyle = '#ffff00'; // Neon yellow arachnid eyes cluster
      ctx.fillRect(26, -10, 4, 4);
      ctx.fillRect(28, -4, 4, 4);
      ctx.fillRect(28, 0, 4, 4);
      ctx.fillRect(26, 6, 4, 4);
      // Eye white energy highlights
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(28, -3, 2, 2);
      ctx.fillRect(28, 1, 2, 2);
      // Dripping chemical acid jaw details
      ctx.fillStyle = '#39ff14'; // Slime green saliva drops
      ctx.fillRect(24, -6, 2, 12);
      ctx.fillRect(26, -2, 2, 4);

    } else if (z.type === 'necromancer') {
      // Necromancer Zombie Sprite Design (36px)
      // 1. Floor Drop Shadow (slender block shadow)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(-12, -12, 24, 24);

      // 2. Hooded Cowl Robe (Deep mystic purple and dark velvet highlights)
      ctx.fillStyle = '#3a1a4a'; // Royal dark purple
      ctx.fillRect(-12, -12, 20, 24);
      
      ctx.fillStyle = '#1f0d2b'; // Darker folds
      ctx.fillRect(-12, -8, 6, 16);

      // 3. Exposed skeletal spine/back ridge (decayed bone)
      ctx.fillStyle = '#d8d8c8';
      ctx.fillRect(-14, -4, 2, 8);

      // 4. Glowing Runic Sigil/Heart (Vibrant neon purple core)
      ctx.fillStyle = '#ff00ff'; // neon magenta/purple rune
      ctx.fillRect(-4, -6, 8, 12);
      ctx.fillStyle = '#ffffff'; // hot white magical core
      ctx.fillRect(-2, -3, 4, 6);

      // 5. Left Wizard Sleeves & Skeletal Hand (reaching to cast - bottom right)
      ctx.fillStyle = '#3a1a4a'; // Purple sleeve
      ctx.fillRect(4, 5, 8, 4);
      ctx.fillStyle = '#d8d8c8'; // Skeletal claw
      ctx.fillRect(12, 5, 4, 3);
      ctx.fillStyle = '#ff00ff'; // Magic residue sparks at fingertips
      ctx.fillRect(16, 5, 2, 2);

      // 6. Right Wizard Sleeves & Skeletal Hand (reaching to cast - top right)
      ctx.fillStyle = '#1f0d2b'; // Darker purple sleeve
      ctx.fillRect(4, -9, 8, 4);
      ctx.fillStyle = '#d8d8c8'; // Skeletal claw
      ctx.fillRect(12, -9, 4, 3);
      ctx.fillStyle = '#ff00ff'; // Magic residue sparks at fingertips
      ctx.fillRect(16, -9, 2, 2);

      // 7. Hooded Skull/Face (shrouded in shadows)
      ctx.fillStyle = '#0c0612'; // deep black hood interior
      ctx.fillRect(-4, -7, 10, 14);

      // 8. Glowing Magic Cyber Visor Eyes (neon pink/magenta)
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(1, -4, 3, 8);
      ctx.fillStyle = '#ffffff'; // visor reflection dot
      ctx.fillRect(3, -2, 1, 2);

      // 9. Outer Black Pixel Art Outline Border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeRect(-12, -12, 20, 24);

    } else {
      // Normal Zombie Sprite Design (32px)

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

    // 9.5 Draw Icy/Fiery visual indicators on top of the zombie sprite
    if (z.burnTicks > 0 && !isFlashed) {
      // 1. Draw animated layered waving fluid flames
      // Red base layer
      ctx.fillStyle = 'rgba(230, 30, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(Math.sin(gameTick * 0.1) * size * 0.08, -Math.cos(gameTick * 0.08) * size * 0.08 - size * 0.08, size * 0.44, 0, Math.PI * 2);
      ctx.fill();

      // Orange middle layer
      ctx.fillStyle = 'rgba(255, 120, 0, 0.52)';
      ctx.beginPath();
      ctx.arc(Math.cos(gameTick * 0.12) * size * 0.06, Math.sin(gameTick * 0.1) * size * 0.06 - size * 0.15, size * 0.32, 0, Math.PI * 2);
      ctx.fill();

      // Yellow/White radiant core layer
      ctx.fillStyle = 'rgba(255, 235, 100, 0.72)';
      ctx.beginPath();
      ctx.arc(Math.sin(gameTick * 0.15) * size * 0.04, -size * 0.22, size * 0.18, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw subtle flickering flame sparks
      ctx.fillStyle = 'rgba(255, 165, 0, 0.75)';
      for (let f = 0; f < 3; f++) {
        const fx = (Math.random() - 0.5) * size * 0.6;
        const fy = -Math.random() * size * 0.7; // drift upwards locally
        ctx.fillRect(fx, fy, 4, 4);
      }
    } else if (z.cryoSlowTicks > 0 && !isFlashed) {
      // 2. Draw rotating hexagonal frosted glacier shield
      const radius = size * 0.48;
      ctx.fillStyle = 'rgba(0, 200, 255, 0.26)';
      ctx.strokeStyle = 'rgba(143, 252, 255, 0.85)';
      ctx.lineWidth = 2.2;
      
      ctx.beginPath();
      const sides = 6;
      for (let s = 0; s <= sides; s++) {
        const a = (s * Math.PI * 2 / sides) + (gameTick * 0.008); // slowly rotating shell
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Draw glistening frost inner lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let s = 0; s < 3; s++) {
        const a = (s * Math.PI * 2 / 3) + (gameTick * 0.008);
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * radius * 0.75, Math.sin(a) * radius * 0.75);
      }
      ctx.stroke();
      
      // Draw subtle glistening ice crystals
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      for (let c = 0; c < 2; c++) {
        const cx = (Math.random() - 0.5) * size * 0.5;
        const cy = (Math.random() - 0.5) * size * 0.5;
        ctx.fillRect(cx, cy, 3, 3);
      }
    }

    // Restore canvas filter if it was set
    if (isFlashed && typeof ctx.filter === 'string') {
      ctx.filter = 'none';
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
    if (!isInView(p.x, p.y, 20)) return;
    // Set particle opacity to fit current lifetime
    ctx.globalAlpha = p.life;

    if (p.type === 'shockwave') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.lineWidth || 3;
      ctx.beginPath();
      const currentRadius = p.maxRadius * (1 - p.life);
      ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

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
 * Draws real-time high-fidelity radial gradient fireballs and toxic necro-bomb explosions.
 */
function drawExplosions() {
  explosions.forEach(exp => {
    if (!isInView(exp.x, exp.y, exp.radius + 20)) return;
    const progress = 1 - exp.life; // 0 to 1
    const currentRadius = exp.radius * progress;

    ctx.save();
    ctx.globalAlpha = exp.life * 0.88;

    // Layered concentric circles approximate the gradient without creating one per frame
    if (exp.type === 'necro') {
      ctx.fillStyle = 'rgba(100,10,180,0.35)';
      ctx.beginPath(); ctx.arc(exp.x, exp.y, currentRadius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(176,38,255,0.55)';
      ctx.beginPath(); ctx.arc(exp.x, exp.y, currentRadius * 0.65, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(57,255,20,0.8)';
      ctx.beginPath(); ctx.arc(exp.x, exp.y, currentRadius * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(exp.x, exp.y, currentRadius * 0.14, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(176,0,0,0.4)';
      ctx.beginPath(); ctx.arc(exp.x, exp.y, currentRadius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,85,0,0.65)';
      ctx.beginPath(); ctx.arc(exp.x, exp.y, currentRadius * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,238,0,0.85)';
      ctx.beginPath(); ctx.arc(exp.x, exp.y, currentRadius * 0.30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(exp.x, exp.y, currentRadius * 0.12, 0, Math.PI * 2); ctx.fill();
    }

    // Shockwave ring
    ctx.strokeStyle = exp.type === 'necro' ? '#39ff14' : '#ff4500';
    ctx.lineWidth = Math.max(1, 4 * exp.life);
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, currentRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  });
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
  healthValue.textContent = Math.round(player.health);
  scoreValue.textContent  = gameState.score;
  waveValue.textContent   = gameState.wave;

  // Update retro segmented health bar width
  if (healthFill) {
    const healthPercent = Math.max(0, Math.min(100, (player.health / player.maxHealth) * 100));
    healthFill.style.width = healthPercent + '%';
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
  document.getElementById('pause-btn').style.display = 'none';
  audio.stopMusic();
  audio.playSfx('explosion');

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
  // Handle Spacebar Dashing
  if (event.key === ' ' && gameState.isRunning) {
    if (player.reflexDashLevel > 0 && player.reflexDashCooldown <= 0) {
      event.preventDefault();
      triggerReflexDash();
    }
  }

  const key = event.key.toLowerCase();
  activeKeys[key] = true;

  if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
    keys[key] = true;
  }

  // Toggle developer cheat panel on simultaneous O + P press
  if (activeKeys['o'] && activeKeys['p']) {
    // Reset key states immediately to prevent rapid multiple toggling
    activeKeys['o'] = false;
    activeKeys['p'] = false;
    requestCheatPanelAccess();
  }
});

function triggerReflexDash() {
  audio.playSfx('dash');
  // Determine dash direction from movement inputs, default to aiming angle if stationary
  let dx = 0;
  let dy = 0;
  if (keys.w) dy -= 1;
  if (keys.s) dy += 1;
  if (keys.a) dx -= 1;
  if (keys.d) dx += 1;

  let angle;
  if (dx !== 0 || dy !== 0) {
    angle = Math.atan2(dy, dx);
  } else {
    // Aiming direction towards mouse
    const playerScreenX = player.x - camera.x;
    const playerScreenY = player.y - camera.y;
    const aimDx = mouse.x - playerScreenX;
    const aimDy = mouse.y - playerScreenY;
    angle = Math.atan2(aimDy, aimDx);
  }

  // Configure dash surge
  const dashMultiplier = 3.5;
  const desiredSpeed = player.speed * (player.isOnToxicTrail ? 0.7 : 1.0); // slight trail slow
  player.reflexDashVx = Math.cos(angle) * desiredSpeed * dashMultiplier;
  player.reflexDashVy = Math.sin(angle) * desiredSpeed * dashMultiplier;
  player.reflexDashDuration = 9; // Dash lasts 9 frames (~0.15 seconds of invulnerable surge)
  
  // Cooldown reduces by 1.0s per stack level above 1, capped at 3s minimum (from 6s)
  const cooldownSec = Math.max(3.0, 6.0 - (player.reflexDashLevel - 1) * 1.0);
  player.reflexDashCooldown = cooldownSec * 60; // 60 ticks per second

  // Trigger high weight screen shake on dash start
  startScreenShake(4, 6);
}

window.addEventListener('keyup', function(event) {
  const key = event.key.toLowerCase();
  activeKeys[key] = false;

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

// Automatically load and render the menu leaderboard in the right panel
async function refreshMenuLeaderboard() {
  if (!leaderboardBody) return;
  
  // Show loading state
  leaderboardBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-secondary); padding: 1.5rem;">Loading scores...</td></tr>';
  
  // Try to load from Supabase
  const data = await loadLeaderboard();
  
  // If Supabase returned data, use it; otherwise fall back to sample data
  if (data && data.length > 0) {
    renderLeaderboard(data);
  } else {
    // Supabase not configured or empty — show sample data
    renderLeaderboard(sampleLeaderboardData);
  }
}

// Restart button on the game-over screen
restartBtn.addEventListener('click', startGame);

// Main Menu button on the game-over screen
menuBtn.addEventListener('click', function() {
  showScreen(startScreen);
  refreshMenuLeaderboard();
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

// Pause System Mechanics
function togglePause() {
  if (!gameState.isRunning || isWaveIntermission) return;

  isPaused = !isPaused;
  const pauseSoundBtn = document.getElementById('pause-sound-btn');
  
  if (isPaused) {
    audio.stopMusic();
    pauseScreen.classList.add('active');
    document.getElementById('pause-icon').textContent = '▶';
    
    // Sync the pause screen sound button text on open
    if (pauseSoundBtn) {
      pauseSoundBtn.textContent = audio.isMuted ? 'Sound: OFF' : 'Sound: ON';
    }
  } else {
    pauseScreen.classList.remove('active');
    document.getElementById('pause-icon').textContent = '⏸';
    audio.resume();
    audio.startMusic();
    animationFrameId = requestAnimationFrame(gameLoop);
  }
}

// Hook up Pause interface buttons
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const pauseSoundBtn = document.getElementById('pause-sound-btn');
const exitBtn = document.getElementById('exit-btn');

if (pauseBtn) {
  pauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePause();
  });
}

if (resumeBtn) {
  resumeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePause();
  });
}

if (pauseSoundBtn) {
  pauseSoundBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isMuted = audio.toggleMute();
    
    // Sync both pause screen sound button and floating sound button visual states
    pauseSoundBtn.textContent = isMuted ? 'Sound: OFF' : 'Sound: ON';
    const mainSoundIcon = document.getElementById('sound-icon');
    const mainSoundBtn = document.getElementById('sound-toggle-btn');
    if (mainSoundIcon && mainSoundBtn) {
      if (isMuted) {
        mainSoundIcon.textContent = '🔇';
        mainSoundBtn.classList.add('muted');
      } else {
        mainSoundIcon.textContent = '🔊';
        mainSoundBtn.classList.remove('muted');
      }
    }
  });
}

if (exitBtn) {
  exitBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isPaused = false;
    gameState.isRunning = false;
    pauseScreen.classList.remove('active');
    document.getElementById('pause-btn').style.display = 'none';
    audio.stopMusic();
    showScreen(startScreen);
    refreshMenuLeaderboard();
  });
}

// Global keydown escape listener to pause
window.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    togglePause();
  }
});

// Initial load of the menu leaderboard on startup
refreshMenuLeaderboard();
