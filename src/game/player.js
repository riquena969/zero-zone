// O orbe: movimento 8-direções com clamp na grade. WALL bloqueia; CLAIMED é
// chão seguro caminhável (bola nunca entra lá). Módulo PURO.

import {
  OPEN,
  WALL,
  PLAYER_RADIUS,
  VAULT_TIME,
  VAULT_PRESS_MIN,
  VAULT_MAX_SCAN,
} from '../config.js';
import { moveAABB } from './collide.js';

const playerSolid = (s) => s === WALL;

export function makePlayer({ x, y }) {
  return { x, y, r: PLAYER_RADIUS, iframes: 0, vault: null };
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

// ---------- Vault: pular parede pronta ----------
// Segurar a direção contra uma parede por VAULT_TIME salta para a primeira
// célula livre do outro lado (até VAULT_MAX_SCAN células de espessura).
// Deslizar ao longo da parede mantém o canal; soltar ou trocar de direção zera.
// Pouso por conta e risco (sem i-frames). É o que garante zero softlock.

// Há parede colada na direção (ax, sign)? Sonda 1px além da borda do orbe,
// ao longo do vão do corpo.
function wallContact(player, grid, ax, sign) {
  const probe = player.r + 1;
  if (ax === 'x') {
    const x = player.x + sign * probe;
    const a = grid.cellAt(x, player.y - player.r + 1);
    const b = grid.cellAt(x, player.y + player.r - 1);
    for (let cy = a.cy; cy <= b.cy; cy++) {
      if (grid.get(a.cx, cy) === WALL) return true;
    }
  } else {
    const y = player.y + sign * probe;
    const a = grid.cellAt(player.x - player.r + 1, y);
    const b = grid.cellAt(player.x + player.r - 1, y);
    for (let cx = a.cx; cx <= b.cx; cx++) {
      if (grid.get(cx, a.cy) === WALL) return true;
    }
  }
  return false;
}

// Direção de vault pretendida: componente ≥ VAULT_PRESS_MIN pressionando
// contra parede em contato. Empate entre eixos → maior componente (x no empate).
function vaultDirection(player, grid, moveX, moveY) {
  const candidates = [];
  if (Math.abs(moveX) >= VAULT_PRESS_MIN && wallContact(player, grid, 'x', Math.sign(moveX))) {
    candidates.push({ ax: 'x', sign: Math.sign(moveX), mag: Math.abs(moveX) });
  }
  if (Math.abs(moveY) >= VAULT_PRESS_MIN && wallContact(player, grid, 'y', Math.sign(moveY))) {
    candidates.push({ ax: 'y', sign: Math.sign(moveY), mag: Math.abs(moveY) });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.mag - a.mag);
  return candidates[0];
}

// Ponto de pouso do outro lado da parede, ou null se a parede é grossa demais
// ou o orbe não cabe lá (corredor fino) — nesse caso o canal nem inicia.
function findLanding(player, grid, dir) {
  const start =
    dir.ax === 'x'
      ? grid.cellAt(player.x + dir.sign * (player.r + 1), player.y)
      : grid.cellAt(player.x, player.y + dir.sign * (player.r + 1));

  for (let k = 0; k <= VAULT_MAX_SCAN; k++) {
    const cx = dir.ax === 'x' ? start.cx + dir.sign * k : start.cx;
    const cy = dir.ax === 'y' ? start.cy + dir.sign * k : start.cy;
    const state = grid.get(cx, cy);
    if (state === WALL) continue;

    // primeira célula não-WALL após a parede → tenta pousar ali
    const rect = grid.cellRect(cx, cy);
    let x;
    let y;
    if (dir.ax === 'x') {
      x = dir.sign > 0 ? rect.x + player.r + 1 : rect.x + rect.w - player.r - 1;
      y = player.y;
    } else {
      y = dir.sign > 0 ? rect.y + player.r + 1 : rect.y + rect.h - player.r - 1;
      x = player.x;
    }
    if (fits(grid, x, y, player.r)) return { x, y };
    // segunda chance: centraliza no eixo transversal da célula de pouso
    if (dir.ax === 'x') y = rect.y + rect.h / 2;
    else x = rect.x + rect.w / 2;
    if (fits(grid, x, y, player.r)) return { x, y };
    return null;
  }
  return null; // parede mais grossa que VAULT_MAX_SCAN
}

export function updateVault(player, grid, moveX, moveY, dt) {
  const dir = vaultDirection(player, grid, moveX, moveY);
  if (!dir) {
    player.vault = null;
    return null;
  }
  const landing = findLanding(player, grid, dir);
  if (!landing) {
    player.vault = null;
    return null;
  }
  if (!player.vault || player.vault.ax !== dir.ax || player.vault.sign !== dir.sign) {
    player.vault = { ax: dir.ax, sign: dir.sign, progress: 0 };
  }
  player.vault.progress += dt;
  if (player.vault.progress >= VAULT_TIME) {
    player.x = landing.x;
    player.y = landing.y;
    player.vault = null;
    return { hopped: true };
  }
  return { channeling: true, progress: player.vault.progress / VAULT_TIME };
}
