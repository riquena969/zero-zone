import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createScoring } from '../src/game/scoring.js';

test('fill básico: fração × 100 pts/% × zona', () => {
  const s = createScoring();
  const r = s.onFill(0.1, 1); // 10% na zona 1
  assert.equal(r.points, 1000);
  assert.equal(r.doubled, false);
  assert.equal(s.score, 1000);
  assert.equal(s.combo, 1);
});

test('big chunk: exatamente 15% dobra; 14,99% não', () => {
  const dobra = createScoring();
  const r1 = dobra.onFill(0.15, 1);
  assert.equal(r1.doubled, true);
  assert.equal(r1.points, 3000); // 15 × 100 × 2

  const naoDobra = createScoring();
  const r2 = naoDobra.onFill(0.1499, 1);
  assert.equal(r2.doubled, false);
});

test('combo: fills consecutivos sobem o multiplicador; quebra zera', () => {
  const s = createScoring();
  s.onFill(0.1, 1); // 1000, combo 0→1
  const r2 = s.onFill(0.1, 1); // mult 1.5 → 1500
  assert.equal(r2.points, 1500);
  assert.equal(s.combo, 2);
  s.onShatter();
  assert.equal(s.combo, 0);
  const r3 = s.onFill(0.1, 1);
  assert.equal(r3.points, 1000, 'voltou ao mult base');
});

test('morte também zera o combo', () => {
  const s = createScoring();
  s.onFill(0.1, 1);
  s.onDeath();
  assert.equal(s.combo, 0);
});

test('multiplicador de combo tem teto', () => {
  const s = createScoring();
  for (let i = 0; i < 20; i++) s.onFill(0.01, 1);
  const r = s.onFill(0.1, 1);
  assert.equal(r.points, 4000, 'mult travado em 4×'); // 10 × 100 × 1 × 4
});

test('multiplicador da zona escala os pontos', () => {
  const s = createScoring();
  const r = s.onFill(0.1, 5);
  assert.equal(r.points, 5000);
});

test('bônus de zona: vidas + excedente + tempo', () => {
  const s = createScoring();
  const b = s.zoneBonus({ lives: 3, covered: 0.78, target: 0.7, timeLeft: 30 });
  assert.equal(b.livesBonus, 1500); // 3 × 500
  assert.equal(b.excessBonus, 800); // 8% × 100
  assert.equal(b.timeBonus, 1500); // 30 × 50
  assert.equal(b.total, 3800);
  assert.equal(s.score, 3800);
});

test('score é sempre inteiro', () => {
  const s = createScoring();
  s.onFill(0.1337, 3);
  s.onFill(0.0071, 7);
  s.zoneBonus({ lives: 2, covered: 0.777, target: 0.75, timeLeft: 12.34 });
  assert.equal(s.score, Math.floor(s.score));
});

test('stats da run acumulam', () => {
  const s = createScoring();
  s.onWallComplete();
  s.onWallComplete();
  s.onShatter();
  s.onFill(0.2, 1);
  s.onFill(0.05, 1);
  s.onDeath();
  s.onFill(0.1, 2);
  s.setZone(2);
  assert.equal(s.stats.wallsBuilt, 2);
  assert.equal(s.stats.wallsShattered, 1);
  assert.equal(s.stats.maxCombo, 2);
  assert.equal(s.stats.biggestFillPct, 0.2);
  assert.equal(s.stats.zoneReached, 2);
  s.setZone(1); // não regride
  assert.equal(s.stats.zoneReached, 2);
});
