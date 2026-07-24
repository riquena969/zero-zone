import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BALL_TYPES,
  MAX_AXIS_SPEED,
  LOGICAL_W,
  LOGICAL_H,
  ARENA_Y,
  SPAWN_MARGIN,
  SPAWN_MIN_PLAYER_DIST,
  SPAWN_MIN_BALL_DIST,
} from '../src/config.js';
import { levelSpec } from '../src/game/levels.js';

const CENTRO = { x: LOGICAL_W / 2, y: ARENA_Y + (LOGICAL_H - ARENA_Y) / 2 };
const QTD_ESPERADA = [1, 2, 2, 3, 3, 3, 4, 4, 5, 5, 6, 6]; // zonas 1..12

test('campanha: 12 zonas bem formadas', () => {
  for (let z = 1; z <= 12; z++) {
    const spec = levelSpec(z, 42);
    assert.equal(spec.zone, z);
    assert.ok(spec.targetPct >= 0.5 && spec.targetPct <= 0.85, `alvo da zona ${z}`);
    assert.equal(spec.balls.length, QTD_ESPERADA[z - 1], `qtd de bolas da zona ${z}`);
    assert.ok(spec.countdown > 0, 'toda zona tem countdown');
    for (const b of spec.balls) {
      assert.ok(BALL_TYPES[b.type], `tipo existente: ${b.type} (zona ${z})`);
      assert.ok(b.x >= SPAWN_MARGIN && b.x <= LOGICAL_W - SPAWN_MARGIN, 'x na arena');
      assert.ok(b.y >= ARENA_Y + SPAWN_MARGIN && b.y <= LOGICAL_H - SPAWN_MARGIN, 'y na arena');
      const dJog = Math.hypot(b.x - CENTRO.x, b.y - CENTRO.y);
      assert.ok(dJog >= SPAWN_MIN_PLAYER_DIST, `longe do jogador (zona ${z}: ${dJog})`);
    }
    // distância entre bolas
    for (let i = 0; i < spec.balls.length; i++) {
      for (let j = i + 1; j < spec.balls.length; j++) {
        const d = Math.hypot(spec.balls[i].x - spec.balls[j].x, spec.balls[i].y - spec.balls[j].y);
        assert.ok(d >= SPAWN_MIN_BALL_DIST, `bolas separadas (zona ${z})`);
      }
    }
  }
});

test('mesma seed → mesmas posições; seed diferente → diferentes', () => {
  const a = levelSpec(5, 42);
  const b = levelSpec(5, 42);
  const c = levelSpec(5, 43);
  assert.deepEqual(a.balls, b.balls);
  assert.notDeepEqual(a.balls, c.balls);
});

test('velocidades crescem ao longo da campanha', () => {
  const v1 = levelSpec(1, 42).balls[0].speedMul;
  const v12 = Math.max(...levelSpec(12, 42).balls.map((b) => b.speedMul));
  assert.ok(v12 > v1, `zona 12 mais rápida que a 1 (${v1} → ${v12})`);
});

test('infinito: contagem cresce até 10, velocidade respeita o teto, alvo 80%', () => {
  const z13 = levelSpec(13, 42);
  assert.equal(z13.targetPct, 0.8);
  assert.ok(z13.balls.length >= 6);
  const z30 = levelSpec(30, 42);
  assert.equal(z30.balls.length, 10, 'teto de 10 bolas');
  for (const b of z30.balls) {
    const efetiva = BALL_TYPES[b.type].axisSpeed * b.speedMul;
    assert.ok(efetiva <= MAX_AXIS_SPEED + 0.001, `teto de velocidade: ${efetiva}`);
  }
});

test('contagem do infinito é monotônica não-decrescente', () => {
  let prev = 0;
  for (let z = 13; z <= 25; z++) {
    const n = levelSpec(z, 7).balls.length;
    assert.ok(n >= prev, `zona ${z}: ${n} ≥ ${prev}`);
    prev = n;
  }
});
