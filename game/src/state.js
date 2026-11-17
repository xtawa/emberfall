// state.js — the game's state machine and scorekeeping. The states are
// title, playing, upgrade (choosing between waves), paused, gameover and
// victory. This module owns createGame, resetGame and the per-frame update
// that ties the other modules together.

import { ARENA_WIDTH, ARENA_HEIGHT, COMBO_WINDOW } from './config.js';
import { createPlayer, updatePlayer, updateEnemies, updateOrbs, updateEmbers, updateParticles, updateTexts, novaBlast, tryDash } from './entities.js';
import { startWave, updateSpawning, checkWaveCleared } from './waves.js';
import { rollUpgradeChoices, applyUpgrade } from './upgrades.js';

export const STATES = ['title', 'playing', 'upgrade', 'paused', 'gameover', 'victory'];

export function createGame(canvas, input, audio) {
  const game = {
    canvas,
    input,
    audio,
    state: 'title',
    stateEnteredAt: 0,
    time: 0,
    player: createPlayer(),
    enemies: [],
    orbs: [],
    embers: [],
    particles: [],
    texts: [],
    wave: 0,
    waveActive: false,
    spawnQueue: [],
    spawnTimer: 0,
    waveBanner: null,
    score: 0,
    embersCollected: 0,
    combo: 0,
    comboTimer: 0,
    upgradesTaken: [],
    upgradeChoices: [],
    upgradeCardRects: [],
    boss: null,
    shake: 0,
    stars: makeStars(),
    stats: { ignitions: 0, dashes: 0 },
  };
  return game;
}

function makeStars() {
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({
      x: Math.random() * ARENA_WIDTH,
      y: Math.random() * ARENA_HEIGHT,
      size: 0.6 + Math.random() * 1.6,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.2,
    });
  }
  return stars;
}

export function resetGame(game) {
  game.player = createPlayer();
  game.enemies = [];
  game.orbs = [];
  game.embers = [];
  game.particles = [];
  game.texts = [];
  game.wave = 0;
  game.waveActive = false;
  game.spawnQueue = [];
  game.spawnTimer = 0;
  game.waveBanner = null;
  game.score = 0;
  game.embersCollected = 0;
  game.combo = 0;
  game.comboTimer = 0;
  game.upgradesTaken = [];
  game.upgradeChoices = [];
  game.upgradeCardRects = [];
  game.boss = null;
  game.shake = 0;
  game.stats = { ignitions: 0, dashes: 0 };
}

export function startGame(game) {
  resetGame(game);
  game.state = 'playing';
  game.stateEnteredAt = game.time;
  startWave(game, 1);
}

export function openUpgradeChoice(game) {
  game.upgradeChoices = rollUpgradeChoices(game);
  game.upgradeCardRects = [];
  game.state = 'upgrade';
  game.stateEnteredAt = game.time;
}

export function chooseUpgrade(game, index) {
  const upgrade = game.upgradeChoices[index];
  if (!upgrade) return;
  applyUpgrade(game, upgrade);
  game.upgradeChoices = [];
  game.state = 'playing';
  game.stateEnteredAt = game.time;
  startWave(game, game.wave + 1);
}

export function togglePause(game) {
  if (game.state === 'playing') {
    game.state = 'paused';
    game.stateEnteredAt = game.time;
  } else if (game.state === 'paused') {
    game.state = 'playing';
    game.stateEnteredAt = game.time;
  }
}

// One frame of the playing state: player, enemies, orbs, embers, the
// combo clock, the wave spawner and the wave-clear check, in that order.
export function updateGame(game, dt, move, aim) {
  game.time += dt;
  if (game.comboTimer > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) game.combo = 0;
  }
  if (game.waveBanner) {
    game.waveBanner.life -= dt;
    if (game.waveBanner.life <= 0) game.waveBanner = null;
  }
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 26);

  updatePlayer(game, dt, move, aim);
  updateEnemies(game, dt);
  updateOrbs(game, dt);
  updateEmbers(game, dt);
  updateParticles(game, dt);
  updateTexts(game, dt);
  updateSpawning(game, dt);
  const outcome = checkWaveCleared(game);
  if (outcome === 'victory') {
    game.state = 'victory';
    game.stateEnteredAt = game.time;
    game.audio.playVictory();
  } else if (outcome === 'cleared') {
    openUpgradeChoice(game);
  }
}

// Ambient motion that keeps running on menus: stars twinkle, particles
// drift, floating texts fade, so no screen is ever fully still.
export function updateAmbient(game, dt) {
  game.time += dt;
  game.stars.forEach((s) => { s.twinkle += dt * s.speed; });
  updateParticles(game, dt);
  updateTexts(game, dt);
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 26);
}

export { tryDash, novaBlast };
