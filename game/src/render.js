// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred. Parallax scenery scrolls at three
// depths and changes with the stage — farmyard, cornfield, then the kitchen — while the
// farmer runs in from the left whenever the gap closes. Juice lives here too: trauma
// screen shake, a red flash when the farmer is spotted, floating score pops, and the
// panels for title, pause, caught and escaped.

import { FIELD, FONT, LIVES, PALETTE, PX_PER_METRE, STAGES, TITLE_FONT } from './config.js';
import { KIND_BRANCH, KIND_CORN, KIND_FENCE, KIND_FEATHER, KIND_HAY, KIND_KNIFE, KIND_OVEN, KIND_PIE, KIND_PUMPKIN } from './world.js';
import { drawBranch, drawCorn, drawFarmer, drawFeather, drawFence, drawHay, drawKnife, drawOven, drawPie, drawPumpkin, drawTurkey } from './sprites.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_ESCAPED = 'escaped';

const PANEL = { width: 640, top: 150, line: 34, bottom: 76 };

export function createRenderer(canvas, particles) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  let trauma = 0;
  let flash = 0;
  let time = 0;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, font) {
    const key = `${size}|${font || FONT}`;
    if (!fonts.has(key)) fonts.set(key, `${size}px ${font || FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.fillText(value, x, y);
  }

  function chip(x, y, w, h) {
    context.fillStyle = PALETTE.hudChip;
    context.beginPath();
    context.roundRect(x, y, w, h, 10);
    context.fill();
  }

  function drawSky(state) {
    const stage = STAGES[state.stage];
    const grad = context.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, stage.sky[0]);
    grad.addColorStop(0.55, stage.sky[1]);
    grad.addColorStop(1, stage.sky[2]);
    context.fillStyle = grad;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Low autumn sun.
    context.fillStyle = PALETTE.sun;
    context.beginPath();
    context.arc(1050, 120, 46, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255, 243, 196, 0.35)';
    context.beginPath();
    context.arc(1050, 120, 70, 0, Math.PI * 2);
    context.fill();
    // Clouds drift slowly with the distance travelled.
    context.fillStyle = PALETTE.cloud;
    const offset = (state.distance * PX_PER_METRE * 0.08) % 1400;
    for (let i = 0; i < 5; i += 1) {
      const cx = ((i * 317 + 120 - offset) % 1400 + 1400) % 1400 - 60;
      const cy = 60 + (i * 47) % 130;
      context.beginPath();
      context.ellipse(cx, cy, 62, 18, 0, 0, Math.PI * 2);
      context.ellipse(cx + 34, cy + 6, 44, 14, 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawHills(state) {
    const offset = state.distance * PX_PER_METRE;
    context.fillStyle = PALETTE.hillFar;
    context.beginPath();
    context.moveTo(0, FIELD.groundY);
    for (let x = 0; x <= FIELD.width; x += 40) {
      const wx = x + offset * 0.25;
      context.lineTo(x, FIELD.groundY - 90 - Math.sin(wx * 0.006) * 42 - Math.sin(wx * 0.0016) * 30);
    }
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.hillNear;
    context.beginPath();
    context.moveTo(0, FIELD.groundY);
    for (let x = 0; x <= FIELD.width; x += 40) {
      const wx = x + offset * 0.45;
      context.lineTo(x, FIELD.groundY - 42 - Math.sin(wx * 0.009 + 2) * 26);
    }
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();
  }

  function drawStageProps(state) {
    const offset = state.distance * PX_PER_METRE;
    if (state.stage === 0) {
      // The barn stands far back, and fence posts tick past at the near layer.
      context.fillStyle = '#7a3a22';
      const barnX = 900 - ((offset * 0.45) % 1600);
      context.fillRect(barnX, FIELD.groundY - 150, 150, 150);
      context.beginPath();
      context.moveTo(barnX - 12, FIELD.groundY - 150);
      context.lineTo(barnX + 75, FIELD.groundY - 205);
      context.lineTo(barnX + 162, FIELD.groundY - 150);
      context.closePath();
      context.fillStyle = '#5e2c18';
      context.fill();
      context.fillStyle = '#e8dcc8';
      context.fillRect(barnX + 55, FIELD.groundY - 90, 40, 90);
      const postGap = 190;
      const first = -((offset * 0.9) % postGap);
      for (let x = first; x < FIELD.width; x += postGap) {
        drawFence(context, x, FIELD.groundY - 52, 46, 52);
      }
    } else if (state.stage === 1) {
      // Corn stalks crowd the back of the field.
      context.fillStyle = '#4a7a3f';
      const gap = 74;
      const first = -((offset * 0.6) % gap);
      for (let x = first; x < FIELD.width; x += gap) {
        const sway = Math.sin(time * 2 + x * 0.05) * 4;
        context.fillRect(x + sway, FIELD.groundY - 130, 7, 130);
        context.beginPath();
        context.ellipse(x + sway - 12, FIELD.groundY - 108, 16, 7, -0.6, 0, Math.PI * 2);
        context.ellipse(x + sway + 16, FIELD.groundY - 84, 16, 7, 0.6, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.corn;
        context.beginPath();
        context.ellipse(x + sway + 4, FIELD.groundY - 96, 7, 14, 0.2, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#4a7a3f';
      }
    } else {
      // The kitchen: tiled wall, a window on the dusk yard, hanging pots.
      context.fillStyle = '#6e3a2c';
      context.fillRect(0, 0, FIELD.width, FIELD.groundY);
      context.strokeStyle = 'rgba(255, 246, 224, 0.14)';
      context.lineWidth = 2;
      for (let y = 24; y < FIELD.groundY; y += 48) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(FIELD.width, y);
        context.stroke();
      }
      for (let x = 24; x < FIELD.width; x += 48) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, FIELD.groundY);
        context.stroke();
      }
      // Window with the farmyard dusk outside.
      context.fillStyle = '#2c1c14';
      context.fillRect(880, 90, 260, 190);
      const wgrad = context.createLinearGradient(0, 100, 0, 270);
      wgrad.addColorStop(0, '#e8935a');
      wgrad.addColorStop(1, '#b44a2e');
      context.fillStyle = wgrad;
      context.fillRect(892, 102, 236, 166);
      context.fillStyle = '#f7c873';
      context.beginPath();
      context.arc(1060, 140, 22, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#2c1c14';
      context.lineWidth = 8;
      context.beginPath();
      context.moveTo(1010, 102);
      context.lineTo(1010, 268);
      context.moveTo(892, 185);
      context.lineTo(1128, 185);
      context.stroke();
      // Hanging pots and a shelf of jars.
      context.fillStyle = '#3a3f4a';
      for (let i = 0; i < 3; i += 1) {
        const px = 150 + i * 90;
        context.beginPath();
        context.arc(px, 190, 26, 0, Math.PI);
        context.fill();
        context.fillRect(px - 26, 186, 52, 6);
      }
      context.fillStyle = '#8a5a2e';
      context.fillRect(80, 300, 300, 12);
      context.fillStyle = '#c98f4a';
      for (let i = 0; i < 4; i += 1) context.fillRect(100 + i * 70, 262, 34, 38);
    }
  }

  function drawGround(state) {
    const stage = STAGES[state.stage];
    context.fillStyle = state.stage === 2 ? '#5e3a26' : stage.ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = state.stage === 2 ? '#4a2c1e' : stage.groundDark;
    context.fillRect(0, FIELD.groundY, FIELD.width, 6);
    // Ground marks scroll with the distance, so the run reads as motion.
    const offset = state.distance * PX_PER_METRE;
    context.fillStyle = state.stage === 2 ? 'rgba(0,0,0,0.25)' : PALETTE.dirt;
    for (let i = 0; i < 24; i += 1) {
      const x = ((i * 173 - offset) % 1400 + 1400) % 1400 - 60;
      context.beginPath();
      context.ellipse(x, FIELD.groundY + 34 + (i % 3) * 20, 26, 5, 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawEntities(state) {
    const items = state.entities;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      if (item.kind === KIND_CORN) drawCorn(context, item.x, item.y, item.width, item.height, item.bob);
      else if (item.kind === KIND_FEATHER) drawFeather(context, item.x, item.y, item.width, item.height, item.bob);
      else if (item.kind === KIND_PIE) drawPie(context, item.x, item.y, item.width, item.height, item.bob);
      else if (item.kind === KIND_FENCE) drawFence(context, item.x, item.y, item.width, item.height);
      else if (item.kind === KIND_HAY) drawHay(context, item.x, item.y, item.width, item.height);
      else if (item.kind === KIND_BRANCH) drawBranch(context, item.x, item.y, item.width, item.height);
      else if (item.kind === KIND_OVEN) drawOven(context, item.x, item.y, item.width, item.height, time);
      else if (item.kind === KIND_KNIFE) drawKnife(context, item.x, item.y, item.width, item.height, item.spin);
      else if (item.kind === KIND_PUMPKIN) drawPumpkin(context, item.x, item.y, item.width, item.height, item.bob);
    }
  }

  function drawFarmerChase(state) {
    const gap = state.farmer.gap;
    if (gap > 16) return;
    const fx = state.turkey.x - gap * PX_PER_METRE * 0.42 - 40;
    if (fx < -140) return;
    drawFarmer(context, fx, FIELD.groundY, 80, state.farmer.runPhase, state.farmer.mode);
    if (gap < 5) {
      context.fillStyle = PALETTE.danger;
      context.font = `bold 34px ${TITLE_FONT}`;
      context.textAlign = 'center';
      context.textBaseline = 'alphabetic';
      context.fillText('!', fx + 40, FIELD.groundY - 150 + Math.sin(time * 10) * 4);
    }
  }

  function drawWoods(state) {
    // The escape: dusk woods, tall pines and a safe clearing. Used behind the
    // escaped screen instead of the stage scenery.
    const grad = context.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, '#2c4a2e');
    grad.addColorStop(0.6, '#3f6a35');
    grad.addColorStop(1, '#24401f');
    context.fillStyle = grad;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = '#f7c873';
    context.beginPath();
    context.arc(1050, 110, 40, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#1e3a1a';
    for (let i = 0; i < 9; i += 1) {
      const x = 40 + i * 150;
      const h = 260 + ((i * 53) % 120);
      context.beginPath();
      context.moveTo(x - 55, FIELD.groundY);
      context.lineTo(x, FIELD.groundY - h);
      context.lineTo(x + 55, FIELD.groundY);
      context.closePath();
      context.fill();
      context.fillStyle = '#24401f';
      context.fillRect(x - 8, FIELD.groundY - 40, 16, 40);
      context.fillStyle = '#1e3a1a';
    }
    context.fillStyle = '#3a5a2e';
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
  }

  function drawField(state, screen) {
    if (state.escaped) {
      drawWoods(state);
    } else {
      drawSky(state);
      drawHills(state);
      drawStageProps(state);
      drawGround(state);
    }
    drawEntities(state);
    drawFarmerChase(state);
    const turkey = state.turkey;
    const blink = turkey.invulnerable > 0 && Math.floor(turkey.invulnerable * 10) % 2 === 0;
    // turkey.y is the top of its box; the feet are always 58 below it, ducking or not.
    drawTurkey(context, turkey.x, turkey.y + 58, turkey.width, turkey.runPhase, turkey.squash, turkey.ducking, blink && screen === SCREEN_PLAY);
  }

  function drawHud(state, muted) {
    context.textBaseline = 'top';
    chip(18, 14, 250, 46);
    text(`SCORE ${state.score}`, 32, 24, 26, PALETTE.text, 'left', TITLE_FONT);
    chip(FIELD.width / 2 - 180, 14, 360, 46);
    text(`${Math.floor(state.distance)} m  ·  ${STAGES[state.stage].name}`, FIELD.width / 2, 25, 22, PALETTE.text, 'center', TITLE_FONT);
    chip(FIELD.width - 268, 14, 250, 46);
    text('LIVES', FIELD.width - 252, 24, 24, PALETTE.muted, 'left', TITLE_FONT);
    for (let i = 0; i < LIVES; i += 1) {
      context.fillStyle = i < state.lives ? PALETTE.wattle : 'rgba(255,246,224,0.25)';
      context.beginPath();
      const hx = FIELD.width - 176 + i * 34;
      context.arc(hx, 38, 11, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.arc(hx + 11, 38, 11, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(hx - 9, 40);
      context.lineTo(hx + 22, 40);
      context.lineTo(hx + 6, 58);
      context.closePath();
      context.fill();
    }
    // The farmer gap meter: how far behind the farmer is, in metres.
    const barX = 18;
    const barY = FIELD.height - 52;
    const barW = 300;
    chip(barX - 6, barY - 26, barW + 12, 66);
    text('FARMER', barX + 2, barY - 20, 16, PALETTE.muted, 'left', TITLE_FONT);
    context.fillStyle = 'rgba(255,246,224,0.2)';
    context.fillRect(barX, barY, barW, 12);
    const fill = Math.max(0, Math.min(1, state.farmer.gap / 26));
    context.fillStyle = state.farmer.gap < 5 ? PALETTE.danger : state.farmer.gap < 10 ? '#e8a33c' : PALETTE.safe;
    context.fillRect(barX, barY, barW * fill, 12);
    text(`${Math.max(0, state.farmer.gap).toFixed(0)} m behind`, barX + barW + 14, barY - 4, 18, PALETTE.text, 'left');
    text(muted ? 'M: sound off' : 'P pause · M mute', FIELD.width - 20, FIELD.height - 34, 16, PALETTE.muted, 'right');
  }

  function drawParticles() {
    const pool = particles.pool;
    for (let index = 0; index < pool.length; index += 1) {
      const p = pool[index];
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.maxLife);
      context.fillStyle = p.color;
      if (p.shape === 1) {
        context.save();
        context.translate(p.x, p.y);
        context.rotate(p.spin * p.life);
        context.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        context.restore();
      } else if (p.shape === 2) {
        context.save();
        context.translate(p.x, p.y);
        context.rotate(p.spin * p.life);
        context.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        context.restore();
      } else {
        context.beginPath();
        context.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.globalAlpha = 1;
    const pops = particles.pops;
    for (let index = 0; index < pops.length; index += 1) {
      const p = pops[index];
      if (!p.active) continue;
      context.globalAlpha = Math.min(1, (p.life / p.maxLife) * 1.6);
      text(p.text, p.x, p.y, p.size, p.color, 'center', TITLE_FONT);
    }
    context.globalAlpha = 1;
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.beginPath();
    context.roundRect(x, y, PANEL.width, height, 16);
    context.fill();
    context.strokeStyle = accent || PALETTE.panelEdge;
    context.lineWidth = 3;
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 82, 46, PALETTE.text, 'center', TITLE_FONT);
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.corn, 'center', TITLE_FONT);
  }

  function drawTitle(state, best) {
    // A hero turkey, big and proud, standing clear above the panel.
    drawTurkey(context, FIELD.width / 2 - 65, 152, 130, time * 2, 0, false, false);
    const lines = [
      'Thanksgiving is coming. The farmer is coming faster.',
      'Jump fences, hay and the oven. Slide under branches',
      'and spinning carving knives — and reach the woods.',
      'SPACE / CLICK jump · DOWN / RIGHT-CLICK slide',
      `BEST ${best}`,
    ];
    drawPanel('GOBBLE & GO', lines, 'Press SPACE or click to run', PALETTE.panelEdge);
    text('A TURKEY ESCAPE GAME', FIELD.width / 2, 648, 22, PALETTE.text, 'center', TITLE_FONT);
  }

  function drawBanner(state) {
    if (state.stageBanner <= 0) return;
    const alpha = Math.min(1, state.stageBanner / 0.6);
    context.globalAlpha = alpha;
    context.fillStyle = 'rgba(46, 26, 14, 0.6)';
    context.fillRect(0, 250, FIELD.width, 92);
    text(`STAGE ${state.stage + 1} — ${STAGES[state.stage].name}`, FIELD.width / 2, 290, 44, PALETTE.text, 'center', TITLE_FONT);
    text(state.stage === 2 ? 'The oven is hot. Run!' : state.stage === 1 ? 'Mind the corn — and the knives.' : 'The yard is behind you.', FIELD.width / 2, 322, 22, PALETTE.muted, 'center');
    context.globalAlpha = 1;
  }

  /** Paint one frame: the field, the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, muted, dt) {
    time += dt;
    if (trauma > 0) trauma = Math.max(0, trauma - dt * 1.6);
    if (flash > 0) flash = Math.max(0, flash - dt * 2.2);
    const shake = trauma * trauma;
    const ox = (Math.random() * 2 - 1) * shake * 14;
    const oy = (Math.random() * 2 - 1) * shake * 10;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x + ox * view.scale, view.y + oy * view.scale);
    drawField(state, screen);
    drawParticles();
    if (screen === SCREEN_TITLE) {
      drawTitle(state, best);
      return;
    }
    drawHud(state, muted);
    drawBanner(state);
    if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', ['The farmer waits. The oven stays hot.', ''], 'Press P to keep running');
    } else if (screen === SCREEN_OVER) {
      const lines = [
        `SCORE ${state.score}   ·   BEST ${best}`,
        `${Math.floor(state.distance)} m run · Stage ${state.stage + 1} — ${STAGES[state.stage].name}`,
        'The farmer got his dinner after all.',
      ];
      drawPanel('CAUGHT FOR DINNER!', lines, 'Press SPACE or click to run again', PALETTE.danger);
    } else if (screen === SCREEN_ESCAPED) {
      const lines = [
        `SCORE ${state.score}   ·   BEST ${best}`,
        `${Math.floor(state.distance)} m run · all three stages escaped`,
        'Thanksgiving is safe — for you, at least.',
      ];
      drawPanel('YOU ESCAPED!', lines, 'Press SPACE or click to run again', PALETTE.safe);
    }
    if (flash > 0) {
      context.fillStyle = `rgba(229, 83, 75, ${flash * 0.22})`;
      context.fillRect(-20, -20, FIELD.width + 40, FIELD.height + 40);
    }
    if (state.farmer.gap < 5 && screen === SCREEN_PLAY) {
      context.fillStyle = `rgba(229, 83, 75, ${0.06 + Math.sin(time * 6) * 0.04})`;
      context.fillRect(-20, -20, FIELD.width + 40, FIELD.height + 40);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    addTrauma(amount) {
      trauma = Math.min(1, trauma + amount);
    },
    flashRed() {
      flash = 1;
    },
  };
}
