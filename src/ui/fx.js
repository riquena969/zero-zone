// Efeitos: pool de partículas (pixels neon), screen shake, micro hit-stop e
// flash de tela. O hit-stop congela o jogo E as partículas por ~80ms — é o que
// torna a quebra de parede legível mesmo acontecendo longe do jogador.

import { LOGICAL_W, LOGICAL_H } from '../config.js';

const MAX_PARTICLES = 600;

export function createFx() {
  const particles = [];
  let shake = 0;
  let hitStop = 0;
  let flashColor = null;
  let flashT = 0;
  let flashDur = 1;

  return {
    burst(x, y, color, { count = 12, speed = 160, life = 0.5, size = 3 } = {}) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.3 + Math.random() * 0.7);
        particles.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: life * (0.6 + Math.random() * 0.4),
          maxLife: life,
          color,
          size: size * (0.5 + Math.random()),
        });
      }
      if (particles.length > MAX_PARTICLES) {
        particles.splice(0, particles.length - MAX_PARTICLES);
      }
    },

    addShake(px) {
      shake = Math.max(shake, px);
    },

    addHitStop(t) {
      hitStop = Math.max(hitStop, t);
    },

    flash(color, dur = 0.18) {
      flashColor = color;
      flashT = dur;
      flashDur = dur;
    },

    // Avança os efeitos. Retorna true enquanto o hit-stop congela o mundo.
    tick(dt) {
      if (hitStop > 0) {
        hitStop -= dt;
        return true;
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
      }
      shake = Math.max(0, shake - 60 * dt);
      if (flashT > 0) flashT -= dt;
      return false;
    },

    offset(allowShake) {
      if (!allowShake || shake <= 0) return { x: 0, y: 0 };
      return { x: (Math.random() * 2 - 1) * shake, y: (Math.random() * 2 - 1) * shake };
    },

    draw(ctx, allowFlash) {
      if (particles.length) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const p of particles) {
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      if (allowFlash && flashT > 0 && flashColor) {
        ctx.save();
        ctx.globalAlpha = 0.22 * (flashT / flashDur);
        ctx.fillStyle = flashColor;
        ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    },
  };
}
