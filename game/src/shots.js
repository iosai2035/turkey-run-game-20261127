// The screenshot scenes behind ?shot=title|play|kitchen|escaped|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot (jump when a jumpable hazard is close and the turkey is grounded, duck when
// a low hazard is close, chase corn when it is safe), so the frame is what a real game
// looks like and the same seed always gives the same frame. The kitchen scene warps the
// world to stage 3 first; the escaped scene plays a full run with a careful pilot.

import { FIELD, STAGES, STEP, TURKEY } from './config.js';
import { EVENT_CAUGHT, EVENT_ESCAPED, KIND_BRANCH, KIND_CORN, KIND_KNIFE } from './world.js';
import { SCREEN_ESCAPED, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const TITLE_SECONDS = 6;
const PLAY_SECONDS = 17;
const KITCHEN_SECONDS = 12;
const ESCAPED_LIMIT_SECONDS = 420;
const SAMPLE = 1 / 30;
/** How far ahead, in seconds, the autopilot looks for trouble. */
const HORIZON_PLAY = 0.85;
const HORIZON_ESCAPED = 1.1;
/** The end scene's pilot reacts far too late to clear anything, and is caught early. */
const HORIZON_END = 0.05;

/** The nearest hazard ahead of the turkey, or null. */
function nearestHazard(state) {
  let best = null;
  for (let index = 0; index < state.entities.length; index += 1) {
    const entity = state.entities[index];
    if (!entity.active || entity.kind === KIND_CORN) continue;
    if (entity.x + entity.width < state.turkey.x) continue;
    if (best === null || entity.x < best.x) best = entity;
  }
  return best;
}

/** Jumpable hazards are cleared by jumping; low ones are cleared by ducking. */
function isLow(kind) {
  return kind === KIND_BRANCH || kind === KIND_KNIFE;
}

/**
 * The autopilot: jump for a close jumpable hazard, duck under a close low one.
 * It jumps once, from the ground, timed to clear the hazard: a double jump
 * stretches the flight so far that the turkey lands on the hazard behind this
 * one. `horizon` is how early it reacts — a short horizon is a hurried player,
 * and gets caught.
 */
export function autopilot(state, horizon) {
  const turkey = state.turkey;
  const hazard = nearestHazard(state);
  if (hazard === null) return { jump: false, duck: false };
  const gapPx = hazard.x - (turkey.x + turkey.width);
  const timeToReach = gapPx / Math.max(120, state.speed);
  if (timeToReach > horizon) return { jump: false, duck: false };
  if (isLow(hazard.kind)) {
    // A low hazard is ducked under on the ground. Coming down on one, the turkey
    // lands already sliding — but only when the landing is imminent: ducking early
    // in a jump is a fast fall, and a fast fall lands on the fence being jumped.
    if (turkey.grounded) return { jump: false, duck: true };
    if (turkey.vy > 0 && timeToReach < 0.3 && turkey.y > FIELD.groundY - TURKEY.height - 40) {
      return { jump: false, duck: true };
    }
    return { jump: false, duck: false };
  }
  // One jump, from the ground, timed to clear the hazard: the turkey is above the
  // tallest hazard only in the middle of its jump, so it takes off about a
  // quarter of a second before the hazard arrives — any earlier and it lands on it.
  if (turkey.grounded && timeToReach < 0.25) return { jump: true, duck: false };
  return { jump: false, duck: false };
}

function playForward(world, seconds, horizon) {
  const steps = Math.floor(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    const move = autopilot(world.state, horizon);
    const events = world.step(STEP, move.jump, move.duck, false);
    if (events & EVENT_CAUGHT) return 'caught';
    if (events & EVENT_ESCAPED) return 'escaped';
  }
  return 'running';
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best
 * score to show. `warpStage` moves a fresh world to a later stage before playing.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'kitchen' && name !== 'escaped' && name !== 'end') {
    for (let index = 0; index < TITLE_SECONDS / STEP; index += 1) world.step(STEP, false, false, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'kitchen') {
    world.state.distance = 1080;
    world.state.elapsed = 95;
    world.state.speed = 520;
    playForward(world, KITCHEN_SECONDS, HORIZON_PLAY);
    world.state.turkey.invulnerable = 0;
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'escaped') {
    const outcome = playForward(world, ESCAPED_LIMIT_SECONDS, HORIZON_ESCAPED);
    if (outcome !== 'escaped') {
      // The pilot ran out of road: stage the escape from the run it just played.
      world.state.distance = world.totalDistance;
      world.state.stage = STAGES.length - 1;
      world.state.lives = Math.max(1, world.state.lives);
      world.state.score += 500;
      world.state.escaped = true;
    }
    world.state.turkey.invulnerable = 0;
    return { screen: SCREEN_ESCAPED, best: world.state.score };
  }
  if (name === 'end') {
    const outcome = playForward(world, 600, HORIZON_END);
    if (outcome !== 'caught') {
      world.state.lives = 0;
      world.state.caught = true;
    }
    world.state.turkey.invulnerable = 0;
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  playForward(world, PLAY_SECONDS, HORIZON_PLAY);
  world.state.turkey.invulnerable = 0;
  return { screen: SCREEN_PLAY, best: world.state.score };
}
