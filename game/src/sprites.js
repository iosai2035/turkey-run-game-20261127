// Every sprite is drawn from code with canvas paths — no image files, no borrowed art.
// One function per creature or prop, each taking the box it must fill so the renderer
// can place it anywhere. The turkey's legs and wings animate with `phase`; the farmer's
// arms pump as he runs; the oven glows; the thrown knife spins.

import { PALETTE } from './config.js';

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The turkey, facing right, standing on `groundY` inside a box of width `w`.
 * `phase` drives the running legs; `squash` stretches or squashes the body
 * (negative = stretched tall mid-jump, positive = squashed on landing);
 * `duck` folds it low for a slide; `blink` hides it every other tenth of a second
 * while invulnerable. The tail fan, head, beak, wattle and snood are all its own.
 */
export function drawTurkey(ctx, x, groundY, w, phase, squash, duck, blink) {
  if (blink) return;
  const scale = w / 64;
  const h = duck ? 34 : 58;
  const cx = x + w / 2;
  const base = groundY;
  const stretch = 1 + squash;
  const squashX = 1 - squash * 0.6;
  ctx.save();
  // Scale the whole bird to the box it was given, then squash/stretch it for juice.
  ctx.translate(cx, base);
  ctx.scale(squashX * scale, stretch * scale);
  ctx.translate(-cx, -base);
  // Tail fan: four scalloped feathers, darkest at the back.
  const tailColors = PALETTE.tail;
  for (let i = 0; i < 4; i += 1) {
    const angle = -Math.PI * 0.5 + (i - 1.5) * 0.42;
    const len = 46 - Math.abs(i - 1.5) * 5;
    ctx.fillStyle = tailColors[i];
    ctx.beginPath();
    ctx.moveTo(cx - 14, base - h * 0.55);
    ctx.quadraticCurveTo(cx - 34 + Math.cos(angle) * len, base - h * 0.55 + Math.sin(angle) * len, cx - 10 + Math.cos(angle + 0.3) * len * 0.9, base - h * 0.6 + Math.sin(angle + 0.3) * len * 0.9);
    ctx.closePath();
    ctx.fill();
  }
  // Body: a plump brown ellipse, lighter on the belly.
  ctx.fillStyle = PALETTE.turkeyBody;
  ellipse(ctx, cx, base - h * 0.42, w * 0.36, h * 0.42);
  ctx.fillStyle = PALETTE.turkeyLight;
  ellipse(ctx, cx + 8, base - h * 0.32, w * 0.2, h * 0.26);
  // Wing, flapping a little with the run.
  const flap = Math.sin(phase * 2) * 3;
  ctx.fillStyle = PALETTE.turkeyDark;
  ctx.beginPath();
  ctx.ellipse(cx - 2, base - h * 0.42 + flap, w * 0.2, h * 0.2, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // Neck and head, up front.
  ctx.fillStyle = PALETTE.turkeyDark;
  ctx.fillRect(cx + w * 0.22, base - h * 0.95, 10, h * 0.55);
  ctx.fillStyle = PALETTE.head;
  circle(ctx, cx + w * 0.3, base - h * 0.98, 11);
  // Beak, wattle and snood.
  ctx.fillStyle = PALETTE.beak;
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.3 + 8, base - h * 0.98 - 2);
  ctx.lineTo(cx + w * 0.3 + 20, base - h * 0.98 + 2);
  ctx.lineTo(cx + w * 0.3 + 8, base - h * 0.98 + 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.wattle;
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.3 + 6, base - h * 0.98 + 10, 4, 7, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.snood;
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.3 + 2, base - h * 0.98 - 11, 3, 6, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Eye, always looking where it is running.
  ctx.fillStyle = '#241812';
  circle(ctx, cx + w * 0.3 + 4, base - h * 0.98 - 2, 2.2);
  // Running legs: two thin legs stepping in turn, or tucked when ducking.
  ctx.strokeStyle = PALETTE.leg;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  if (duck) {
    ctx.beginPath();
    ctx.moveTo(cx - 6, base - 6);
    ctx.lineTo(cx + 2, base);
    ctx.moveTo(cx + 8, base - 6);
    ctx.lineTo(cx + 14, base);
    ctx.stroke();
  } else {
    const stepA = Math.sin(phase) * 12;
    const stepB = Math.sin(phase + Math.PI) * 12;
    ctx.beginPath();
    ctx.moveTo(cx - 8, base - h * 0.14);
    ctx.lineTo(cx - 8 + stepA, base);
    ctx.moveTo(cx + 8, base - h * 0.14);
    ctx.lineTo(cx + 8 + stepB, base);
    ctx.stroke();
  }
  ctx.restore();
}

/** The farmer, mid-chase: straw hat, beard, green shirt, blue overalls, pitchfork in hand. */
export function drawFarmer(ctx, x, groundY, w, phase, mode) {
  const h = 96;
  const cx = x + w / 2;
  const base = groundY;
  const pump = Math.sin(phase) * 5;
  // Legs, pumping hard.
  ctx.strokeStyle = PALETTE.farmerOveralls;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  const stepA = Math.sin(phase) * 16;
  const stepB = Math.sin(phase + Math.PI) * 16;
  ctx.beginPath();
  ctx.moveTo(cx - 6, base - 44);
  ctx.lineTo(cx - 6 + stepA, base);
  ctx.moveTo(cx + 6, base - 44);
  ctx.lineTo(cx + 6 + stepB, base);
  ctx.stroke();
  // Overalls and shirt.
  ctx.fillStyle = PALETTE.farmerOveralls;
  ctx.fillRect(cx - 16, base - 62, 32, 22);
  ctx.fillStyle = PALETTE.farmerShirt;
  ctx.fillRect(cx - 18, base - 88, 36, 28);
  ctx.fillStyle = PALETTE.farmerOveralls;
  ctx.fillRect(cx - 14, base - 84, 6, 24);
  ctx.fillRect(cx + 8, base - 84, 6, 24);
  // Arms: one pumping, one holding the pitchfork up.
  ctx.strokeStyle = PALETTE.farmerShirt;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(cx - 16, base - 80);
  ctx.lineTo(cx - 26, base - 62 + pump);
  ctx.stroke();
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx + 18, base - 78);
  ctx.lineTo(cx + 30, base - 128);
  ctx.stroke();
  ctx.strokeStyle = '#c9ced6';
  ctx.lineWidth = 3;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(cx + 30 + i * 6, base - 128);
    ctx.lineTo(cx + 30 + i * 7, base - 142);
    ctx.stroke();
  }
  // Head, beard and straw hat.
  ctx.fillStyle = PALETTE.farmerSkin;
  circle(ctx, cx, base - 96, 13);
  ctx.fillStyle = PALETTE.farmerBeard;
  ctx.beginPath();
  ctx.ellipse(cx, base - 88, 11, 8, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = PALETTE.farmerHat;
  ctx.beginPath();
  ctx.ellipse(cx, base - 106, 20, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 11, base - 118, 22, 12);
  // Angry eyes; wide and worried while searching.
  ctx.fillStyle = '#241812';
  if (mode === 'search') {
    circle(ctx, cx - 5, base - 98, 2.6);
    circle(ctx, cx + 5, base - 98, 2.6);
  } else {
    ctx.fillRect(cx - 8, base - 101, 6, 2.4);
    ctx.fillRect(cx + 2, base - 101, 6, 2.4);
  }
  // A "?" bubble while he searches the yard.
  if (mode === 'search') {
    ctx.fillStyle = '#fff6e0';
    circle(ctx, cx + 26, base - 132, 13);
    ctx.fillStyle = '#3a2412';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', cx + 26, base - 131);
  }
}

/** The oven: a dark box with a glowing door window, knobs and a hot top. */
export function drawOven(ctx, x, y, w, h, time) {
  const glow = 0.6 + Math.sin(time * 5) * 0.25;
  ctx.fillStyle = PALETTE.oven;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#2c3038';
  ctx.fillRect(x + 6, y + 6, w - 12, 14);
  ctx.fillStyle = PALETTE.ovenGlow;
  ctx.globalAlpha = glow;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.58, w * 0.3, h * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.ovenDoor;
  ctx.fillRect(x + w * 0.16, y + h * 0.3, w * 0.68, h * 0.56);
  ctx.strokeStyle = '#565c68';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + w * 0.16, y + h * 0.3, w * 0.68, h * 0.56);
  ctx.fillStyle = PALETTE.ovenGlow;
  ctx.globalAlpha = glow;
  ctx.fillRect(x + w * 0.26, y + h * 0.42, w * 0.48, h * 0.32);
  ctx.globalAlpha = 1;
  // Knobs and a little steam.
  ctx.fillStyle = '#d8dde6';
  for (let i = 0; i < 3; i += 1) circle(ctx, x + w * (0.3 + i * 0.2), y + 13, 3.5);
  ctx.strokeStyle = 'rgba(255, 246, 224, 0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.3, y - 4);
  ctx.quadraticCurveTo(x + w * 0.3 + 6, y - 16, x + w * 0.3, y - 26);
  ctx.stroke();
}

/** A carving knife: bright blade, dark handle; `spin` rotates a thrown one. */
export function drawKnife(ctx, x, y, w, h, spin) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(spin);
  ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = PALETTE.knifeHandle;
  ctx.fillRect(0, h * 0.28, w * 0.32, h * 0.44);
  ctx.fillStyle = PALETTE.knifeBlade;
  ctx.beginPath();
  ctx.moveTo(w * 0.32, 0);
  ctx.lineTo(w, h * 0.5);
  ctx.lineTo(w * 0.32, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillRect(w * 0.42, h * 0.18, w * 0.4, 2);
  ctx.restore();
}

/** A wooden fence panel with two rails and a pointed post. */
export function drawFence(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.fence;
  ctx.fillRect(x + 2, y, 8, h);
  ctx.fillRect(x + w - 10, y, 8, h);
  ctx.fillStyle = PALETTE.fenceLight;
  ctx.fillRect(x, y + h * 0.25, w, 9);
  ctx.fillRect(x, y + h * 0.6, w, 9);
  ctx.fillStyle = PALETTE.fence;
  ctx.beginPath();
  ctx.moveTo(x + 2, y);
  ctx.lineTo(x + 6, y - 8);
  ctx.lineTo(x + 10, y);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + w - 10, y);
  ctx.lineTo(x + w - 6, y - 8);
  ctx.lineTo(x + w - 2, y);
  ctx.closePath();
  ctx.fill();
}

/** A round hay bale, tied with two bands. */
export function drawHay(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hay;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.hayDark;
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w * (0.12 + i * 0.09), h * (0.12 + i * 0.09), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = '#8a5a2e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.2, y + 4);
  ctx.lineTo(x + w * 0.2, y + h - 4);
  ctx.moveTo(x + w * 0.8, y + 4);
  ctx.lineTo(x + w * 0.8, y + h - 4);
  ctx.stroke();
}

/** A low branch the turkey must slide under: a tree limb drooping to head height. */
export function drawBranch(ctx, x, y, w, h) {
  // The limb reaches down from above, so the branch is anchored, not floating.
  ctx.strokeStyle = '#6e4520';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.85, y - 64);
  ctx.lineTo(x + w * 0.7, y + h * 0.5);
  ctx.stroke();
  ctx.fillStyle = '#6e4520';
  ctx.fillRect(x, y + h * 0.4, w, h * 0.28);
  ctx.fillStyle = '#4a7a3f';
  for (let i = 0; i < 5; i += 1) {
    const lx = x + 8 + i * (w - 16) / 4;
    ctx.beginPath();
    ctx.ellipse(lx, y + h * 0.3, 14, 9, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#e07b2e';
  circle(ctx, x + w * 0.25, y + h * 0.18, 6);
  circle(ctx, x + w * 0.7, y + h * 0.12, 6);
}

/** A rolling pumpkin with a carved grin. */
export function drawPumpkin(ctx, x, y, w, h, spin) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(Math.sin(spin) * 0.12);
  ctx.fillStyle = PALETTE.pumpkin;
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b45a1e';
  ctx.lineWidth = 3;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.ellipse(i * w * 0.16, 0, w * 0.18, h / 2 - 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#5a8a3f';
  ctx.fillRect(-3, -h / 2 - 6, 6, 10);
  ctx.fillStyle = '#241812';
  circle(ctx, -w * 0.16, -4, 3);
  circle(ctx, w * 0.16, -4, 3);
  ctx.beginPath();
  ctx.arc(0, 2, 10, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

/** A golden corn cob with green leaves. */
export function drawCorn(ctx, x, y, w, h, bob) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2 + Math.sin(bob) * 2);
  ctx.fillStyle = PALETTE.cornLeaf;
  ctx.beginPath();
  ctx.ellipse(-w * 0.32, 4, 6, 12, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w * 0.32, 4, 6, 12, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.corn;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.34, h * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9a83a';
  ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 4, -h * 0.36);
    ctx.lineTo(i * 4, h * 0.36);
    ctx.stroke();
  }
  ctx.restore();
}

/** A golden feather: the rare pickup, worth 50 and a breather from the farmer. */
export function drawFeather(ctx, x, y, w, h, bob) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2 + Math.sin(bob) * 3);
  ctx.rotate(Math.sin(bob * 0.7) * 0.25);
  ctx.fillStyle = PALETTE.feather;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.3, h * 0.48, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9a86a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.48);
  ctx.lineTo(0, h * 0.55);
  ctx.stroke();
  ctx.restore();
}

/** A slice of pumpkin pie: a whole life back. */
export function drawPie(ctx, x, y, w, h, bob) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2 + Math.sin(bob) * 2);
  ctx.fillStyle = PALETTE.pie;
  ctx.beginPath();
  ctx.moveTo(-w / 2, h * 0.3);
  ctx.lineTo(w / 2, h * 0.3);
  ctx.lineTo(w * 0.1, -h * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8b64c';
  ctx.beginPath();
  ctx.moveTo(-w / 2, h * 0.3);
  ctx.lineTo(w / 2, h * 0.3);
  ctx.lineTo(w / 2, h * 0.44);
  ctx.lineTo(-w / 2, h * 0.44);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff6e0';
  circle(ctx, 0, -h * 0.1, 5);
  ctx.restore();
}
