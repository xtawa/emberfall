// config.js — every tuning number, colour and wave of EMBERFALL in one place.
// Nothing here imports anything: every other module reads from this file.

export const ARENA_WIDTH = 960;
export const ARENA_HEIGHT = 600;
export const ARENA_MARGIN = 28;

export const PALETTE = {
  background: '#0b0e1e',
  backgroundEdge: '#141a33',
  arenaLine: '#2a3560',
  arenaGlow: '#3b4a8a',
  star: '#cdd6ff',
  playerCore: '#ffd97a',
  playerGlow: '#ff9d2e',
  playerRing: '#ffe9b0',
  shadeBody: '#241b3a',
  shadeGlow: '#8b5cf6',
  shadeEye: '#e9d5ff',
  wispBody: '#1a2b3d',
  wispGlow: '#22d3ee',
  bulwarkBody: '#2e1a2e',
  bulwarkGlow: '#f472b6',
  spitterBody: '#1c2b1a',
  spitterGlow: '#a3e635',
  bossBody: '#2a0f2e',
  bossGlow: '#c026d3',
  bossEye: '#f0abfc',
  orb: '#f472b6',
  orbGlow: '#ec4899',
  ember: '#ffb347',
  emberGlow: '#ff7b1c',
  particle: '#ffcf6e',
  textScore: '#ffe9b0',
  textCombo: '#7dd3fc',
  textDamage: '#fb7185',
  hudHeart: '#fb7185',
  hudHeartEmpty: '#3f3f56',
  hudText: '#e6e9ff',
  hudDim: '#8b93b8',
  dashReady: '#ffd97a',
  dashCool: '#5b6285',
  novaReady: '#7dd3fc',
  titleGold: '#ffd97a',
  cardBack: '#171d38',
  cardEdge: '#3b4a8a',
  cardPick: '#ff9d2e',
};

// Player tuning.
export const PLAYER = {
  radius: 14,
  speed: 235,
  maxHp: 3,
  dashSpeed: 980,
  dashTime: 0.17,
  dashCooldown: 1.5,
  invulnTime: 1.1,
  magnetRadius: 90,
  novaRadius: 175,
  novaCooldown: 9,
};

// Combo: ignitions chained inside this window raise the multiplier.
export const COMBO_WINDOW = 3.0;
export const COMBO_MAX_MULT = 8;

// Scoring.
export const SCORE = {
  ignition: 10,
  emberPickup: 5,
  orbShatter: 5,
  waveClearBase: 50,
  bossKill: 500,
};

// Enemy kinds. speed is px/s, hp is ignitions to kill, score is the ember
// count a kill drops (embers are worth SCORE.emberPickup each on pickup).
export const ENEMY_KINDS = {
  shade:   { radius: 14, speed: 64,  hp: 1, embers: 3, score: 10 },
  wisp:    { radius: 10, speed: 128, hp: 1, embers: 2, score: 10 },
  bulwark: { radius: 22, speed: 38,  hp: 2, embers: 5, score: 20 },
  spitter: { radius: 13, speed: 48,  hp: 1, embers: 3, score: 15 },
  boss:    { radius: 34, speed: 42,  hp: 5, embers: 12, score: 100 },
};

export const ORB = { radius: 6, speed: 95 };
export const SPITTER = { shootEvery: 2.9, keepAway: 200, keepClose: 300 };
export const BOSS = { spawnEvery: 4.2, burstEvery: 5.0, burstOrbs: 10 };

// One row per wave: how many of each kind join the spawn queue.
// Wave 10 is the boss wave: the Herald arrives with a small escort, then
// spawns its own shades while it lives.
export const WAVE_TABLE = [
  { shade: 5,  wisp: 0, bulwark: 0, spitter: 0, boss: 0 },
  { shade: 7,  wisp: 2, bulwark: 0, spitter: 0, boss: 0 },
  { shade: 8,  wisp: 4, bulwark: 0, spitter: 0, boss: 0 },
  { shade: 8,  wisp: 4, bulwark: 2, spitter: 0, boss: 0 },
  { shade: 10, wisp: 5, bulwark: 2, spitter: 1, boss: 0 },
  { shade: 10, wisp: 6, bulwark: 3, spitter: 2, boss: 0 },
  { shade: 12, wisp: 7, bulwark: 3, spitter: 2, boss: 0 },
  { shade: 12, wisp: 8, bulwark: 4, spitter: 3, boss: 0 },
  { shade: 14, wisp: 9, bulwark: 4, spitter: 3, boss: 0 },
  { shade: 6,  wisp: 0, bulwark: 0, spitter: 0, boss: 1 },
];

export const TOTAL_WAVES = WAVE_TABLE.length;

// Spawn pacing: seconds between spawns, tightening as waves progress.
export function spawnIntervalFor(wave) {
  return Math.max(0.55, 1.25 - wave * 0.07);
}

// No more than this many enemies alive at once; the queue waits.
export const MAX_ALIVE_ENEMIES = 14;
