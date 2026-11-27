// Keyboard, mouse and touch input. Held keys steer; one-shot presses (jump, start,
// pause, mute) are queued as bit flags and taken once by the loop, so a press between
// two frames is never lost and never counted twice. Pointer down is a jump; holding the
// right button (or a long press) ducks, so the game is fully playable with a mouse.

export const ACTION_JUMP = 1;
export const ACTION_CONFIRM = 2;
export const ACTION_PAUSE = 4;
export const ACTION_MUTE = 8;
export const ACTION_DUCK_START = 16;

const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']);
const DUCK = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  let duckHeld = false;
  let actions = 0;

  function pressJump() {
    actions |= ACTION_JUMP;
  }

  window.addEventListener('keydown', (event) => {
    if (JUMP.has(event.code)) {
      if (!event.repeat) pressJump();
    } else if (DUCK.has(event.code)) {
      duckHeld = true;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (DUCK.has(event.code)) duckHeld = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    duckHeld = false;
  });

  // Mouse / touch: left click or tap jumps (and confirms on menus); right button held ducks.
  target.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (event.button === 2) {
      duckHeld = true;
      return;
    }
    actions |= ACTION_JUMP | ACTION_CONFIRM;
  });
  target.addEventListener('pointerup', (event) => {
    if (event.button === 2) duckHeld = false;
  });
  target.addEventListener('contextmenu', (event) => event.preventDefault());
  // A long left-press also ducks: press, hold still, and the turkey slides low.
  let pressTimer = 0;
  target.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    window.clearTimeout(pressTimer);
    pressTimer = window.setTimeout(() => {
      duckHeld = true;
    }, 260);
  });
  target.addEventListener('pointerup', () => {
    window.clearTimeout(pressTimer);
    duckHeld = false;
  });

  return {
    /** True while a duck key or the right mouse button is held. */
    ducking() {
      return duckHeld;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
