import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WALL, CLAIMED, PLAYER_RADIUS } from '../src/config.js';
import { createGrid } from '../src/game/grid.js';
import { makePlayer, movePlayer, depenetrate } from '../src/game/player.js';

function makeGrid() {
  return createGrid({ cols: 10, rows: 8, cell: 8, originX: 0, originY: 56 });
}

test('makePlayer usa raio do config', () => {
  const p = makePlayer({ x: 40, y: 88 });
  assert.equal(p.r, PLAYER_RADIUS);
});

test('diagonal é normalizada (não anda mais rápido)', () => {
  const g = makeGrid();
  const reto = makePlayer({ x: 40, y: 88 });
  movePlayer(reto, g, 1, 0, 100, 0.1); // 10px
  const diag = makePlayer({ x: 40, y: 88 });
  movePlayer(diag, g, 1, 1, 100, 0.1);
  const dist = Math.hypot(diag.x - 40, diag.y - 88);
  assert.ok(Math.abs(dist - 10) < 0.01, `diagonal andou ${dist}, esperado 10`);
  assert.equal(reto.x - 40, 10);
});

test('WALL bloqueia o jogador', () => {
  const g = makeGrid();
  for (let cy = 0; cy < 8; cy++) g.set(5, cy, WALL); // px [40,48)
  const p = makePlayer({ x: 20, y: 88 });
  movePlayer(p, g, 1, 0, 1000, 0.1); // tenta atravessar
  assert.equal(p.x, 40 - p.r);
});

test('CLAIMED é chão caminhável para o jogador', () => {
  const g = makeGrid();
  for (let cy = 0; cy < 8; cy++) g.set(5, cy, CLAIMED);
  const p = makePlayer({ x: 20, y: 88 });
  movePlayer(p, g, 1, 0, 1000, 0.1);
  assert.ok(p.x > 48, `deveria atravessar área conquistada, ficou em ${p.x}`);
});

test('bordas da arena confinam o jogador', () => {
  const g = makeGrid();
  const p = makePlayer({ x: 40, y: 88 });
  movePlayer(p, g, -1, 0, 10000, 1);
  assert.equal(p.x, p.r); // borda esquerda em x=0
  movePlayer(p, g, 0, -1, 10000, 1);
  assert.equal(p.y, 56 + p.r); // topo da arena em y=56
});

test('depenetrate: jogador sobre parede recém-criada é empurrado para fora', () => {
  const g = makeGrid();
  const p = makePlayer({ x: 44, y: 92 }); // centro da célula (5,4)
  for (let cx = 0; cx < 10; cx++) g.set(cx, 4, WALL); // linha inteira vira WALL
  const moved = depenetrate(p, g);
  assert.ok(moved, 'reportou que moveu');
  // não pode mais sobrepor WALL: testa movendo 0 (colisão estática via clamp)
  const antes = { x: p.x, y: p.y };
  movePlayer(p, g, 0, 0, 100, 0.1);
  assert.deepEqual({ x: p.x, y: p.y }, antes, 'posição estável = livre de parede');
  // saiu da linha da parede (y fora de [88,96) expandido pelo raio)
  assert.ok(p.y <= 88 - p.r || p.y >= 96 + p.r, `ainda encostado: y=${p.y}`);
});

test('depenetrate sem sobreposição é no-op', () => {
  const g = makeGrid();
  const p = makePlayer({ x: 40, y: 70 });
  const moved = depenetrate(p, g);
  assert.equal(moved, false);
  assert.deepEqual({ x: p.x, y: p.y }, { x: 40, y: 70 });
});
