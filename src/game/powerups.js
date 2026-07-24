// Power-ups: nascem no componente do jogador (onde a ação está), longe dele e
// das bolas — coletar exige se expor. Um item por vez; expira; some se o chão
// dele deixar de ser OPEN. Bolas ignoram itens. Módulo PURO.
// Efeitos (relógio/escudo/turbo) são aplicados pelo game.js na coleta.

import {
  OPEN,
  POWERUP_UNLOCK,
  POWERUP_INTERVAL,
  POWERUP_RETRY,
  POWERUP_LIFETIME,
  POWERUP_RADIUS,
  POWERUP_MIN_PLAYER_DIST,
  POWERUP_MIN_BALL_DIST,
} from '../config.js';
import { circlesOverlap } from './collide.js';

export function unlockedTypes(zone) {
  return Object.keys(POWERUP_UNLOCK).filter((t) => zone >= POWERUP_UNLOCK[t]);
}

export function createPowerups({ zone, rng }) {
  const pool = unlockedTypes(zone);

  const mgr = {
    item: null, // { type, x, y, r, age }
    spawnTimer: POWERUP_INTERVAL,

    update(dt, { grid, player, balls }) {
      const events = [];
      if (!pool.length) return events;

      if (mgr.item) {
        mgr.item.age += dt;
        const c = grid.cellAt(mgr.item.x, mgr.item.y);
        const sumiu = mgr.item.age >= POWERUP_LIFETIME || grid.get(c.cx, c.cy) !== OPEN;
        if (sumiu) {
          mgr.item = null;
          mgr.spawnTimer = POWERUP_INTERVAL;
          events.push({ type: 'powerupExpired' });
        }
        return events;
      }

      mgr.spawnTimer -= dt;
      if (mgr.spawnTimer > 0) return events;

      const pos = findSpot(grid, player, balls, rng);
      if (!pos) {
        mgr.spawnTimer = POWERUP_RETRY; // arena apertada agora; tenta já já
        return events;
      }
      mgr.item = {
        type: pool[Math.floor(rng() * pool.length)],
        x: pos.x,
        y: pos.y,
        r: POWERUP_RADIUS,
        age: 0,
      };
      mgr.spawnTimer = POWERUP_INTERVAL;
      events.push({ type: 'powerupSpawn', ptype: mgr.item.type });
      return events;
    },

    tryCollect(player) {
      const it = mgr.item;
      if (!it) return null;
      if (!circlesOverlap(player.x, player.y, player.r, it.x, it.y, it.r)) return null;
      mgr.item = null;
      mgr.spawnTimer = POWERUP_INTERVAL;
      return it.type;
    },
  };

  // Célula OPEN aleatória do componente do jogador respeitando distâncias.
  function findSpot(grid, player, balls, rnd) {
    const { comp } = grid.analyze();
    const pc = grid.cellAt(player.x, player.y);
    const playerComp = comp[grid.idx(pc.cx, pc.cy)];

    const candidates = [];
    for (let cy = 0; cy < grid.rows; cy++) {
      for (let cx = 0; cx < grid.cols; cx++) {
        if (comp[grid.idx(cx, cy)] !== playerComp) continue;
        const r = grid.cellRect(cx, cy);
        const x = r.x + r.w / 2;
        const y = r.y + r.h / 2;
        if (Math.hypot(x - player.x, y - player.y) < POWERUP_MIN_PLAYER_DIST) continue;
        if (balls.some((b) => Math.hypot(x - b.x, y - b.y) < POWERUP_MIN_BALL_DIST)) continue;
        candidates.push({ x, y });
      }
    }
    if (!candidates.length) return null;
    return candidates[Math.floor(rnd() * candidates.length)];
  }

  return mgr;
}
