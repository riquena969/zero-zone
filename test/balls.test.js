import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WALL, BALL_TYPES } from '../src/config.js';
import { createGrid } from '../src/game/grid.js';
import { makeBall, stepBall } from '../src/game/balls.js';

function makeGrid() {
  return createGrid({ cols: 10, rows: 8, cell: 8, originX: 0, originY: 56 });
}

test('makeBall normal usa raio e velocidade do config, diagonal pura', () => {
  const b = makeBall({ type: 'normal', x: 40, y: 88, dirX: 1, dirY: -1 });
  assert.equal(b.r, BALL_TYPES.normal.r);
  assert.equal(Math.abs(b.vx), BALL_TYPES.normal.axisSpeed);
  assert.equal(Math.abs(b.vy), BALL_TYPES.normal.axisSpeed);
  assert.ok(b.vx > 0 && b.vy < 0);
});

test('reflexão inverte o eixo atingido e preserva a velocidade exata', () => {
  const g = makeGrid();
  const b = makeBall({ type: 'normal', x: 70, y: 88, dirX: 1, dirY: 1, speedMul: 0.2 });
  const vAbs = Math.abs(b.vx);
  // anda até bater na borda direita (x=80)
  for (let i = 0; i < 60; i++) stepBall(b, g, 1 / 60);
  assert.equal(b.vx, -vAbs, 'vx invertido após bater na direita');
  assert.equal(Math.abs(b.vy), vAbs, 'vy preservado');
});

test('confinamento: 10.000 ticks sem NaN e sem sair da arena', () => {
  const g = makeGrid();
  // parede interna para ficar interessante
  for (let cy = 0; cy < 4; cy++) g.set(5, cy, WALL);
  const b = makeBall({ type: 'normal', x: 20, y: 88, dirX: 1, dirY: -1 });
  for (let i = 0; i < 10000; i++) {
    stepBall(b, g, 1 / 60);
    assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y), `NaN no tick ${i}`);
    assert.ok(b.x >= b.r - 0.01 && b.x <= 80 - b.r + 0.01, `x fora: ${b.x} no tick ${i}`);
    assert.ok(b.y >= 56 + b.r - 0.01 && b.y <= 120 - b.r + 0.01, `y fora: ${b.y} no tick ${i}`);
  }
  // velocidade continua diagonal exata após 10k reflexões
  assert.equal(Math.abs(b.vx), Math.abs(b.vy));
});

test('confinamento no teto de velocidade (regressão de tunneling)', () => {
  const g = makeGrid();
  for (let cy = 0; cy < 8; cy++) g.set(5, cy, WALL); // divisória px [40,48)
  const b = makeBall({ type: 'normal', x: 20, y: 88, dirX: 1, dirY: 1, speedMul: 420 / 170 });
  for (let i = 0; i < 5000; i++) {
    stepBall(b, g, 1 / 60);
    assert.ok(b.x <= 40 - b.r + 0.01, `atravessou a divisória: x=${b.x} no tick ${i}`);
  }
});

test('speedMul escala a velocidade', () => {
  const b = makeBall({ type: 'normal', x: 40, y: 88, dirX: -1, dirY: 1, speedMul: 1.5 });
  assert.equal(Math.abs(b.vx), BALL_TYPES.normal.axisSpeed * 1.5);
});
