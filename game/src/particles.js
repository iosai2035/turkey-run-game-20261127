// Pooled particles and floating score pops: the game's juice. One fixed pool, recycled
// forever, so a frame never allocates. Particles never change gameplay, only how it reads:
// feathers burst from a hit, dust puffs under running feet, kernels pop from corn,
// confetti rains on an escape.

import { FIELD } from './config.js';

const POOL_SIZE = 220;
const POP_SIZE = 24;

export function createParticles() {
  const pool = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 4, color: '#fff', gravity: 0, spin: 0, shape: 0 });
  }
  const pops = [];
  for (let index = 0; index < POP_SIZE; index += 1) {
    pops.push({ active: false, x: 0, y: 0, life: 0, maxLife: 1, text: '', color: '#fff', size: 22 });
  }

  function spawn(x, y, vx, vy, life, size, color, gravity, shape) {
    for (let index = 0; index < pool.length; index += 1) {
      const p = pool[index];
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.maxLife = life;
      p.size = size;
      p.color = color;
      p.gravity = gravity;
      p.spin = (Math.random() - 0.5) * 8;
      p.shape = shape;
      return;
    }
  }

  function burst(x, y, count, colors, speed, size, gravity, shape) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      spawn(x, y, Math.cos(angle) * v, Math.sin(angle) * v - speed * 0.3, 0.5 + Math.random() * 0.5, size * (0.7 + Math.random() * 0.6), colors[i % colors.length], gravity, shape);
    }
  }

  function pop(x, y, text, color, size) {
    for (let index = 0; index < pops.length; index += 1) {
      const p = pops[index];
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.life = 0.9;
      p.maxLife = 0.9;
      p.text = text;
      p.color = color;
      p.size = size || 22;
      return;
    }
  }

  function step(dt) {
    for (let index = 0; index < pool.length; index += 1) {
      const p = pool[index];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > FIELD.groundY + 4) {
        p.y = FIELD.groundY + 4;
        p.vy *= -0.35;
        p.vx *= 0.7;
      }
    }
    for (let index = 0; index < pops.length; index += 1) {
      const p = pops[index];
      if (!p.active) continue;
      p.life -= dt;
      p.y -= 42 * dt;
      if (p.life <= 0) p.active = false;
    }
  }

  return {
    pool,
    pops,
    spawn,
    burst,
    pop,
    step,
    feathers(x, y) {
      burst(x, y, 16, ['#8a5230', '#e8a33c', '#f2ead8', '#a0522d'], 260, 6, 900, 1);
    },
    dust(x, y) {
      burst(x, y, 4, ['#c98f3d', '#a9713a'], 60, 5, 120, 0);
    },
    kernels(x, y) {
      burst(x, y, 8, ['#f2c94c', '#e8a33c'], 200, 4, 700, 0);
    },
    confetti(x, y) {
      burst(x, y, 26, ['#e5534b', '#f2c94c', '#7ac74f', '#4a90d9', '#e8a33c'], 320, 6, 420, 2);
    },
  };
}
