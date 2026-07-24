import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/game/rng.js';

test('mesma seed produz a mesma sequência', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});

test('valores sempre em [0, 1)', () => {
  const r = mulberry32(7);
  for (let i = 0; i < 1000; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1, `fora do intervalo: ${v}`);
  }
});

test('seeds diferentes produzem sequências diferentes', () => {
  const a = mulberry32(1);
  const b = mulberry32(2);
  const va = Array.from({ length: 10 }, a);
  const vb = Array.from({ length: 10 }, b);
  assert.notDeepEqual(va, vb);
});
