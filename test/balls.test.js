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

// ---------- Fatia 7: bolas especiais ----------

test('veloz: menor e mais rápida que a normal', () => {
  const v = makeBall({ type: 'veloz', x: 40, y: 88 });
  const n = makeBall({ type: 'normal', x: 40, y: 88 });
  assert.ok(v.r < n.r);
  assert.ok(Math.abs(v.vx) > Math.abs(n.vx));
});

test('gigante: maior e mais lenta que a normal', () => {
  const g = makeBall({ type: 'gigante', x: 40, y: 88 });
  const n = makeBall({ type: 'normal', x: 40, y: 88 });
  assert.ok(g.r > n.r);
  assert.ok(Math.abs(g.vx) < Math.abs(n.vx));
});

test('fantasma: alpha cicla entre 1 e o piso (sempre colide, só esmaece)', async () => {
  const { ghostAlpha } = await import('../src/game/balls.js');
  const { GHOST_CYCLE, GHOST_MIN_ALPHA } = await import('../src/config.js');
  const g = makeGrid();
  const b = makeBall({ type: 'fantasma', x: 40, y: 88, dirX: 1, dirY: 1, speedMul: 0.1 });
  assert.ok(Math.abs(ghostAlpha(b) - 1) < 0.01, 'nasce visível');
  // avança meio ciclo
  const meioCiclo = GHOST_CYCLE / 2;
  for (let t = 0; t < meioCiclo; t += 1 / 60) stepBall(b, g, 1 / 60);
  assert.ok(Math.abs(ghostAlpha(b) - GHOST_MIN_ALPHA) < 0.05, `no piso: ${ghostAlpha(b)}`);
  for (let t = 0; t < meioCiclo; t += 1 / 60) stepBall(b, g, 1 / 60);
  assert.ok(Math.abs(ghostAlpha(b) - 1) < 0.05, 'de volta ao visível');
});

test('perseguidora: curva limitada por tick e velocidade constante', async () => {
  const { steerHoming } = await import('../src/game/balls.js');
  const g = makeGrid();
  const b = makeBall({ type: 'perseguidora', x: 40, y: 88, dirX: 1, dirY: 0.0001 });
  const speed = Math.hypot(b.vx, b.vy);
  const h0 = b.heading;
  // alvo diretamente ATRÁS: quer girar 180°, só pode turnRate*dt
  steerHoming(b, 0, 88, 1 / 60);
  const giro = Math.abs(b.heading - h0);
  assert.ok(giro <= BALL_TYPES.perseguidora.turnRate / 60 + 1e-9, `giro ${giro} limitado`);
  // 1000 ticks perseguindo + refletindo: |v| nunca muda
  for (let i = 0; i < 1000; i++) {
    steerHoming(b, 20, 70, 1 / 60);
    stepBall(b, g, 1 / 60);
    const s = Math.hypot(b.vx, b.vy);
    assert.ok(Math.abs(s - speed) < 0.001, `velocidade constante (tick ${i}: ${s})`);
  }
});

test('perseguidora: o homing a leva para perto do alvo em algum momento', async () => {
  const { steerHoming } = await import('../src/game/balls.js');
  const g = makeGrid();
  // spawn legal: raio 11 exige x≥11 e y≥67 na mini-arena
  const b = makeBall({ type: 'perseguidora', x: 20, y: 80, dirX: 1, dirY: 1, speedMul: 0.5 });
  const alvo = { x: 60, y: 108 };
  const d0 = Math.hypot(b.x - alvo.x, b.y - alvo.y);
  // na arena minúscula ela quica e orbita — o que importa é a MENOR distância
  // atingida na janela, que o homing precisa puxar para baixo
  let minD = d0;
  for (let i = 0; i < 600; i++) {
    steerHoming(b, alvo.x, alvo.y, 1 / 60);
    stepBall(b, g, 1 / 60);
    minD = Math.min(minD, Math.hypot(b.x - alvo.x, b.y - alvo.y));
  }
  assert.ok(minD < d0 / 3, `passou perto do alvo: min ${minD} (inicial ${d0})`);
});
