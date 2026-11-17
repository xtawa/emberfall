// main.js — EMBERFALL's bootstrap and game loop. It wires the canvas, the
// input and the audio together, routes keys and clicks by game state, and
// runs the fixed-clamped frame update: title and menus idle on ambient
// motion, playing runs the full simulation, pause freezes it.

import { ARENA_WIDTH, ARENA_HEIGHT } from './config.js';
import { Input } from './input.js';
import { AudioSystem } from './audio.js';
import { createGame, startGame, openUpgradeChoice, chooseUpgrade, togglePause, updateGame, updateAmbient, tryDash, novaBlast } from './state.js';
import { drawGame } from './render.js';

const canvas = document.getElementById('game');
canvas.width = ARENA_WIDTH;
canvas.height = ARENA_HEIGHT;

const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const audio = new AudioSystem();
const game = createGame(canvas, input, audio);
// Debug/test handle: lets automated playtests steer the game with real
// input events. Harmless in normal play; the game never reads it itself.
window.__emberfall = game;

// Screenshot helper: ?shot=upgrade | victory | gameover renders that screen
// directly from the game's own state (used only to capture the entry's
// screenshots; normal play never passes this parameter).
const shot = new URLSearchParams(window.location.search).get('shot');
if (shot === 'upgrade' || shot === 'victory' || shot === 'gameover') {
  startGame(game);
  game.score = 1240;
  game.embersCollected = 87;
  game.wave = shot === 'victory' ? 10 : 3;
  game.stats = { ignitions: 42, dashes: 37 };
  game.waveBanner = null;
  if (shot === 'upgrade') {
    // Open the upgrade screen exactly as a wave clear does.
    openUpgradeChoice(game);
  } else {
    game.state = shot;
    game.stateEnteredAt = game.time;
  }
}

// First gesture anywhere unlocks the audio context (and the ambient pad).
function unlockAudio() {
  audio.ensure();
}
window.addEventListener('pointerdown', unlockAudio, { once: false });
window.addEventListener('keydown', unlockAudio, { once: false });

// A click on an upgrade card picks it; anywhere else follows the state's
// own click rule (start, restart).
function clickUpgradeCard(game, x, y) {
  const hit = game.upgradeCardRects.find(
    (rect) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h,
  );
  if (hit) chooseUpgrade(game, hit.index);
  return Boolean(hit);
}

function handleStateInput(game) {
  const state = game.state;

  if (input.justPressed('KeyM')) {
    audio.setMuted(!audio.muted);
  }

  if (state === 'title') {
    if (input.justPressed('Enter') || input.mouse.clicked) {
      audio.ensure();
      audio.playClick();
      startGame(game);
    }
    return;
  }

  if (state === 'playing') {
    if (input.justPressed('KeyP')) togglePause(game);
    if (input.justPressed('KeyE')) novaBlast(game);
    if (input.justPressed('Space') || input.mouse.clicked) {
      tryDash(game, input.mouse.x, input.mouse.y);
    }
    return;
  }

  if (state === 'upgrade') {
    if (input.justPressed('Digit1')) chooseUpgrade(game, 0);
    else if (input.justPressed('Digit2')) chooseUpgrade(game, 1);
    else if (input.justPressed('Digit3')) chooseUpgrade(game, 2);
    else if (input.mouse.clicked) clickUpgradeCard(game, input.mouse.x, input.mouse.y);
    return;
  }

  if (state === 'paused') {
    if (input.justPressed('KeyP') || input.justPressed('Enter')) togglePause(game);
    return;
  }

  if (state === 'gameover' || state === 'victory') {
    // A short guard so the click that ended the run cannot instantly restart it.
    if (game.time - game.stateEnteredAt < 0.6) return;
    if (input.justPressed('Enter') || input.mouse.clicked) {
      audio.playClick();
      startGame(game);
    }
  }
}

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.033, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;

  handleStateInput(game);

  if (game.state === 'playing') {
    updateGame(game, dt, input.moveVector(), { x: input.mouse.x, y: input.mouse.y });
  } else {
    updateAmbient(game, dt);
  }

  drawGame(ctx, game);
  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
