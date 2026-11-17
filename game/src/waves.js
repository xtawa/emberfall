// waves.js — the ten waves of EMBERFALL: building the spawn queue from the
// wave table, feeding enemies in while the wave runs, and recognising when
// a wave is cleared so the game can offer an upgrade or declare victory.

import { WAVE_TABLE, TOTAL_WAVES, MAX_ALIVE_ENEMIES, spawnIntervalFor, SCORE } from './config.js';
import { spawnEnemy, spawnBoss, addText } from './entities.js';

const SPAWN_ORDER = ['boss', 'bulwark', 'spitter', 'wisp', 'shade'];

export function buildWaveQueue(wave) {
  const row = WAVE_TABLE[wave - 1];
  const queue = [];
  SPAWN_ORDER.forEach((kind) => {
    for (let i = 0; i < (row[kind] || 0); i += 1) queue.push(kind);
  });
  return queue;
}

export function startWave(game, wave) {
  game.wave = wave;
  game.spawnQueue = buildWaveQueue(wave);
  game.spawnTimer = 0.8;
  game.waveActive = true;
  game.waveBanner = { text: wave === TOTAL_WAVES ? 'WAVE 10 — THE GLOOM HERALD' : `WAVE ${wave}`, life: 2.2, maxLife: 2.2 };
  if (wave === TOTAL_WAVES) {
    game.audio.playBoss();
  } else {
    game.audio.playHorn();
  }
}

// Feed the queue while the wave runs. The boss is spawned by its own call;
// everything else comes off the queue at the wave's pacing.
export function updateSpawning(game, dt) {
  if (!game.waveActive || game.spawnQueue.length === 0) return;
  game.spawnTimer -= dt;
  if (game.spawnTimer > 0) return;
  if (game.enemies.length >= MAX_ALIVE_ENEMIES) {
    game.spawnTimer = 0.4;
    return;
  }
  game.spawnTimer = spawnIntervalFor(game.wave);
  const kind = game.spawnQueue.shift();
  if (kind === 'boss') spawnBoss(game);
  else spawnEnemy(game, kind);
}

// A wave is cleared when nothing is left to spawn and nothing hostile
// remains on the field. Clearing pays a bonus. Returns null while the wave
// runs, 'cleared' when a wave is done (the state machine opens the upgrade
// choice), or 'victory' after wave 10.
export function checkWaveCleared(game) {
  if (!game.waveActive) return null;
  if (game.spawnQueue.length > 0 || game.enemies.length > 0 || game.orbs.length > 0) return null;
  game.waveActive = false;
  const bonus = SCORE.waveClearBase * game.wave;
  game.score += bonus;
  addText(game, game.player.x, game.player.y - 30, `WAVE CLEAR +${bonus}`, '#7dd3fc');
  if (game.wave >= TOTAL_WAVES) return 'victory';
  return 'cleared';
}
