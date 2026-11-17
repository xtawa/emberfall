// entities.js — every moving thing in the arena: the lantern-wisp player,
// the shades and their kin, the Gloom Herald boss, embers, orbs, particles
// and floating score text. Factories build them, update functions move them,
// and the combat helpers (igniteEnemy, damagePlayer) are the game's verbs.

import {
  ARENA_WIDTH, ARENA_HEIGHT, ARENA_MARGIN,
  PLAYER, ENEMY_KINDS, ORB, SPITTER, BOSS,
  COMBO_WINDOW, COMBO_MAX_MULT, SCORE,
} from './config.js';

export function createPlayer() {
  return {
    x: ARENA_WIDTH / 2,
    y: ARENA_HEIGHT / 2,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    speed: PLAYER.speed,
    dashCooldownMax: PLAYER.dashCooldown,
    dashCd: 0,
    dashTime: 0,
    dashDir: { x: 1, y: 0 },
    invuln: 0,
    magnetRadius: PLAYER.magnetRadius,
    emberValue: 1,
    hasNova: false,
    novaCd: 0,
    novaCooldownMax: PLAYER.novaCooldown,
    secondWind: false,
    secondWindUsed: false,
    flicker: 0,
  };
}

function randomEdgeSpawn() {
  const side = Math.floor(Math.random() * 4);
  const m = ARENA_MARGIN + 16;
  if (side === 0) return { x: m + Math.random() * (ARENA_WIDTH - 2 * m), y: m };
  if (side === 1) return { x: m + Math.random() * (ARENA_WIDTH - 2 * m), y: ARENA_HEIGHT - m };
  if (side === 2) return { x: m, y: m + Math.random() * (ARENA_HEIGHT - 2 * m) };
  return { x: ARENA_WIDTH - m, y: m + Math.random() * (ARENA_HEIGHT - 2 * m) };
}

export function spawnEnemy(game, kind, x = null, y = null) {
  const def = ENEMY_KINDS[kind];
  const pos = x === null ? randomEdgeSpawn() : { x, y };
  const enemy = {
    kind,
    x: pos.x,
    y: pos.y,
    vx: 0,
    vy: 0,
    radius: def.radius,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed * (0.9 + Math.random() * 0.2),
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 2 + Math.random() * 2,
    shootTimer: SPITTER.shootEvery * (0.5 + Math.random() * 0.5),
    spawnTimer: BOSS.spawnEvery,
    burstTimer: BOSS.burstEvery * 0.6,
    flash: 0,
    angle: 0,
  };
  game.enemies.push(enemy);
  return enemy;
}

export function spawnBoss(game) {
  const boss = spawnEnemy(game, 'boss', ARENA_WIDTH / 2, ARENA_MARGIN + 70);
  game.boss = boss;
  return boss;
}

export function spawnEmber(game, x, y, value) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 40 + Math.random() * 90;
  game.embers.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    value,
    life: 14,
    bob: Math.random() * Math.PI * 2,
  });
}

export function spawnParticles(game, x, y, color, count, speed = 160, size = 3) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    game.particles.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: 0.35 + Math.random() * 0.45,
      maxLife: 0.8,
      size: size * (0.6 + Math.random() * 0.8),
      color,
    });
  }
}

export function addText(game, x, y, text, color) {
  game.texts.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// The combo multiplier for the next ignition, from the current chain.
export function comboMultiplier(game) {
  return Math.min(game.combo, COMBO_MAX_MULT);
}

// A dash (or a nova) catches an enemy: it takes one ignition of damage.
// A kill bursts into embers, raises the combo and pays score.
export function igniteEnemy(game, enemy, cause) {
  enemy.hp -= 1;
  enemy.flash = 0.12;
  if (enemy.hp > 0) {
    spawnParticles(game, enemy.x, enemy.y, '#f472b6', 6, 120, 2.5);
    return false;
  }
  const def = ENEMY_KINDS[enemy.kind];
  game.combo += 1;
  game.comboTimer = COMBO_WINDOW;
  const mult = comboMultiplier(game);
  const gained = def.score * mult;
  game.score += gained;
  game.stats.ignitions += 1;
  addText(game, enemy.x, enemy.y - enemy.radius, `+${gained}`, '#ffe9b0');
  if (game.combo >= 3) {
    addText(game, enemy.x, enemy.y - enemy.radius - 20, `x${mult} COMBO`, '#7dd3fc');
  }
  spawnParticles(game, enemy.x, enemy.y, '#ffb347', 16, 220, 3.5);
  spawnParticles(game, enemy.x, enemy.y, '#8b5cf6', 8, 140, 3);
  for (let i = 0; i < def.embers; i += 1) {
    spawnEmber(game, enemy.x, enemy.y, game.player.emberValue);
  }
  game.audio.playIgnite(game.combo);
  game.shake = Math.min(10, game.shake + 3);
  if (enemy.kind === 'boss') {
    game.score += SCORE.bossKill;
    game.boss = null;
    spawnParticles(game, enemy.x, enemy.y, '#c026d3', 40, 320, 4);
    game.shake = 14;
  }
  game.enemies.splice(game.enemies.indexOf(enemy), 1);
  return true;
}

// An enemy or an orb reaches the player. Second Wind saves one fatal hit.
export function damagePlayer(game, amount) {
  const player = game.player;
  if (player.invuln > 0 || game.state !== 'playing') return;
  player.hp -= amount;
  player.invuln = PLAYER.invulnTime;
  game.combo = 0;
  game.comboTimer = 0;
  game.audio.playHit();
  game.shake = Math.min(12, game.shake + 6);
  spawnParticles(game, player.x, player.y, '#fb7185', 14, 200, 3);
  if (player.hp <= 0 && player.secondWind && !player.secondWindUsed) {
    player.secondWindUsed = true;
    player.hp = 1;
    player.invuln = 2;
    addText(game, player.x, player.y - 30, 'SECOND WIND!', '#7dd3fc');
    novaBlast(game, true);
    return;
  }
  if (player.hp <= 0) {
    player.hp = 0;
    game.state = 'gameover';
    game.stateEnteredAt = game.time;
    game.audio.playGameOver();
  }
}

// The nova blast: ignites every shade within radius. `free` skips the
// cooldown (Second Wind's rescue blast).
export function novaBlast(game, free = false) {
  const player = game.player;
  if (!free) {
    if (!player.hasNova || player.novaCd > 0) return false;
    player.novaCd = player.novaCooldownMax;
  }
  game.audio.playNova();
  game.shake = Math.min(12, game.shake + 5);
  spawnParticles(game, player.x, player.y, '#7dd3fc', 26, 300, 3.5);
  const caught = game.enemies.filter(
    (e) => distance(e.x, e.y, player.x, player.y) <= PLAYER.novaRadius + e.radius,
  );
  caught.forEach((e) => igniteEnemy(game, e, 'nova'));
  return true;
}

export function tryDash(game, aimX, aimY) {
  const player = game.player;
  if (player.dashCd > 0 || player.dashTime > 0) return false;
  const dx = aimX - player.x;
  const dy = aimY - player.y;
  const len = Math.hypot(dx, dy) || 1;
  player.dashDir = { x: dx / len, y: dy / len };
  player.dashTime = PLAYER.dashTime;
  player.dashCd = player.dashCooldownMax;
  player.vx = player.dashDir.x * PLAYER.dashSpeed;
  player.vy = player.dashDir.y * PLAYER.dashSpeed;
  game.stats.dashes += 1;
  game.audio.playDash();
  spawnParticles(game, player.x, player.y, '#ffd97a', 8, 120, 2.5);
  return true;
}

export function updatePlayer(game, dt, move, aim) {
  const player = game.player;
  player.flicker += dt;
  if (player.dashCd > 0) player.dashCd -= dt;
  if (player.novaCd > 0) player.novaCd -= dt;
  if (player.invuln > 0) player.invuln -= dt;

  if (player.dashTime > 0) {
    player.dashTime -= dt;
    player.vx = player.dashDir.x * PLAYER.dashSpeed;
    player.vy = player.dashDir.y * PLAYER.dashSpeed;
    // Dashing through a shade ignites it; dashing through an orb shatters it.
    [...game.enemies].forEach((enemy) => {
      if (distance(enemy.x, enemy.y, player.x, player.y) < enemy.radius + player.radius + 4) {
        igniteEnemy(game, enemy, 'dash');
      }
    });
    [...game.orbs].forEach((orb) => {
      if (distance(orb.x, orb.y, player.x, player.y) < orb.radius + player.radius + 4) {
        game.orbs.splice(game.orbs.indexOf(orb), 1);
        game.score += SCORE.orbShatter;
        addText(game, orb.x, orb.y, `+${SCORE.orbShatter}`, '#f472b6');
        spawnParticles(game, orb.x, orb.y, '#f472b6', 8, 160, 2.5);
        game.audio.playOrbShatter();
      }
    });
  } else {
    const targetVx = move.x * player.speed;
    const targetVy = move.y * player.speed;
    const accel = 14;
    player.vx += (targetVx - player.vx) * Math.min(1, accel * dt);
    player.vy += (targetVy - player.vy) * Math.min(1, accel * dt);
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;
  const m = ARENA_MARGIN + player.radius;
  player.x = Math.max(m, Math.min(ARENA_WIDTH - m, player.x));
  player.y = Math.max(m, Math.min(ARENA_HEIGHT - m, player.y));
  player.aim = aim;
}

function steerToward(enemy, tx, ty, dt, wobble = 0) {
  const dx = tx - enemy.x;
  const dy = ty - enemy.y;
  const len = Math.hypot(dx, dy) || 1;
  let angle = Math.atan2(dy, dx) + wobble;
  enemy.vx = Math.cos(angle) * enemy.speed;
  enemy.vy = Math.sin(angle) * enemy.speed;
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;
  enemy.angle = angle;
}

export function updateEnemies(game, dt) {
  const player = game.player;
  [...game.enemies].forEach((enemy) => {
    if (enemy.flash > 0) enemy.flash -= dt;
    enemy.wobble += enemy.wobbleSpeed * dt;
    const dist = distance(enemy.x, enemy.y, player.x, player.y);

    if (enemy.kind === 'shade' || enemy.kind === 'bulwark') {
      steerToward(enemy, player.x, player.y, dt);
    } else if (enemy.kind === 'wisp') {
      const wobble = Math.sin(enemy.wobble) * 0.9;
      steerToward(enemy, player.x, player.y, dt, wobble);
    } else if (enemy.kind === 'spitter') {
      if (dist > SPITTER.keepClose) {
        steerToward(enemy, player.x, player.y, dt);
      } else if (dist < SPITTER.keepAway) {
        steerToward(enemy, player.x + (enemy.x - player.x), player.y + (enemy.y - player.y), dt);
      } else {
        // Strafe sideways at mid range, staying unpredictable.
        const side = Math.sin(enemy.wobble) > 0 ? 1 : -1;
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const len = Math.hypot(dx, dy) || 1;
        enemy.vx = (-dy / len) * side * enemy.speed;
        enemy.vy = (dx / len) * side * enemy.speed;
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
      }
      enemy.shootTimer -= dt;
      if (enemy.shootTimer <= 0 && dist < 520) {
        enemy.shootTimer = SPITTER.shootEvery;
        const len = Math.hypot(player.x - enemy.x, player.y - enemy.y) || 1;
        game.orbs.push({
          x: enemy.x, y: enemy.y,
          vx: ((player.x - enemy.x) / len) * ORB.speed,
          vy: ((player.y - enemy.y) / len) * ORB.speed,
          radius: ORB.radius,
          life: 8,
        });
        spawnParticles(game, enemy.x, enemy.y, '#a3e635', 5, 90, 2);
      }
    } else if (enemy.kind === 'boss') {
      steerToward(enemy, player.x, player.y, dt);
      enemy.spawnTimer -= dt;
      if (enemy.spawnTimer <= 0) {
        enemy.spawnTimer = BOSS.spawnEvery;
        spawnEnemy(game, 'shade', enemy.x, enemy.y);
        spawnEnemy(game, 'shade', enemy.x, enemy.y);
        addText(game, enemy.x, enemy.y - enemy.radius - 8, 'The Herald calls shades!', '#f0abfc');
      }
      enemy.burstTimer -= dt;
      if (enemy.burstTimer <= 0) {
        enemy.burstTimer = BOSS.burstEvery;
        for (let i = 0; i < BOSS.burstOrbs; i += 1) {
          const angle = (i / BOSS.burstOrbs) * Math.PI * 2 + enemy.wobble;
          game.orbs.push({
            x: enemy.x, y: enemy.y,
            vx: Math.cos(angle) * ORB.speed,
            vy: Math.sin(angle) * ORB.speed,
            radius: ORB.radius,
            life: 8,
          });
        }
        spawnParticles(game, enemy.x, enemy.y, '#c026d3', 18, 200, 3);
      }
    }

    const m = ARENA_MARGIN + enemy.radius * 0.5;
    enemy.x = Math.max(m, Math.min(ARENA_WIDTH - m, enemy.x));
    enemy.y = Math.max(m, Math.min(ARENA_HEIGHT - m, enemy.y));

    // Touching the player while it is not dashing hurts the player.
    if (player.dashTime <= 0 && dist < enemy.radius + player.radius - 2) {
      damagePlayer(game, 1);
    }
  });
}

export function updateOrbs(game, dt) {
  [...game.orbs].forEach((orb) => {
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt;
    orb.life -= dt;
    const m = ARENA_MARGIN;
    if (orb.x < m || orb.x > ARENA_WIDTH - m || orb.y < m || orb.y > ARENA_HEIGHT - m) {
      orb.life = 0;
    }
    if (orb.life <= 0) {
      game.orbs.splice(game.orbs.indexOf(orb), 1);
      return;
    }
    const player = game.player;
    if (player.dashTime <= 0 && distance(orb.x, orb.y, player.x, player.y) < orb.radius + player.radius - 2) {
      game.orbs.splice(game.orbs.indexOf(orb), 1);
      damagePlayer(game, 1);
    }
  });
}

export function updateEmbers(game, dt) {
  const player = game.player;
  [...game.embers].forEach((ember) => {
    ember.life -= dt;
    ember.bob += dt * 4;
    const dist = distance(ember.x, ember.y, player.x, player.y);
    if (dist < player.magnetRadius) {
      const pull = 420 * (1 - dist / (player.magnetRadius + 1));
      ember.vx += ((player.x - ember.x) / (dist || 1)) * pull * dt * 4;
      ember.vy += ((player.y - ember.y) / (dist || 1)) * pull * dt * 4;
    } else {
      ember.vx *= 0.96;
      ember.vy *= 0.96;
    }
    ember.x += ember.vx * dt;
    ember.y += ember.vy * dt;
    if (dist < player.radius + 10) {
      game.embers.splice(game.embers.indexOf(ember), 1);
      game.embersCollected += 1;
      const gained = Math.round(SCORE.emberPickup * ember.value);
      game.score += gained;
      addText(game, ember.x, ember.y - 8, `+${gained}`, '#ffb347');
      spawnParticles(game, ember.x, ember.y, '#ffb347', 4, 100, 2);
      game.audio.playPickup();
      return;
    }
    if (ember.life <= 0) game.embers.splice(game.embers.indexOf(ember), 1);
  });
}

export function updateParticles(game, dt) {
  [...game.particles].forEach((p) => {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    if (p.life <= 0) game.particles.splice(game.particles.indexOf(p), 1);
  });
}

export function updateTexts(game, dt) {
  [...game.texts].forEach((t) => {
    t.life -= dt;
    t.y -= 34 * dt;
    if (t.life <= 0) game.texts.splice(game.texts.indexOf(t), 1);
  });
}
