// The game's rules and state, with no drawing and no browser in it: the turkey's run,
// the farmer's chase (he creeps closer, searches when he loses the trail, then sprints),
// the hazards and pickups of each stage, collisions, score, lives and distance. step()
// advances one fixed step and returns what happened as bit flags, so the caller can
// react (sound, shake, particles) without the world knowing about screens or sound.
// Nothing here allocates after createWorld returns.

import { FARMER, FIELD, HAZARD, LIVES, PICKUP, PX_PER_METRE, RUN, STAGES, TURKEY } from './config.js';
import { pick, rangeInt } from './random.js';

export const KIND_FENCE = 0;
export const KIND_HAY = 1;
export const KIND_BRANCH = 2;
export const KIND_OVEN = 3;
export const KIND_KNIFE = 4;
export const KIND_PUMPKIN = 5;
export const KIND_CORN = 6;
export const KIND_FEATHER = 7;
export const KIND_PIE = 8;

export const EVENT_CORN = 1;
export const EVENT_FEATHER = 2;
export const EVENT_LIFE = 4;
export const EVENT_HIT = 8;
export const EVENT_CAUGHT = 16;
export const EVENT_ESCAPED = 32;
export const EVENT_STAGE = 64;
export const EVENT_SPOTTED = 128;
export const EVENT_JUMP = 256;
export const EVENT_LAND = 512;

const TOTAL_DISTANCE = STAGES.reduce((sum, stage) => sum + stage.target, 0);

/** Hazard shapes per stage: what can appear, and how tall/wide its box is. */
const STAGE_HAZARDS = [
  [KIND_FENCE, KIND_FENCE, KIND_HAY, KIND_BRANCH, KIND_PUMPKIN],
  [KIND_FENCE, KIND_HAY, KIND_BRANCH, KIND_PUMPKIN, KIND_KNIFE, KIND_FENCE],
  [KIND_OVEN, KIND_KNIFE, KIND_BRANCH, KIND_FENCE, KIND_OVEN, KIND_PUMPKIN],
];

function hazardSize(kind) {
  switch (kind) {
    case KIND_FENCE: return { width: 34, height: 66 };
    case KIND_HAY: return { width: 74, height: 92 };
    case KIND_BRANCH: return { width: 90, height: 34 };
    case KIND_OVEN: return { width: 92, height: 88 };
    case KIND_KNIFE: return { width: 64, height: 30 };
    case KIND_PUMPKIN: return { width: 52, height: 48 };
    default: return { width: 40, height: 40 };
  }
}

function overlaps(a, b, shrink) {
  return (
    a.x + shrink < b.x + b.width - shrink &&
    a.x + a.width - shrink > b.x + shrink &&
    a.y + shrink < b.y + b.height - shrink &&
    a.y + a.height - shrink > b.y + shrink
  );
}

export function createWorld(random) {
  const turkey = {
    x: TURKEY.x,
    y: FIELD.groundY - TURKEY.height,
    width: TURKEY.width,
    height: TURKEY.height,
    vy: 0,
    grounded: true,
    jumps: 0,
    coyote: 0,
    buffer: 0,
    ducking: false,
    invulnerable: 0,
    squash: 0,
    runPhase: 0,
  };
  const farmer = { gap: 13, mode: 'chase', modeTime: 0, runPhase: 0 };
  const entities = [];
  for (let index = 0; index < 96; index += 1) {
    entities.push({ active: false, kind: KIND_FENCE, x: 0, y: 0, width: 0, height: 0, spin: 0, bob: 0 });
  }
  const state = {
    turkey,
    farmer,
    entities,
    score: 0,
    lives: LIVES,
    distance: 0,
    stage: 0,
    stageBanner: 0,
    speed: RUN.startSpeed,
    elapsed: 0,
    /** Pixels the next hazard group waits behind the last hazard on screen. */
    spawnGap: 500,
    featherIn: 14,
    pieIn: 26,
    stumble: 0,
    escaped: false,
    caught: false,
  };

  function reset() {
    turkey.y = FIELD.groundY - TURKEY.height;
    turkey.vy = 0;
    turkey.grounded = true;
    turkey.jumps = 0;
    turkey.coyote = 0;
    turkey.buffer = 0;
    turkey.ducking = false;
    turkey.invulnerable = 0;
    turkey.squash = 0;
    turkey.runPhase = 0;
    farmer.gap = FARMER.startGap;
    farmer.mode = 'chase';
    farmer.modeTime = 0;
    farmer.runPhase = 0;
    for (const entity of entities) entity.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.distance = 0;
    state.stage = 0;
    state.stageBanner = 0;
    state.speed = RUN.startSpeed;
    state.elapsed = 0;
    state.spawnGap = 500;
    state.featherIn = 14;
    state.pieIn = 26;
    state.stumble = 0;
    state.escaped = false;
    state.caught = false;
  }

  function freeEntity() {
    for (let index = 0; index < entities.length; index += 1) {
      if (!entities[index].active) return entities[index];
    }
    return null;
  }

  function spawnHazard(kind, x) {
    const entity = freeEntity();
    if (entity === null) return null;
    const size = hazardSize(kind);
    entity.active = true;
    entity.kind = kind;
    entity.width = size.width;
    entity.height = size.height;
    entity.x = x;
    entity.spin = 0;
    entity.bob = random() * Math.PI * 2;
    // Low hazards hang at head height: they catch a standing turkey, and a
    // ducking one slides under them (the forgiving hitbox shaves both boxes).
    if (kind === KIND_BRANCH) entity.y = FIELD.groundY - 73;
    else if (kind === KIND_KNIFE) entity.y = FIELD.groundY - 73;
    else entity.y = FIELD.groundY - size.height;
    return entity;
  }

  function spawnPickup(kind, x, y) {
    const entity = freeEntity();
    if (entity === null) return null;
    entity.active = true;
    entity.kind = kind;
    entity.width = kind === KIND_FEATHER ? 34 : 30;
    entity.height = kind === KIND_FEATHER ? 26 : 30;
    entity.x = x;
    entity.y = y;
    entity.spin = 0;
    entity.bob = random() * Math.PI * 2;
    return entity;
  }

  /** One hazard group: a pattern the turkey can always clear with a timely jump or duck. */
  function spawnGroup() {
    const x = FIELD.width + 40;
    const table = STAGE_HAZARDS[state.stage];
    const kind = pick(random, table);
    const first = spawnHazard(kind, x);
    if (first === null) return;
    // A corn arc over a jumpable hazard rewards the jump that clears it.
    if (kind === KIND_FENCE || kind === KIND_HAY || kind === KIND_OVEN || kind === KIND_PUMPKIN) {
      const top = first.y - 96;
      for (let i = 0; i < PICKUP.cornArc; i += 1) {
        spawnPickup(KIND_CORN, x + first.width / 2 - 15 + i * 34, top - Math.abs(i - 1) * 26);
      }
    }
    if (kind === KIND_BRANCH || kind === KIND_KNIFE) {
      // A low hazard is followed by corn on the ground, for the duck that slid under it.
      spawnPickup(KIND_CORN, x + first.width + 70, FIELD.groundY - 34);
      spawnPickup(KIND_CORN, x + first.width + 110, FIELD.groundY - 34);
    }
    // Sometimes two hazards in a row, spaced so the landing of the first jump sets up the second.
    if (random() < 0.35) {
      const secondKind = pick(random, table);
      spawnHazard(secondKind, x + 560 + random() * 160);
    }
    // A lone corn trail on the ground keeps the run rewarding between hazards.
    if (random() < 0.4) {
      const base = x + 420 + random() * 160;
      for (let i = 0; i < 3; i += 1) spawnPickup(KIND_CORN, base + i * 36, FIELD.groundY - 34);
    }
  }

  function stageFor(distance) {
    let total = 0;
    for (let i = 0; i < STAGES.length; i += 1) {
      total += STAGES[i].target;
      if (distance < total) return i;
    }
    return STAGES.length - 1;
  }

  function turkeyBox() {
    return {
      x: turkey.x + 6,
      y: turkey.y + (turkey.ducking ? 10 : 0),
      width: turkey.width - 12,
      height: turkey.ducking ? TURKEY.duckHeight : TURKEY.height,
    };
  }

  /**
   * One fixed step. `jumpPressed` is true on the frame a jump was queued, `duckHeld`
   * while a duck key or button is held. With `harmless` set (the title screen's
   * backdrop) the turkey runs on its own and nothing can hurt it.
   */
  function step(dt, jumpPressed, duckHeld, harmless) {
    let events = 0;
    state.elapsed += dt;
    const targetSpeed = Math.min(RUN.maxSpeed, RUN.startSpeed + RUN.speedGain * state.elapsed);
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 2);
    const speed = state.stumble > 0 ? state.speed * 0.62 : state.speed;
    const scroll = speed * dt;
    state.distance += scroll / PX_PER_METRE;
    turkey.runPhase += dt * (6 + state.speed / 60);
    farmer.runPhase += dt * (7 + state.speed / 55);

    // --- stages ---
    const nextStage = stageFor(state.distance);
    if (nextStage !== state.stage) {
      state.stage = nextStage;
      state.stageBanner = 2.2;
      events |= EVENT_STAGE;
    }
    if (state.stageBanner > 0) state.stageBanner -= dt;

    // --- the farmer ---
    if (!harmless) {
      farmer.modeTime -= dt;
      if (farmer.mode === 'chase') {
        farmer.gap -= RUN.farmerCreep * dt;
        if (farmer.gap >= RUN.searchGap) {
          farmer.mode = 'search';
          farmer.modeTime = RUN.searchTime;
        }
      } else if (farmer.mode === 'search') {
        if (farmer.modeTime <= 0) {
          farmer.mode = 'sprint';
          farmer.modeTime = RUN.sprintTime;
          events |= EVENT_SPOTTED;
        }
      } else if (farmer.mode === 'sprint') {
        farmer.gap -= RUN.sprintCreep * dt;
        if (farmer.modeTime <= 0) farmer.mode = 'chase';
      }
      if (farmer.gap <= 0) {
        state.caught = true;
        return EVENT_CAUGHT;
      }
    }

    // --- the turkey ---
    if (jumpPressed) turkey.buffer = TURKEY.jumpBuffer;
    else if (turkey.buffer > 0) turkey.buffer -= dt;
    if (turkey.coyote > 0) turkey.coyote -= dt;
    const wasGrounded = turkey.grounded;
    if (turkey.buffer > 0 && (turkey.grounded || turkey.coyote > 0)) {
      turkey.vy = -TURKEY.jumpSpeed;
      turkey.grounded = false;
      turkey.jumps = 1;
      turkey.buffer = 0;
      turkey.coyote = 0;
      turkey.squash = -0.35;
      events |= EVENT_JUMP;
    } else if (turkey.buffer > 0 && turkey.jumps < 2 && !turkey.grounded) {
      turkey.vy = -TURKEY.doubleJumpSpeed;
      turkey.jumps = 2;
      turkey.buffer = 0;
      turkey.squash = -0.3;
      events |= EVENT_JUMP;
    }
    const gravity = turkey.ducking && !turkey.grounded ? TURKEY.gravity * 2.4 : TURKEY.gravity;
    turkey.vy += gravity * dt;
    turkey.y += turkey.vy * dt;
    if (turkey.y >= FIELD.groundY - TURKEY.height) {
      if (!wasGrounded && turkey.vy > 500) {
        turkey.squash = 0.35;
        events |= EVENT_LAND;
      }
      turkey.y = FIELD.groundY - TURKEY.height;
      turkey.vy = 0;
      turkey.grounded = true;
      turkey.jumps = 0;
      turkey.coyote = TURKEY.coyoteTime;
    } else {
      turkey.grounded = false;
    }
    // Ducking is decided after the landing, so a turkey that holds duck lands
    // already sliding instead of standing up into a low hazard for one step.
    turkey.ducking = duckHeld && turkey.grounded;
    if (turkey.squash !== 0) turkey.squash += (0 - turkey.squash) * Math.min(1, dt * 10);
    if (turkey.invulnerable > 0) turkey.invulnerable = Math.max(0, turkey.invulnerable - dt);
    if (state.stumble > 0) state.stumble -= dt;

    // --- spawning ---
    // Position-based, not time-based: the next group waits until the rightmost
    // hazard on screen has scrolled far enough left. A timer would let a
    // group's second hazard and the next group's first hazard pile up into a
    // wall no jump can clear.
    let rightmost = -Infinity;
    for (let index = 0; index < entities.length; index += 1) {
      const entity = entities[index];
      if (entity.active && entity.kind < KIND_CORN && entity.x > rightmost) rightmost = entity.x;
    }
    if (rightmost < FIELD.width - state.spawnGap) {
      spawnGroup();
      state.spawnGap = Math.max(HAZARD.minGapPx, HAZARD.gapPerSpeed * state.speed) * (0.9 + random() * 0.35);
    }
    state.featherIn -= dt;
    if (state.featherIn <= 0) {
      spawnPickup(KIND_FEATHER, FIELD.width + 40, FIELD.groundY - 190 - random() * 90);
      state.featherIn = 16 + random() * 10;
    }
    state.pieIn -= dt;
    if (state.pieIn <= 0) {
      if (state.lives < LIVES) spawnPickup(KIND_PIE, FIELD.width + 40, FIELD.groundY - 120);
      state.pieIn = 24 + random() * 12;
    }

    // --- entities: scroll, animate, collide ---
    const box = turkeyBox();
    for (let index = 0; index < entities.length; index += 1) {
      const entity = entities[index];
      if (!entity.active) continue;
      entity.x -= scroll;
      entity.bob += dt * 3;
      if (entity.kind === KIND_KNIFE) entity.spin += dt * 9;
      if (entity.x + entity.width < -60) {
        entity.active = false;
        continue;
      }
      if (harmless) continue;
      if (!overlaps(box, entity, HAZARD.shrink)) continue;
      if (entity.kind === KIND_CORN) {
        entity.active = false;
        state.score += PICKUP.cornPoints;
        farmer.gap = Math.min(26, farmer.gap + RUN.cornGain);
        events |= EVENT_CORN;
      } else if (entity.kind === KIND_FEATHER) {
        entity.active = false;
        state.score += PICKUP.featherPoints;
        farmer.gap = Math.min(26, farmer.gap + RUN.featherGain);
        events |= EVENT_FEATHER;
      } else if (entity.kind === KIND_PIE) {
        entity.active = false;
        state.lives = Math.min(LIVES, state.lives + 1);
        events |= EVENT_LIFE;
      } else if (turkey.invulnerable === 0) {
        entity.active = false;
        state.lives -= 1;
        state.stumble = 0.55;
        farmer.gap -= RUN.hitCost;
        turkey.invulnerable = TURKEY.invulnerable;
        events |= EVENT_HIT;
        if (state.lives <= 0 || farmer.gap <= 0) {
          state.caught = true;
          return events | EVENT_CAUGHT;
        }
      }
    }

    // --- escape ---
    if (!harmless && state.distance >= TOTAL_DISTANCE) {
      state.escaped = true;
      state.score += 500;
      return events | EVENT_ESCAPED;
    }
    state.score = Math.max(state.score, Math.floor(state.distance) * 1);
    return events;
  }

  reset();
  return { state, reset, step, totalDistance: TOTAL_DISTANCE };
}
