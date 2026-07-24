import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPEN } from '../src/config.js';
import { createGame } from '../src/game/game.js';

const DT = 1 / 60;
const IDLE = { moveX: 0, moveY: 0, hJust: false, vJust: false };

function tick(game, n, input = IDLE) {
  const evs = [];
  for (let i = 0; i < n; i++) evs.push(...game.update(input, DT));
  return evs;
}

// Bola no quadrante superior, subindo (dirY=-1) para não interceptar a parede
// que o jogador dispara no centro (y≈388).
function nivelTeste(targetPct) {
  return {
    targetPct,
    balls: [{ type: 'normal', x: 200, y: 200, dirX: 1, dirY: -1 }],
  };
}

test('parede H completa divide a arena, claima o lado sem bola e realoca o jogador', () => {
  const game = createGame({ level: nivelTeste(0.6) });
  const evs = [...game.update({ ...IDLE, hJust: true }, DT)];
  assert.ok(evs.some((e) => e.type === 'wallStart'), 'wallStart emitido');

  evs.push(...tick(game, 200));
  assert.ok(evs.some((e) => e.type === 'complete'), 'parede completou');
  const fill = evs.find((e) => e.type === 'fill');
  assert.ok(fill, 'houve fill');
  assert.ok(fill.covered > 0.45 && fill.covered < 0.55, `covered=${fill.covered}`);
  assert.equal(game.status, 'playing', '50% < alvo de 60%');

  // conservação de células
  const c = game.grid.counts();
  assert.equal(c.open + c.wall + c.claimed, game.grid.cols * game.grid.rows);

  // jogador terminou em célula OPEN (realocado para a área com a bola)
  const pc = game.grid.cellAt(game.player.x, game.player.y);
  assert.equal(game.grid.get(pc.cx, pc.cy), OPEN, 'jogador em espaço aberto');
});

test('vitória quando covered ≥ alvo', () => {
  const game = createGame({ level: nivelTeste(0.4) });
  const evs = [...game.update({ ...IDLE, hJust: true }, DT), ...tick(game, 200)];
  assert.ok(evs.some((e) => e.type === 'win'), 'evento win');
  assert.equal(game.status, 'won');
});

test('apenas 1 parede por vez: segundo trigger é negado (busy)', () => {
  const game = createGame({ level: nivelTeste(0.6) });
  game.update({ ...IDLE, hJust: true }, DT);
  const evs = game.update({ ...IDLE, vJust: true }, DT);
  const denied = evs.find((e) => e.type === 'denied');
  assert.ok(denied);
  assert.equal(denied.reason, 'busy');
});

test('H tem prioridade sobre V no mesmo tick', () => {
  const game = createGame({ level: nivelTeste(0.6) });
  const evs = game.update({ ...IDLE, hJust: true, vJust: true }, DT);
  const start = evs.find((e) => e.type === 'wallStart');
  assert.equal(start.axis, 'h');
});

test('trigger pisando em CLAIMED é negado (ground)', () => {
  const game = createGame({ level: nivelTeste(0.6) });
  game.update({ ...IDLE, hJust: true }, DT);
  tick(game, 200); // completa e claima o lado de baixo
  // teleporta o jogador para o meio do território conquistado (embaixo)
  game.player.x = 640;
  game.player.y = 560;
  const evs = game.update({ ...IDLE, vJust: true }, DT);
  const denied = evs.find((e) => e.type === 'denied');
  assert.ok(denied, 'negado');
  assert.equal(denied.reason, 'ground');
});

test('bola no caminho quebra a parede em crescimento (shatter)', () => {
  const game = createGame({
    level: {
      targetPct: 0.6,
      balls: [{ type: 'normal', x: 600, y: 300, dirX: 1, dirY: 1 }], // desce até a linha
    },
  });
  const evs = [...game.update({ ...IDLE, hJust: true }, DT), ...tick(game, 60)];
  assert.ok(evs.some((e) => e.type === 'shatter'), 'quebrou');
  assert.equal(game.wall, null, 'parede em progresso descartada');
  assert.ok(!evs.some((e) => e.type === 'complete'), 'não completou');
  assert.equal(game.grid.counts().wall, 0, 'nenhuma âncora antes da quebra → grade limpa');
});

test('depois da quebra pode disparar de novo', () => {
  const game = createGame({
    level: { targetPct: 0.6, balls: [{ type: 'normal', x: 600, y: 300, dirX: 1, dirY: 1 }] },
  });
  game.update({ ...IDLE, hJust: true }, DT);
  tick(game, 60); // quebra acontece nesse meio tempo
  const evs = game.update({ ...IDLE, hJust: true }, DT);
  assert.ok(evs.some((e) => e.type === 'wallStart'), 'novo disparo aceito');
});
