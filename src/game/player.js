// O orbe: movimento 8-direções com clamp na grade. WALL bloqueia; CLAIMED é
// chão seguro caminhável (bola nunca entra lá). Módulo PURO.

import { WALL, PLAYER_RADIUS } from '../config.js';
import { moveAABB } from './collide.js';

const playerSolid = (s) => s === WALL;

export function makePlayer({ x, y }) {
  return { x, y, r: PLAYER_RADIUS };
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
