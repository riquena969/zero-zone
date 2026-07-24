import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPEN, WALL } from '../src/config.js';
import { createGrid } from '../src/game/grid.js';
import { moveAABB, circlesOverlap } from '../src/game/collide.js';

// Arena de teste: 10×8 células de 8px, origem (0, 56) → px x∈[0,80], y∈[56,120]
function makeGrid() {
  return createGrid({ cols: 10, rows: 8, cell: 8, originX: 0, originY: 56 });
}
const solid = (s) => s !== OPEN;

test('movimento livre chega exato ao destino', () => {
  const g = makeGrid();
  const r = moveAABB(g, 20, 80, 4, 10, -5, solid);
  assert.equal(r.x, 30);
  assert.equal(r.y, 75);
  assert.equal(r.hitX, false);
  assert.equal(r.hitY, false);
});

test('borda da arena é sólida: clampa e reporta hit', () => {
  const g = makeGrid();
  // borda direita em x=80; entidade half=4 → centro máximo 76
  const r = moveAABB(g, 70, 80, 4, 20, 0, solid);
  assert.equal(r.x, 76);
  assert.equal(r.hitX, true);
  // borda de cima da arena em y=56 → centro mínimo 60
  const r2 = moveAABB(g, 40, 62, 4, 0, -20, solid);
  assert.equal(r2.y, 60);
  assert.equal(r2.hitY, true);
});

test('coluna WALL bloqueia pela esquerda e pela direita', () => {
  const g = makeGrid();
  for (let cy = 0; cy < 8; cy++) g.set(5, cy, WALL); // px x∈[40,48)
  const vindoDaEsquerda = moveAABB(g, 20, 80, 4, 30, 0, solid);
  assert.equal(vindoDaEsquerda.x, 36); // 40 - 4
  assert.equal(vindoDaEsquerda.hitX, true);
  const vindoDaDireita = moveAABB(g, 70, 80, 4, -40, 0, solid);
  assert.equal(vindoDaDireita.x, 52); // 48 + 4
  assert.equal(vindoDaDireita.hitX, true);
});

test('anti-tunneling: deslocamento maior que a célula não atravessa', () => {
  const g = makeGrid();
  for (let cy = 0; cy < 8; cy++) g.set(5, cy, WALL);
  // 60px num tick só (7,5 células) — precisa parar na parede mesmo assim
  const r = moveAABB(g, 10, 80, 4, 60, 0, solid);
  assert.equal(r.x, 36);
  assert.equal(r.hitX, true);
});

test('desliza: parede só no eixo X deixa o Y andar', () => {
  const g = makeGrid();
  for (let cy = 0; cy < 8; cy++) g.set(5, cy, WALL);
  const r = moveAABB(g, 30, 80, 4, 20, 10, solid);
  assert.equal(r.x, 36); // clampou no X
  assert.equal(r.y, 90); // Y seguiu
  assert.equal(r.hitX, true);
  assert.equal(r.hitY, false);
});

test('parede horizontal bloqueia no eixo Y', () => {
  const g = makeGrid();
  for (let cx = 0; cx < 10; cx++) g.set(cx, 4, WALL); // px y∈[88,96)
  const descendo = moveAABB(g, 40, 70, 4, 0, 40, solid);
  assert.equal(descendo.y, 84); // 88 - 4
  assert.equal(descendo.hitY, true);
  const subindo = moveAABB(g, 40, 110, 4, 0, -40, solid);
  assert.equal(subindo.y, 100); // 96 + 4
  assert.equal(subindo.hitY, true);
});

test('entidade alinhada exatamente na fronteira da célula não colide fantasma', () => {
  const g = makeGrid();
  for (let cy = 0; cy < 8; cy++) g.set(5, cy, WALL);
  // encostada na parede (x=36, borda direita do AABB em 40 = face da parede):
  // mover só no Y não pode reportar hitX nem grudar
  const r = moveAABB(g, 36, 80, 4, 0, 8, solid);
  assert.equal(r.y, 88);
  assert.equal(r.hitY, false);
});

test('circlesOverlap: sobreposição estrita, tangente não conta', () => {
  assert.equal(circlesOverlap(0, 0, 5, 8, 0, 5), true); // dist 8 < 10
  assert.equal(circlesOverlap(0, 0, 5, 10, 0, 5), false); // tangente (dist = soma)
  assert.equal(circlesOverlap(0, 0, 5, 20, 0, 5), false);
  assert.equal(circlesOverlap(3, 4, 3, 3, 4, 2), true); // concêntricos
});
