// O orbe: movimento 8-direções com clamp na grade. WALL bloqueia; CLAIMED é
// chão seguro caminhável (bola nunca entra lá). Módulo PURO.

import { OPEN, WALL, PLAYER_RADIUS } from '../config.js';
import { moveAABB } from './collide.js';

const playerSolid = (s) => s === WALL;

export function makePlayer({ x, y }) {
  return { x, y, r: PLAYER_RADIUS, iframes: 0 };
}

export function movePlayer(player, grid, moveX, moveY, speed, dt) {
  let mx = moveX;
  let my = moveY;
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }
  const res = moveAABB(grid, player.x, player.y, player.r, mx * speed * dt, my * speed * dt, playerSolid);
  player.x = res.x;
  player.y = res.y;
  return res;
}

// O orbe cabe em (x, y) sem sobrepor parede?
export function fits(grid, x, y, half) {
  const EPS = 0.001;
  const a = grid.cellAt(x - half, y - half);
  const b = grid.cellAt(x + half - EPS, y + half - EPS);
  for (let cy = a.cy; cy <= b.cy; cy++) {
    for (let cx = a.cx; cx <= b.cx; cx++) {
      if (playerSolid(grid.get(cx, cy))) return false;
    }
  }
  return true;
}

// Quando uma parede completa embaixo do jogador, empurra para o espaço livre
// mais próximo (BFS a partir da célula atual). Retorna true se moveu.
export function depenetrate(player, grid) {
  if (fits(grid, player.x, player.y, player.r)) return false;

  const start = grid.cellAt(player.x, player.y);
  const seen = new Set();
  const queue = [[start.cx, start.cy]];
  seen.add(`${start.cx},${start.cy}`);

  while (queue.length) {
    const [cx, cy] = queue.shift();
    if (grid.get(cx, cy) !== WALL) {
      const r = grid.cellRect(cx, cy);
      const x = r.x + r.w / 2;
      const y = r.y + r.h / 2;
      if (fits(grid, x, y, player.r)) {
        player.x = x;
        player.y = y;
        return true;
      }
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key) || nx < 0 || ny < 0 || nx >= grid.cols || ny >= grid.rows) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  return false; // teoricamente impossível: sempre há espaço aberto na arena
}

// Ponto mais seguro do componente que contém (refX, refY): a célula OPEN onde o
// orbe cabe que MAXIMIZA a distância à bola mais próxima do mesmo componente.
// Usado no respawn após morte e na realocação pós-conquista.
export function safestPoint(grid, balls, refX, refY, playerR) {
  const { comp } = grid.analyze();
  const refCell = grid.cellAt(refX, refY);
  let refComp = comp[grid.idx(refCell.cx, refCell.cy)];

  // ref não está numa célula OPEN (ex.: sobre CLAIMED) → usa o componente da
  // célula aberta mais próxima
  if (refComp === undefined || refComp < 0) {
    let nearest = null;
    for (let cy = 0; cy < grid.rows; cy++) {
      for (let cx = 0; cx < grid.cols; cx++) {
        if (grid.get(cx, cy) !== OPEN) continue;
        const r = grid.cellRect(cx, cy);
        const x = r.x + r.w / 2;
        const y = r.y + r.h / 2;
        const d = (x - refX) ** 2 + (y - refY) ** 2;
        if (!nearest || d < nearest.d) nearest = { d, comp: comp[grid.idx(cx, cy)] };
      }
    }
    if (!nearest) return null;
    refComp = nearest.comp;
  }

  const bolasDoComp = balls.filter((b) => {
    const c = grid.cellAt(b.x, b.y);
    return comp[grid.idx(c.cx, c.cy)] === refComp;
  });

  let best = null;
  for (let cy = 0; cy < grid.rows; cy++) {
    for (let cx = 0; cx < grid.cols; cx++) {
      if (comp[grid.idx(cx, cy)] !== refComp) continue;
      const r = grid.cellRect(cx, cy);
      const x = r.x + r.w / 2;
      const y = r.y + r.h / 2;
      if (!fits(grid, x, y, playerR)) continue;
      let score;
      if (bolasDoComp.length) {
        let minD = Infinity;
        for (const b of bolasDoComp) {
          minD = Math.min(minD, Math.hypot(x - b.x, y - b.y) - b.r);
        }
        score = minD;
      } else {
        score = -((x - refX) ** 2 + (y - refY) ** 2); // sem bolas: fica perto do ref
      }
      if (!best || score > best.score) best = { x, y, score };
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}
