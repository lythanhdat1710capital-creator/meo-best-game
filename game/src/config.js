// Lanternkeeper tuning and palette. One place for every number the game
// balances on, so a wave can be retuned here without touching the logic.

export const VIEW = { width: 960, height: 600 };

export const LANTERN = {
  x: VIEW.width / 2,
  y: VIEW.height / 2,
  radius: 26,
  flames: 5,
  glowRadius: 240,
};

export const PLAYER = {
  radius: 12,
  speed: 270,
  fireInterval: 0.16,
  bulletSpeed: 540,
  bulletRadius: 4,
};

// Enemy kinds: cost is what a wave spends to field one, score is the base
// points a kill pays, speed is pixels per second toward the lantern.
export const ENEMIES = {
  wisp: { hp: 1, speed: 44, radius: 11, score: 10, cost: 1, color: '#8b7cf6' },
  darter: { hp: 1, speed: 98, radius: 9, score: 15, cost: 2, color: '#e06fd8' },
  brute: { hp: 3, speed: 27, radius: 19, score: 30, cost: 3, color: '#e05a5a' },
  splitter: { hp: 2, speed: 40, radius: 13, score: 20, cost: 2, color: '#4fc9b0' },
};

// Which kinds a wave may field, by wave number.
export function kindsForWave(wave) {
  if (wave <= 1) return ['wisp'];
  if (wave === 2) return ['wisp', 'darter'];
  if (wave === 3) return ['wisp', 'darter', 'splitter'];
  return ['wisp', 'darter', 'splitter', 'brute'];
}

export function waveBudget(wave) {
  return 6 + wave * 3;
}

export function spawnInterval(wave) {
  return Math.max(0.55, 1.45 - wave * 0.09);
}

export const POWERUPS = {
  spread: { duration: 12, color: '#ffd166', label: 'SPREAD SHOT' },
  rapid: { duration: 10, color: '#7ce0ff', label: 'RAPID FIRE' },
  shield: { duration: 8, color: '#9dff8a', label: 'LANTERN SHIELD' },
  flame: { duration: 0, color: '#ff9d5c', label: '+1 FLAME' },
};

export const COMBO_WINDOW = 2.5; // seconds a kill stays "recent"
export const COMBO_STEP = 4; // kills per extra multiplier step
export const COMBO_MAX = 5; // highest score multiplier

export const PALETTE = {
  skyTop: '#141232',
  skyBottom: '#05040f',
  hillFar: '#1b1940',
  hillNear: '#100e2a',
  ground: '#0a0918',
  gold: '#ffd166',
  goldSoft: '#ffe9a8',
  ember: '#ff9d5c',
  ink: '#e8e6ff',
  dim: '#8f8cb8',
  danger: '#ff6b6b',
};
