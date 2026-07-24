import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GRID_W,
  GRID_H,
  CELL,
  ARENA_Y,
  OPEN,
  CLAIMED,
  POWERUP_LIFETIME,
  POWERUP_MIN_PLAYER_DIST,
  POWERUP_MIN_BALL_DIST,
  POWERUP_INTERVAL,
} from '../src/config.js';
import { createGrid } from '../src/game/grid.js';
import { mulberry32 } from '../src/game/rng.js';
import { createPowerups, unlockedTypes } from '../src/game/powerups.js';

function arena() {
  return createGrid({ cols: GRID_W, rows: GRID_H, cell: CELL, originX: 0, originY: ARENA_Y });
}

const jogador = { x: 640, y: 388, r: 10 };
const bolaLonge = { x: 100, y: 120, r: 12 };

function avancar(mgr, ctx, segundos) {
  const evs = [];
  for (let t = 0; t < segundos; t += 0.5) evs.push(...mgr.update(0.5, ctx));
  return evs;
}

test('pool por zona: relógio na 3, escudo na 5, turbo na 7', () => {
  assert.deepEqual(unlockedTypes(1), []);
  assert.deepEqual(unlockedTypes(3), ['relogio']);
  assert.deepEqual(unlockedTypes(5), ['relogio', 'escudo']);
  assert.deepEqual(unlockedTypes(7), ['relogio', 'escudo', 'turbo']);
  assert.deepEqual(unlockedTypes(30), ['relogio', 'escudo', 'turbo']);
});

test('spawn: após o intervalo, em célula OPEN do componente do jogador, respeitando distâncias', () => {
  const g = arena();
  const mgr = createPowerups({ zone: 3, rng: mulberry32(42) });
  const ctx = { grid: g, player: jogador, balls: [bolaLonge] };
  const evs = avancar(mgr, ctx, POWERUP_INTERVAL + 1);
  assert.ok(evs.some((e) => e.type === 'powerupSpawn'), 'spawnou');
  const item = mgr.item;
  assert.ok(item);
  assert.equal(item.type, 'relogio');
  const c = g.cellAt(item.x, item.y);
  assert.equal(g.get(c.cx, c.cy), OPEN);
  assert.ok(Math.hypot(item.x - jogador.x, item.y - jogador.y) >= POWERUP_MIN_PLAYER_DIST);
  assert.ok(Math.hypot(item.x - bolaLonge.x, item.y - bolaLonge.y) >= POWERUP_MIN_BALL_DIST);
});

test('item expira após o lifetime', () => {
  const g = arena();
  const mgr = createPowerups({ zone: 3, rng: mulberry32(42) });
  const ctx = { grid: g, player: jogador, balls: [] };
  avancar(mgr, ctx, POWERUP_INTERVAL + 1);
  assert.ok(mgr.item);
  const evs = avancar(mgr, ctx, POWERUP_LIFETIME + 1);
  assert.ok(evs.some((e) => e.type === 'powerupExpired'), 'expirou');
  assert.equal(mgr.item, null);
});

test('item some se o chão dele deixar de ser OPEN (parede/conquista em cima)', () => {
  const g = arena();
  const mgr = createPowerups({ zone: 3, rng: mulberry32(42) });
  const ctx = { grid: g, player: jogador, balls: [] };
  avancar(mgr, ctx, POWERUP_INTERVAL + 1);
  const c = g.cellAt(mgr.item.x, mgr.item.y);
  g.set(c.cx, c.cy, CLAIMED);
  const evs = mgr.update(0.1, ctx);
  assert.ok(evs.some((e) => e.type === 'powerupExpired'));
  assert.equal(mgr.item, null);
});

test('tryCollect: só com sobreposição real', () => {
  const g = arena();
  const mgr = createPowerups({ zone: 3, rng: mulberry32(42) });
  const ctx = { grid: g, player: jogador, balls: [] };
  avancar(mgr, ctx, POWERUP_INTERVAL + 1);
  const item = mgr.item;
  assert.equal(mgr.tryCollect(jogador), null, 'longe: não coleta');
  const emCima = { x: item.x, y: item.y, r: 10 };
  assert.equal(mgr.tryCollect(emCima), 'relogio');
  assert.equal(mgr.item, null, 'coletado some');
});

test('spawn nunca acontece fora do componente do jogador', () => {
  const g = arena();
  // divide a arena: jogador à esquerda, componente da direita separado
  for (let cy = 0; cy < g.rows; cy++) g.set(80, cy, 1); // WALL
  const jogadorEsq = { x: 200, y: 388, r: 10 };
  const mgr = createPowerups({ zone: 3, rng: mulberry32(7) });
  const ctx = { grid: g, player: jogadorEsq, balls: [] };
  for (let i = 0; i < 5; i++) {
    avancar(mgr, ctx, POWERUP_INTERVAL + 1);
    if (mgr.item) {
      assert.ok(mgr.item.x < g.cellRect(80, 0).x, `item à esquerda: x=${mgr.item.x}`);
      // consome para forçar próximo spawn
      mgr.tryCollect({ x: mgr.item.x, y: mgr.item.y, r: 10 });
    }
  }
});
