// render.js — every pixel EMBERFALL draws: the starfield arena, the
// lantern-wisp and the shades, the HUD, and the title, upgrade, pause,
// game-over and victory screens. All visuals are procedural canvas work;
// the game ships no image assets.

import { ARENA_WIDTH, ARENA_HEIGHT, ARENA_MARGIN, PALETTE, PLAYER, TOTAL_WAVES } from './config.js';
import { comboMultiplier } from './entities.js';

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

function centerText(ctx, text, x, y, font, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function glowCircle(ctx, x, y, radius, color, alpha) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGame(ctx, game) {
  ctx.save();
  if (game.shake > 0) {
    const s = game.shake;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawBackground(ctx, game);
  drawEmbers(ctx, game);
  drawOrbs(ctx, game);
  drawEnemies(ctx, game);
  if (game.state !== 'title') drawPlayer(ctx, game);
  drawParticles(ctx, game);
  drawTexts(ctx, game);
  drawWaveBanner(ctx, game);
  ctx.restore();

  drawHUD(ctx, game);
  if (game.state === 'title') drawTitle(ctx, game);
  else if (game.state === 'upgrade') drawUpgrade(ctx, game);
  else if (game.state === 'paused') drawPaused(ctx, game);
  else if (game.state === 'gameover') drawGameOver(ctx, game);
  else if (game.state === 'victory') drawVictory(ctx, game);
}

function drawBackground(ctx, game) {
  const grad = ctx.createLinearGradient(0, 0, 0, ARENA_HEIGHT);
  grad.addColorStop(0, PALETTE.background);
  grad.addColorStop(1, PALETTE.backgroundEdge);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  game.stars.forEach((star) => {
    const alpha = 0.25 + 0.55 * Math.abs(Math.sin(star.twinkle));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = PALETTE.star;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Arena bounds: a double glowing frame.
  ctx.save();
  ctx.strokeStyle = PALETTE.arenaLine;
  ctx.lineWidth = 2;
  ctx.strokeRect(ARENA_MARGIN, ARENA_MARGIN, ARENA_WIDTH - 2 * ARENA_MARGIN, ARENA_HEIGHT - 2 * ARENA_MARGIN);
  ctx.strokeStyle = PALETTE.arenaGlow;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 6;
  ctx.strokeRect(ARENA_MARGIN, ARENA_MARGIN, ARENA_WIDTH - 2 * ARENA_MARGIN, ARENA_HEIGHT - 2 * ARENA_MARGIN);
  ctx.restore();

  // Vignette: the dark closes in at the edges.
  const vig = ctx.createRadialGradient(
    ARENA_WIDTH / 2, ARENA_HEIGHT / 2, ARENA_HEIGHT * 0.35,
    ARENA_WIDTH / 2, ARENA_HEIGHT / 2, ARENA_HEIGHT * 0.85,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(2,3,10,0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
}

function drawPlayer(ctx, game) {
  const p = game.player;
  // The wisp lingers faintly on the end screens; it blinks while invulnerable.
  let saves = 0;
  if (game.state === 'gameover' || game.state === 'victory') {
    ctx.save();
    ctx.globalAlpha = 0.35;
    saves += 1;
  }
  if (p.invuln > 0 && Math.floor(game.time * 12) % 2 === 0) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    saves += 1;
  }
  const flicker = 1 + Math.sin(p.flicker * 9) * 0.12 + Math.sin(p.flicker * 23) * 0.06;
  glowCircle(ctx, p.x, p.y, 74 * flicker, PALETTE.playerGlow, 0.5);
  glowCircle(ctx, p.x, p.y, 34 * flicker, PALETTE.playerCore, 0.75);

  // Aim guide: faint dots from the wisp toward the mouse.
  if (game.state === 'playing' && p.aim) {
    const dx = p.aim.x - p.x;
    const dy = p.aim.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    ctx.save();
    ctx.fillStyle = PALETTE.playerRing;
    for (let i = 1; i <= 3; i += 1) {
      ctx.globalAlpha = 0.5 - i * 0.12;
      ctx.beginPath();
      ctx.arc(p.x + (dx / len) * i * 22, p.y + (dy / len) * i * 22, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Lantern body: a warm core with a bright rim.
  ctx.save();
  ctx.fillStyle = PALETTE.playerCore;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius * flicker, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.playerRing;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius * flicker, 0, Math.PI * 2);
  ctx.stroke();
  // The flame: a small teardrop that leans with movement.
  const lean = Math.max(-3, Math.min(3, p.vx * 0.006));
  ctx.fillStyle = '#fff7dd';
  ctx.beginPath();
  ctx.ellipse(p.x + lean, p.y - 2, 4.5, 7, lean * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Dash cooldown ring: full amber when ready, draining arc while cooling.
  if (game.state === 'playing') {
    const frac = 1 - Math.max(0, p.dashCd) / p.dashCooldownMax;
    ctx.save();
    ctx.strokeStyle = frac >= 1 ? PALETTE.dashReady : PALETTE.dashCool;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  for (let i = 0; i < saves; i += 1) ctx.restore();
}

function drawEnemies(ctx, game) {
  game.enemies.forEach((enemy) => {
    const flash = enemy.flash > 0;
    const body = flash ? '#ffffff' : enemyBodyColor(enemy.kind);
    const glow = enemyGlowColor(enemy.kind);
    glowCircle(ctx, enemy.x, enemy.y, enemy.radius * 2.6, glow, 0.4);

    // A wobbling blob: the radius breathes a little so shades feel alive.
    const breathe = 1 + Math.sin(enemy.wobble * 1.4) * 0.07;
    ctx.save();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius * breathe, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eyes track the player.
    const dx = game.player.x - enemy.x;
    const dy = game.player.y - enemy.y;
    const len = Math.hypot(dx, dy) || 1;
    const lookX = (dx / len) * enemy.radius * 0.25;
    const lookY = (dy / len) * enemy.radius * 0.25;
    const eyeR = enemy.kind === 'boss' ? 5 : 3;
    const spread = enemy.radius * 0.38;
    const eyeColor = enemy.kind === 'boss' ? PALETTE.bossEye : PALETTE.shadeEye;
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(enemy.x - spread + lookX, enemy.y - 3 + lookY, eyeR, 0, Math.PI * 2);
    ctx.arc(enemy.x + spread + lookX, enemy.y - 3 + lookY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Bulwarks show their remaining shell as pips; the boss shows a crown.
    if (enemy.kind === 'bulwark') {
      ctx.fillStyle = PALETTE.bulwarkGlow;
      for (let i = 0; i < enemy.maxHp; i += 1) {
        ctx.globalAlpha = i < enemy.hp ? 1 : 0.25;
        ctx.beginPath();
        ctx.arc(enemy.x - 8 + i * 16, enemy.y - enemy.radius - 9, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (enemy.kind === 'boss') {
      ctx.strokeStyle = PALETTE.bossGlow;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const angle = -Math.PI / 2 + (i - 2) * 0.42;
        const x1 = enemy.x + Math.cos(angle) * enemy.radius * 0.9;
        const y1 = enemy.y + Math.sin(angle) * enemy.radius * 0.9;
        const x2 = enemy.x + Math.cos(angle) * (enemy.radius + 10);
        const y2 = enemy.y + Math.sin(angle) * (enemy.radius + 10);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }
    ctx.restore();
  });
}

function enemyBodyColor(kind) {
  if (kind === 'wisp') return PALETTE.wispBody;
  if (kind === 'bulwark') return PALETTE.bulwarkBody;
  if (kind === 'spitter') return PALETTE.spitterBody;
  if (kind === 'boss') return PALETTE.bossBody;
  return PALETTE.shadeBody;
}

function enemyGlowColor(kind) {
  if (kind === 'wisp') return PALETTE.wispGlow;
  if (kind === 'bulwark') return PALETTE.bulwarkGlow;
  if (kind === 'spitter') return PALETTE.spitterGlow;
  if (kind === 'boss') return PALETTE.bossGlow;
  return PALETTE.shadeGlow;
}

function drawOrbs(ctx, game) {
  game.orbs.forEach((orb) => {
    glowCircle(ctx, orb.x, orb.y, orb.radius * 3, PALETTE.orbGlow, 0.55);
    ctx.save();
    ctx.fillStyle = PALETTE.orb;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff0f6';
    ctx.beginPath();
    ctx.arc(orb.x - 1.5, orb.y - 1.5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawEmbers(ctx, game) {
  game.embers.forEach((ember) => {
    const bob = Math.sin(ember.bob) * 1.5;
    const fade = Math.min(1, ember.life / 2);
    glowCircle(ctx, ember.x, ember.y + bob, 12, PALETTE.emberGlow, 0.5 * fade);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = PALETTE.ember;
    ctx.beginPath();
    ctx.arc(ember.x, ember.y + bob, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath();
    ctx.arc(ember.x - 1, ember.y + bob - 1, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawParticles(ctx, game) {
  game.particles.forEach((p) => {
    const frac = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = frac;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * frac + 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawTexts(ctx, game) {
  game.texts.forEach((t) => {
    const alpha = Math.max(0, t.life / t.maxLife);
    centerText(ctx, t.text, t.x, t.y, `bold 15px ${FONT}`, t.color, alpha);
  });
}

function drawWaveBanner(ctx, game) {
  // Only during play: a wave banner must never bleed onto the upgrade,
  // game-over or victory screens (a fast wave clear could otherwise leave
  // it visible behind the menu text).
  if (game.state !== 'playing' || !game.waveBanner) return;
  const alpha = Math.min(1, game.waveBanner.life / 0.6, (game.waveBanner.maxLife - game.waveBanner.life) / 0.3 + 0.2);
  centerText(ctx, game.waveBanner.text, ARENA_WIDTH / 2, 110, `bold 34px ${FONT}`, PALETTE.titleGold, Math.max(0, Math.min(1, alpha)));
}

function drawHeart(ctx, x, y, filled) {
  ctx.save();
  ctx.fillStyle = filled ? PALETTE.hudHeart : PALETTE.hudHeartEmpty;
  ctx.beginPath();
  ctx.moveTo(x, y + 5);
  ctx.bezierCurveTo(x - 8, y - 3, x - 5, y - 10, x, y - 4);
  ctx.bezierCurveTo(x + 5, y - 10, x + 8, y - 3, x, y + 5);
  ctx.fill();
  ctx.restore();
}

function drawHUD(ctx, game) {
  const p = game.player;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Hearts.
  for (let i = 0; i < p.maxHp; i += 1) {
    drawHeart(ctx, 44 + i * 24, 24, i < p.hp);
  }
  ctx.font = `bold 17px ${FONT}`;
  ctx.fillStyle = PALETTE.hudText;
  ctx.fillText(`WAVE ${Math.max(1, game.wave)} / ${TOTAL_WAVES}`, 44, 52);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = `15px ${FONT}`;
  ctx.fillText(`SCORE ${game.score}`, 44, 76);
  ctx.fillText(`EMBERS ${game.embersCollected}`, 44, 98);

  // Combo meter, top centre.
  if (game.combo >= 2) {
    const mult = comboMultiplier(game);
    const frac = Math.max(0, game.comboTimer / 3);
    centerText(ctx, `COMBO x${mult}`, ARENA_WIDTH / 2, 26, `bold 20px ${FONT}`, PALETTE.textCombo);
    ctx.save();
    ctx.fillStyle = '#232a4a';
    ctx.fillRect(ARENA_WIDTH / 2 - 60, 40, 120, 6);
    ctx.fillStyle = PALETTE.textCombo;
    ctx.fillRect(ARENA_WIDTH / 2 - 60, 40, 120 * frac, 6);
    ctx.restore();
  }

  // Dash and nova readiness, top right.
  ctx.textAlign = 'right';
  ctx.font = `bold 15px ${FONT}`;
  const dashReady = p.dashCd <= 0;
  ctx.fillStyle = dashReady ? PALETTE.dashReady : PALETTE.dashCool;
  ctx.fillText(dashReady ? 'DASH READY  [SPACE]' : `DASH ${p.dashCd.toFixed(1)}s`, ARENA_WIDTH - 44, 24);
  if (p.hasNova) {
    ctx.fillStyle = p.novaCd <= 0 ? PALETTE.novaReady : PALETTE.dashCool;
    ctx.fillText(p.novaCd <= 0 ? 'NOVA READY  [E]' : `NOVA ${p.novaCd.toFixed(1)}s`, ARENA_WIDTH - 44, 48);
  }
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = `13px ${FONT}`;
  ctx.fillText('P pause · M mute', ARENA_WIDTH - 44, 74);

  // Boss health bar while the Herald lives.
  if (game.boss) {
    const boss = game.boss;
    const w = 320;
    const x = (ARENA_WIDTH - w) / 2;
    const y = ARENA_HEIGHT - 34;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillStyle = PALETTE.bossEye;
    ctx.fillText('GLOOM HERALD', ARENA_WIDTH / 2, y - 10);
    ctx.fillStyle = '#2a0f2e';
    ctx.fillRect(x, y, w, 10);
    ctx.fillStyle = PALETTE.bossGlow;
    ctx.fillRect(x, y, (w * Math.max(0, boss.hp)) / boss.maxHp, 10);
    ctx.strokeStyle = PALETTE.bossEye;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, 10);
    ctx.restore();
  }
  ctx.restore();
}

function dimScreen(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 7, 18, 0.72)';
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  ctx.restore();
}

function drawTitle(ctx, game) {
  dimScreen(ctx);
  glowCircle(ctx, ARENA_WIDTH / 2, 190, 150, PALETTE.playerGlow, 0.35);
  centerText(ctx, 'EMBERFALL', ARENA_WIDTH / 2, 168, `bold 64px ${FONT}`, PALETTE.titleGold);
  centerText(ctx, 'A lone lantern-wisp against the dark.', ARENA_WIDTH / 2, 216, `20px ${FONT}`, PALETTE.hudText);
  centerText(ctx, 'Dash through shades to set them alight. Chain ignitions for combos,', ARENA_WIDTH / 2, 262, `16px ${FONT}`, PALETTE.hudDim);
  centerText(ctx, 'gather the embers, choose your upgrades — and survive all 10 waves.', ARENA_WIDTH / 2, 286, `16px ${FONT}`, PALETTE.hudDim);
  centerText(ctx, 'WASD / arrows — move      Mouse — aim      SPACE / click — dash', ARENA_WIDTH / 2, 336, `16px ${FONT}`, PALETTE.hudText);
  centerText(ctx, 'E — nova (once learned)      P — pause      M — mute', ARENA_WIDTH / 2, 362, `16px ${FONT}`, PALETTE.hudText);
  centerText(ctx, '3 hits and the light goes out. The Gloom Herald waits in wave 10.', ARENA_WIDTH / 2, 398, `15px ${FONT}`, PALETTE.textDamage);
  const pulse = 0.65 + 0.35 * Math.sin(game.time * 3);
  centerText(ctx, '▶  PRESS ENTER OR CLICK TO BEGIN', ARENA_WIDTH / 2, 466, `bold 22px ${FONT}`, PALETTE.playerCore, pulse);
}

function drawUpgrade(ctx, game) {
  dimScreen(ctx);
  centerText(ctx, `WAVE ${game.wave} CLEARED`, ARENA_WIDTH / 2, 92, `bold 30px ${FONT}`, PALETTE.titleGold);
  centerText(ctx, 'Choose one upgrade — press 1, 2 or 3, or click a card.', ARENA_WIDTH / 2, 128, `17px ${FONT}`, PALETTE.hudText);
  const cardW = 250;
  const cardH = 220;
  const gap = 26;
  const totalW = cardW * 3 + gap * 2;
  const startX = (ARENA_WIDTH - totalW) / 2;
  const y = 170;
  game.upgradeCardRects = [];
  game.upgradeChoices.forEach((upgrade, i) => {
    const x = startX + i * (cardW + gap);
    game.upgradeCardRects.push({ x, y, w: cardW, h: cardH, index: i });
    ctx.save();
    ctx.fillStyle = PALETTE.cardBack;
    ctx.strokeStyle = PALETTE.cardEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 12);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = PALETTE.cardPick;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 5, cardW - 10, cardH - 10, 8);
    ctx.stroke();
    ctx.globalAlpha = 1;
    centerText(ctx, upgrade.icon, x + cardW / 2, y + 52, `bold 44px ${FONT}`, PALETTE.playerCore);
    centerText(ctx, upgrade.name, x + cardW / 2, y + 106, `bold 21px ${FONT}`, PALETTE.hudText);
    wrapText(ctx, upgrade.desc, x + cardW / 2, y + 142, cardW - 36, 17, PALETTE.hudDim);
    centerText(ctx, `[ ${i + 1} ]`, x + cardW / 2, y + cardH - 26, `bold 16px ${FONT}`, PALETTE.dashReady);
    ctx.restore();
  });
  centerText(ctx, `Score ${game.score} · Embers ${game.embersCollected} · Next: wave ${game.wave + 1}`, ARENA_WIDTH / 2, 440, `15px ${FONT}`, PALETTE.hudDim);
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight, color) {
  const font = `${lineHeight - 2}px ${FONT}`;
  // Measure with the same font that gets drawn: centerText restores the
  // previous font after each call, so without this the measurement would
  // use the 10px default and long descriptions would overflow the card.
  ctx.font = font;
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  lines.forEach((l, i) => centerText(ctx, l, cx, y + i * lineHeight, font, color));
}

function drawPaused(ctx, game) {
  dimScreen(ctx);
  centerText(ctx, 'PAUSED', ARENA_WIDTH / 2, 260, `bold 44px ${FONT}`, PALETTE.hudText);
  centerText(ctx, 'Press P to keep playing', ARENA_WIDTH / 2, 316, `18px ${FONT}`, PALETTE.hudDim);
  centerText(ctx, `Wave ${game.wave} · Score ${game.score}`, ARENA_WIDTH / 2, 348, `16px ${FONT}`, PALETTE.hudDim);
}

function drawGameOver(ctx, game) {
  dimScreen(ctx);
  centerText(ctx, 'THE LIGHT GOES OUT', ARENA_WIDTH / 2, 210, `bold 46px ${FONT}`, PALETTE.textDamage);
  centerText(ctx, `The dark takes the arena on wave ${game.wave}.`, ARENA_WIDTH / 2, 262, `19px ${FONT}`, PALETTE.hudText);
  centerText(ctx, `SCORE  ${game.score}`, ARENA_WIDTH / 2, 312, `bold 26px ${FONT}`, PALETTE.titleGold);
  centerText(ctx, `Embers gathered ${game.embersCollected} · Shades ignited ${game.stats.ignitions} · Dashes ${game.stats.dashes}`, ARENA_WIDTH / 2, 348, `16px ${FONT}`, PALETTE.hudDim);
  const pulse = 0.65 + 0.35 * Math.sin(game.time * 3);
  centerText(ctx, '▶  PRESS ENTER OR CLICK TO TRY AGAIN', ARENA_WIDTH / 2, 420, `bold 20px ${FONT}`, PALETTE.playerCore, pulse);
}

function drawVictory(ctx, game) {
  dimScreen(ctx);
  glowCircle(ctx, ARENA_WIDTH / 2, 200, 180, PALETTE.playerGlow, 0.4);
  centerText(ctx, 'DAWN BREAKS', ARENA_WIDTH / 2, 190, `bold 52px ${FONT}`, PALETTE.titleGold);
  centerText(ctx, 'The Gloom Herald is ash. Ten waves, one little light — still burning.', ARENA_WIDTH / 2, 244, `19px ${FONT}`, PALETTE.hudText);
  centerText(ctx, `FINAL SCORE  ${game.score}`, ARENA_WIDTH / 2, 300, `bold 28px ${FONT}`, PALETTE.playerCore);
  centerText(ctx, `Embers gathered ${game.embersCollected} · Shades ignited ${game.stats.ignitions} · Dashes ${game.stats.dashes}`, ARENA_WIDTH / 2, 338, `16px ${FONT}`, PALETTE.hudDim);
  const pulse = 0.65 + 0.35 * Math.sin(game.time * 3);
  centerText(ctx, '▶  PRESS ENTER OR CLICK TO PLAY AGAIN', ARENA_WIDTH / 2, 410, `bold 20px ${FONT}`, PALETTE.playerCore, pulse);
}
