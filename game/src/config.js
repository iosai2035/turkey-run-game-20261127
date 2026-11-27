// Gobble & Go — every tuning number, stage and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 618 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Pixels of scroll that count as one metre of escape. */
export const PX_PER_METRE = 50;

export const TURKEY = {
  /** Fixed horizontal spot; the world scrolls past it. */
  x: 250,
  width: 64,
  height: 58,
  duckHeight: 34,
  gravity: 2600,
  // A full jump rises 212 px and lasts 0.81 s: high enough to stay above the
  // tallest hazard (the oven, 88 px) for the whole time it passes underneath.
  jumpSpeed: 1050,
  doubleJumpSpeed: 950,
  coyoteTime: 0.1,
  jumpBuffer: 0.12,
  /** Seconds of mercy after a hit before the next one can land. */
  invulnerable: 1.6,
};

export const RUN = {
  startSpeed: 330,
  speedGain: 7,
  maxSpeed: 700,
  /** The farmer closes this many metres a second just by being relentless. */
  farmerCreep: 0.12,
  /** Gap in metres when the farmer stops to look around ("searching"). */
  searchGap: 21,
  searchTime: 1.3,
  sprintTime: 2.2,
  sprintCreep: 0.9,
  /** A hit lets the farmer close this many metres at once. */
  hitCost: 4,
  cornGain: 2,
  featherGain: 3,
};

export const LIVES = 3;

/** One stage is a stretch of the escape: farmyard, cornfield, kitchen. */
export const STAGES = [
  { name: 'THE FARMYARD', target: 520, sky: ['#f7c873', '#f2a65a', '#e07b39'], ground: '#8a5a2e', grass: '#c98f3d' },
  { name: 'THE CORNFIELD', target: 560, sky: ['#e8935a', '#d96f3f', '#b44a2e'], ground: '#6e4520', grass: '#a86f2c' },
  { name: 'THE KITCHEN', target: 580, sky: ['#7a4a3a', '#5e352c', '#3f221d'], ground: '#4a2c22', grass: '#7a4a34' },
];

export const HAZARD = {
  /** Minimum gap between hazard groups, in pixels, scaled by speed at spawn time.
   * A full jump covers about 0.81 s of travel, so groups stay further apart than
   * that: every landing must have clear ground — and time — to stand on. */
  minGapPx: 520,
  gapPerSpeed: 1.0,
  /** Hitboxes are forgiving: this many pixels are shaved off every side. */
  shrink: 7,
};

export const PICKUP = {
  cornPoints: 10,
  featherPoints: 50,
  cornArc: 3,
};

/** Seconds of play before the farmer's "search" behaviour can first trigger. */
export const FARMER = {
  startGap: 13,
  closeAlert: 5,
  caughtGap: 0,
};

export const PALETTE = {
  backdrop: '#241812',
  skyTop: '#f7c873',
  skyMid: '#f2a65a',
  skyBot: '#e07b39',
  sun: '#fff3c4',
  cloud: 'rgba(255, 244, 214, 0.85)',
  hillFar: '#b97a3f',
  hillNear: '#96582c',
  ground: '#8a5a2e',
  groundDark: '#6e4520',
  dirt: '#a9713a',
  fence: '#7a4a22',
  fenceLight: '#9c6633',
  hay: '#e8b64c',
  hayDark: '#c98f2e',
  turkeyBody: '#8a5230',
  turkeyDark: '#6e3f22',
  turkeyLight: '#b5773f',
  tail: ['#a0522d', '#d2691e', '#e8a33c', '#7a3a1e'],
  head: '#e8dcc8',
  beak: '#e8a33c',
  wattle: '#e5534b',
  snood: '#d94f43',
  leg: '#e8a33c',
  farmerShirt: '#4a7a3f',
  farmerOveralls: '#3f5a8a',
  farmerHat: '#e8c96a',
  farmerSkin: '#e8b98a',
  farmerBeard: '#d8d0c0',
  oven: '#3a3f4a',
  ovenDoor: '#22242c',
  ovenGlow: '#ff9a3c',
  knifeBlade: '#d8dde6',
  knifeHandle: '#5a3a22',
  corn: '#f2c94c',
  cornLeaf: '#5a8a3f',
  pumpkin: '#e07b2e',
  pie: '#c98f4a',
  feather: '#f2ead8',
  text: '#fff6e0',
  textDark: '#3a2412',
  muted: '#f2d8a8',
  panel: 'rgba(46, 26, 14, 0.92)',
  panelEdge: '#e8a33c',
  danger: '#e5534b',
  safe: '#7ac74f',
  hudChip: 'rgba(46, 26, 14, 0.55)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const TITLE_FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Where the best score and the mute choice live between visits (this browser only). */
export const BEST_KEY = 'gobble-and-go.best';
export const MUTE_KEY = 'gobble-and-go.muted';
