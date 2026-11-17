// upgrades.js — the seven upgrades of EMBERFALL and the choice screen
// between waves. Three distinct upgrades are rolled after each wave; the
// player picks one with keys 1-3 or by clicking its card. One-time upgrades
// (Second Wind, Nova) leave the pool once taken.

export const UPGRADE_POOL = [
  {
    id: 'swift',
    name: 'Swift Boots',
    icon: '»',
    desc: '+12% move speed. Outrun the dark a little longer.',
    once: false,
    apply(game) { game.player.speed *= 1.12; },
  },
  {
    id: 'quickening',
    name: 'Quickening',
    icon: '↯',
    desc: 'Dash cooldown −18%. Dash more, fear less.',
    once: false,
    apply(game) { game.player.dashCooldownMax *= 0.82; },
  },
  {
    id: 'magnet',
    name: 'Magnet',
    icon: '◎',
    desc: '+60% ember pickup radius. The embers come to you.',
    once: false,
    apply(game) { game.player.magnetRadius *= 1.6; },
  },
  {
    id: 'aegis',
    name: 'Aegis',
    icon: '♥',
    desc: '+1 max HP and heal 1. A second skin of light.',
    once: false,
    apply(game) {
      game.player.maxHp += 1;
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 1);
    },
  },
  {
    id: 'nova',
    name: 'Nova',
    icon: '✦',
    desc: 'Press E: a blast that ignites every shade nearby. 9s cooldown.',
    once: true,
    apply(game) { game.player.hasNova = true; },
  },
  {
    id: 'greed',
    name: 'Ember Greed',
    icon: '◆',
    desc: '+25% ember value. Every spark is worth more.',
    once: false,
    apply(game) { game.player.emberValue *= 1.25; },
  },
  {
    id: 'secondwind',
    name: 'Second Wind',
    icon: '✚',
    desc: 'Survive one fatal hit per run, and answer it with a nova.',
    once: true,
    apply(game) { game.player.secondWind = true; },
  },
];

export function availableUpgrades(game) {
  return UPGRADE_POOL.filter(
    (u) => !u.once || !game.upgradesTaken.includes(u.id),
  );
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function rollUpgradeChoices(game) {
  return shuffle(availableUpgrades(game)).slice(0, 3);
}

export function applyUpgrade(game, upgrade) {
  upgrade.apply(game);
  game.upgradesTaken.push(upgrade.id);
  game.audio.playUpgrade();
}
