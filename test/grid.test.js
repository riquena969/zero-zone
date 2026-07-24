import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPEN, WALL, CLAIMED } from '../src/config.js';
import { createGrid } from '../src/game/grid.js';

// Grade pequena para casos verificáveis à mão: 10 colunas × 8 linhas.
function makeGrid() {
  return createGrid({ cols: 10, rows: 8, cell: 8, originX: 0, originY: 56 });
}

test('grade nova: tudo OPEN, cobertura zero', () => {
  const g = makeGrid();
  const c = g.counts();
  assert.deepEqual(c, { open: 80, wall: 0, claimed: 0 });
  assert.equal(g.coveredFraction(), 0);
});

test('get fora dos limites retorna WALL (mundo é sólido)', () => {
  const g = makeGrid();
  assert.equal(g.get(-1, 0), WALL);
  assert.equal(g.get(0, -1), WALL);
  assert.equal(g.get(10, 0), WALL);
  assert.equal(g.get(0, 8), WALL);
  assert.equal(g.get(0, 0), OPEN);
});

test('set/get faz roundtrip e counts acompanham', () => {
  const g = makeGrid();
  g.set(3, 2, WALL);
  g.set(4, 2, CLAIMED);
  assert.equal(g.get(3, 2), WALL);
  assert.equal(g.get(4, 2), CLAIMED);
  assert.deepEqual(g.counts(), { open: 78, wall: 1, claimed: 1 });
  assert.equal(g.coveredFraction(), 2 / 80);
});

test('cellAt converte px lógicos → célula respeitando a origem', () => {
  const g = makeGrid();
  assert.deepEqual(g.cellAt(0, 56), { cx: 0, cy: 0 });
  assert.deepEqual(g.cellAt(7.9, 63.9), { cx: 0, cy: 0 });
  assert.deepEqual(g.cellAt(8, 64), { cx: 1, cy: 1 });
  assert.deepEqual(g.cellAt(79.9, 119.9), { cx: 9, cy: 7 });
});

test('cellRect é o inverso de cellAt', () => {
  const g = makeGrid();
  const r = g.cellRect(2, 3);
  assert.deepEqual(r, { x: 16, y: 80, w: 8, h: 8 });
  assert.deepEqual(g.cellAt(r.x + 4, r.y + 4), { cx: 2, cy: 3 });
});

test('analyze: grade vazia é um único componente com todas as células', () => {
  const g = makeGrid();
  const { comp, count, sizes } = g.analyze();
  assert.equal(count, 1);
  assert.equal(sizes[0], 80);
  assert.equal(comp[g.idx(0, 0)], comp[g.idx(9, 7)]);
});

test('parede vertical completa divide em 2 componentes', () => {
  const g = makeGrid();
  for (let cy = 0; cy < 8; cy++) g.set(4, cy, WALL);
  const { comp, count, sizes } = g.analyze();
  assert.equal(count, 2);
  assert.notEqual(comp[g.idx(0, 0)], comp[g.idx(9, 0)]);
  // 4 colunas à esquerda (0-3) e 5 à direita (5-9)
  assert.deepEqual([...sizes].sort((a, b) => a - b), [32, 40]);
  // células WALL não pertencem a componente algum
  assert.equal(comp[g.idx(4, 0)], -1);
});

test('toco incompleto NÃO divide o componente', () => {
  const g = makeGrid();
  for (let cy = 0; cy < 5; cy++) g.set(4, cy, WALL); // para no meio
  const { count } = g.analyze();
  assert.equal(count, 1);
});

test('claimWhere claima componentes fora do keepSet e preserva o total', () => {
  const g = makeGrid();
  for (let cy = 0; cy < 8; cy++) g.set(4, cy, WALL);
  const { comp } = g.analyze();
  const compEsq = comp[g.idx(0, 0)];
  // manter a esquerda (como se a bola estivesse lá) → claima a direita (5 colunas = 40)
  const claimed = g.claimWhere(comp, new Set([compEsq]));
  assert.equal(claimed, 40);
  assert.equal(g.get(9, 0), CLAIMED);
  assert.equal(g.get(0, 0), OPEN);
  const c = g.counts();
  assert.equal(c.open + c.wall + c.claimed, 80);
  assert.deepEqual(c, { open: 32, wall: 8, claimed: 40 });
});

test('rects: forma em L decompõe cobrindo exatamente as células', () => {
  const g = makeGrid();
  // L: linha horizontal (0-4, y=0) + perna vertical (x=0, y=0-3)
  for (let cx = 0; cx <= 4; cx++) g.set(cx, 0, WALL);
  for (let cy = 0; cy <= 3; cy++) g.set(0, cy, WALL);
  const rects = g.rects(WALL);
  // cobertura exata: soma das áreas = nº de células WALL, sem sobreposição
  const total = rects.reduce((s, r) => s + r.w * r.h, 0);
  assert.equal(total, g.counts().wall);
  const seen = new Set();
  for (const r of rects) {
    for (let dy = 0; dy < r.h; dy++) {
      for (let dx = 0; dx < r.w; dx++) {
        const key = `${r.cx + dx},${r.cy + dy}`;
        assert.ok(!seen.has(key), `sobreposição em ${key}`);
        seen.add(key);
        assert.equal(g.get(r.cx + dx, r.cy + dy), WALL);
      }
    }
  }
});

test('property: 200 sequências de paredes aleatórias preservam invariantes', async () => {
  const { mulberry32 } = await import('../src/game/rng.js');
  for (let seed = 1; seed <= 200; seed++) {
    const rnd = mulberry32(seed);
    const g = makeGrid();
    // pinta paredes aleatórias
    for (let i = 0; i < 20; i++) {
      g.set(Math.floor(rnd() * 10), Math.floor(rnd() * 8), WALL);
    }
    const { comp, sizes } = g.analyze();
    // toda célula OPEN tem componente; nenhuma WALL tem
    let openCount = 0;
    for (let cy = 0; cy < 8; cy++) {
      for (let cx = 0; cx < 10; cx++) {
        const c = comp[g.idx(cx, cy)];
        if (g.get(cx, cy) === OPEN) {
          openCount++;
          assert.ok(c >= 0);
        } else {
          assert.equal(c, -1);
        }
      }
    }
    assert.equal(sizes.reduce((a, b) => a + b, 0), openCount);
    const c = g.counts();
    assert.equal(c.open + c.wall + c.claimed, 80);
  }
});
