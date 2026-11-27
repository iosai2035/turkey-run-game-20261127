// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, caught and escaped.
// World events become feedback here — sound, shake, hit-stop, particles, score pops —
// so the simulation never knows about presentation.
//
// ?seed=N fixes the run's randomness. ?shot=title|play|kitchen|escaped|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_CORN, EVENT_ESCAPED, EVENT_FEATHER, EVENT_HIT, EVENT_JUMP, EVENT_LAND, EVENT_LIFE, EVENT_SPOTTED, EVENT_STAGE } from './world.js';
import { ACTION_CONFIRM, ACTION_JUMP, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_ESCAPED, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createParticles } from './particles.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;
/** Hit-stop: the world freezes this long on a big hit, so the impact lands. */
const HITSTOP_SECONDS = 0.09;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const particles = createParticles();
const renderer = createRenderer(canvas, particles);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  // A little confetti on the escaped scene, feathers on the caught one.
  if (scene.screen === SCREEN_ESCAPED) {
    for (let i = 0; i < 3; i += 1) particles.confetti(300 + i * 340, 120);
    // Let the confetti spread before the frame is painted.
    for (let i = 0; i < 24; i += 1) particles.step(STEP);
  }
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, audio.isMuted(), STEP);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let muted = audio.isMuted();
  let accumulator = 0;
  let last = performance.now();
  let hitstop = 0;
  let heartbeatIn = 0;
  let dustIn = 0;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    particles.step(10);
    accumulator = 0;
    hitstop = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.startMusic('run');
    announce('Playing. Three lives. The farmer is behind you.');
  }

  function finishRun(escaped) {
    screen = escaped ? SCREEN_ESCAPED : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (escaped) {
      audio.escaped();
      audio.startMusic('title');
      for (let i = 0; i < 5; i += 1) particles.confetti(200 + i * 220, 100 + (i % 2) * 80);
      announce(`You escaped! Score ${world.state.score}. Best ${best}.`);
    } else {
      audio.caught();
      audio.stopMusic();
      particles.feathers(world.state.turkey.x + 32, world.state.turkey.y + 20);
      announce(`Caught for dinner. Score ${world.state.score}. Best ${best}.`);
    }
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & (ACTION_JUMP | ACTION_CONFIRM) && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_ESCAPED)) {
      audio.click();
      startGame();
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        audio.stopMusic();
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        audio.startMusic(world.state.stage === 2 ? 'kitchen' : 'run');
        announce('Playing.');
      }
    }
  }

  function react(events) {
    const turkey = world.state.turkey;
    if (events & EVENT_JUMP) {
      audio.jump(turkey.jumps === 1);
      particles.dust(turkey.x + 20, turkey.y + 58);
    }
    if (events & EVENT_LAND) audio.land();
    if (events & EVENT_CORN) {
      audio.corn();
      particles.kernels(turkey.x + 32, turkey.y + 20);
      particles.pop(turkey.x + 32, turkey.y - 12, '+10', '#f2c94c', 22);
    }
    if (events & EVENT_FEATHER) {
      audio.feather();
      particles.pop(turkey.x + 32, turkey.y - 12, '+50', '#f2ead8', 26);
      renderer.addTrauma(0.12);
    }
    if (events & EVENT_LIFE) {
      audio.life();
      particles.pop(turkey.x + 32, turkey.y - 12, '+1 LIFE', '#7ac74f', 24);
    }
    if (events & EVENT_HIT) {
      audio.hit();
      renderer.addTrauma(0.55);
      renderer.flashRed();
      hitstop = HITSTOP_SECONDS;
      particles.feathers(turkey.x + 32, turkey.y + 20);
      announce(world.state.lives === 1 ? 'Hit! One life left. The farmer is close!' : `Hit! ${world.state.lives} lives left.`);
    }
    if (events & EVENT_SPOTTED) {
      audio.spotted();
      renderer.addTrauma(0.25);
      announce('The farmer spotted you!');
    }
    if (events & EVENT_STAGE) {
      audio.stage();
      const stageName = ['THE FARMYARD', 'THE CORNFIELD', 'THE KITCHEN'][world.state.stage];
      announce(`Stage ${world.state.stage + 1}: ${stageName}.`);
      if (world.state.stage === 2) audio.startMusic('kitchen');
    }
  }

  function step(jumpPressed) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, false, false, true);
      return;
    }
    if (hitstop > 0) {
      hitstop -= STEP;
      return;
    }
    const events = world.step(STEP, jumpPressed, input.ducking(), false);
    react(events);
    if (events & EVENT_CAUGHT) finishRun(false);
    else if (events & EVENT_ESCAPED) finishRun(true);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // Take the frame's one-shot presses once: menus consume them, play keeps the jump.
    const actions = input.takeActions();
    handleActions(actions);
    let jumpQueued = Boolean(actions & ACTION_JUMP) && screen === SCREEN_PLAY;
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      accumulator += dt;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(jumpQueued);
        jumpQueued = false;
        accumulator -= STEP;
      }
      // Dust under running feet, and a heartbeat when the farmer is close.
      if (screen === SCREEN_PLAY) {
        dustIn -= dt;
        if (dustIn <= 0 && world.state.turkey.grounded) {
          particles.dust(world.state.turkey.x + 10, world.state.turkey.y + 58);
          dustIn = 0.22;
        }
        if (world.state.farmer.gap < 5) {
          heartbeatIn -= dt;
          if (heartbeatIn <= 0) {
            audio.heartbeat();
            heartbeatIn = 0.55;
          }
        }
      }
    } else {
      accumulator = 0;
    }
    particles.step(dt);
    renderer.draw(world.state, screen, best, muted, dt);
  }

  // Leaving the tab pauses a running game rather than letting the farmer catch the turkey unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.stopMusic();
      announce('Paused.');
    }
  });

  audio.startMusic('title');
  announce('Gobble and Go. Press Space or click to run from the farmer.');
  // A small read-only handle for automated play-testing (screenshots, health checks).
  window.__gobble = {
    state: world.state,
    screen() {
      return screen;
    },
  };
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
