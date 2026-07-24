import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPEN, WALL, CLAIMED } from '../src/config.js';
import { createGrid } from '../src/game/grid.js';
import { spawnWall, stepWall, pendingCells } from '../src/game/walls.js';

function makeGrid() {
  return createGrid({ cols: 10, rows: 8, cell: 8, originX: 0, originY: 56 });
}

// tipSpeed de teste: 80 px/s = 10 células/s → fácil de raciocinar com dt=0.1 (1 célula/step)
const SPEED = 80;
const dt = 0.1;

test('spawn exige célula OPEN', () => {
  const g = makeGrid();
  assert.ok(spawnWall({ grid: g, axis: 'h', cx: 5, cy: 4 }));
  g.set(5, 4, CLAIMED);
  assert.equal(spawnWall({ grid: g, axis: 'h', cx: 5, cy: 4 }), null);
});

test('crescimento commita células pendentes simétricas sem tocar a grade', () => {
  const g = makeGrid();
  const w = spawnWall({ grid: g, axis: 'h', cx: 5, cy: 4 });
  stepWall(w, g, [], dt, SPEED); // 8px por ponta → entra na 1ª célula de cada lado
  const pend = pendingCells(w);
  // origem + 1 de cada lado
  assert.equal(pend.length, 3);
  assert.equal(g.counts().wall, 0, 'pendentes não são WALL na grade ainda');
});

test('metade que alcança a borda ancora: células + origem viram WALL', () => {
  const g = makeGrid();
  const w = spawnWall({ grid: g, axis: 'h', cx: 1, cy: 4 }); // 1 célula até a borda esquerda
  let anchored = false;
  for (let i = 0; i < 20 && !anchored; i++) {
    const r = stepWall(w, g, [], dt, SPEED);
    anchored = r.events.some((e) => e.type === 'anchor');
  }
  assert.ok(anchored, 'ancorou');
  assert.equal(g.get(0, 4), WALL, 'célula da metade esquerda');
  assert.equal(g.get(1, 4), WALL, 'origem committada junto');
});

test('parede horizontal completa: duas âncoras, evento complete, linha inteira WALL', () => {
  const g = makeGrid();
  const w = spawnWall({ grid: g, axis: 'h', cx: 5, cy: 4 });
  let completed = false;
  for (let i = 0; i < 50 && !completed; i++) {
    completed = stepWall(w, g, [], dt, SPEED).completed;
  }
  assert.ok(completed);
  for (let cx = 0; cx < 10; cx++) assert.equal(g.get(cx, 4), WALL, `célula ${cx}`);
  assert.equal(g.counts().wall, 10);
});

test('parede vertical completa fecha a coluna', () => {
  const g = makeGrid();
  const w = spawnWall({ grid: g, axis: 'v', cx: 3, cy: 4 });
  let completed = false;
  for (let i = 0; i < 50 && !completed; i++) {
    completed = stepWall(w, g, [], dt, SPEED).completed;
  }
  assert.ok(completed);
  for (let cy = 0; cy < 8; cy++) assert.equal(g.get(3, cy), WALL);
});

test('bola encosta em pendente: quebra; metade ancorada FICA, pendentes somem', () => {
  const g = makeGrid();
  const w = spawnWall({ grid: g, axis: 'h', cx: 1, cy: 4 });
  // deixa a metade esquerda ancorar (1 célula até a borda)
  stepWall(w, g, [], dt, SPEED);
  stepWall(w, g, [], dt, SPEED);
  assert.ok(w.neg.anchored, 'esquerda ancorada');
  const wallsAntes = g.counts().wall;
  assert.ok(wallsAntes >= 2, 'esquerda + origem na grade');
  // bola parada em cima do caminho da metade direita (célula 4, centro px 36, 92)
  const bola = { x: 36, y: 92, r: 6 };
  let shattered = false;
  for (let i = 0; i < 20 && !shattered; i++) {
    shattered = stepWall(w, g, [bola], dt, SPEED).shattered;
  }
  assert.ok(shattered, 'quebrou');
  assert.equal(g.counts().wall, wallsAntes, 'ancorada preservada, nada novo');
  assert.equal(pendingCells(w).length, 0, 'pendentes descartadas');
  assert.ok(w.done);
});

test('quebra sem nenhuma âncora: grade permanece intacta', () => {
  const g = makeGrid();
  const w = spawnWall({ grid: g, axis: 'h', cx: 5, cy: 4 });
  const bola = { x: 36, y: 92, r: 6 }; // célula (4,4), vizinha da origem
  let shattered = false;
  for (let i = 0; i < 10 && !shattered; i++) {
    shattered = stepWall(w, g, [bola], dt, SPEED).shattered;
  }
  assert.ok(shattered);
  assert.equal(g.counts().wall, 0, 'nada virou WALL');
});

test('metade zero: origem encostada na borda ancora no primeiro step', () => {
  const g = makeGrid();
  const w = spawnWall({ grid: g, axis: 'h', cx: 0, cy: 4 }); // colada na esquerda
  const r = stepWall(w, g, [], dt, SPEED);
  assert.ok(w.neg.anchored, 'metade esquerda ancorou imediatamente');
  assert.ok(r.events.some((e) => e.type === 'anchor'));
  assert.equal(g.get(0, 4), WALL, 'origem committada');
});

test('ponta ancora em toco antigo no meio do caminho', () => {
  const g = makeGrid();
  g.set(7, 4, WALL); // toco
  const w = spawnWall({ grid: g, axis: 'h', cx: 5, cy: 4 });
  let completed = false;
  for (let i = 0; i < 50 && !completed; i++) {
    completed = stepWall(w, g, [], dt, SPEED).completed;
  }
  assert.ok(completed);
  assert.equal(g.get(6, 4), WALL, 'parou colado no toco');
  assert.equal(g.get(7, 4), WALL, 'toco original');
  // esquerda foi até a borda: 0..6 + toco 7 = 8 células WALL na linha
  let wallsNaLinha = 0;
  for (let cx = 0; cx < 10; cx++) if (g.get(cx, 4) === WALL) wallsNaLinha++;
  assert.equal(wallsNaLinha, 8);
});
