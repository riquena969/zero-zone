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

// ---------- Fatia 2: vidas e morte ----------

test('começa com 3 vidas', () => {
  const game = createGame({ level: nivelTeste(0.6) });
  assert.equal(game.lives, 3);
});

test('tocar bolinha: perde vida, respawna longe, ganha i-frames', () => {
  const game = createGame({ level: nivelTeste(0.6) });
  const bola = game.balls[0];
  game.player.x = bola.x;
  game.player.y = bola.y;
  const evs = game.update(IDLE, DT);
  const hit = evs.find((e) => e.type === 'lifeLost');
  assert.ok(hit, 'perdeu vida');
  assert.equal(hit.cause, 'ball');
  assert.equal(game.lives, 2);
  assert.ok(game.player.iframes > 0, 'i-frames ativos');
  const dist = Math.hypot(game.player.x - bola.x, game.player.y - bola.y);
  assert.ok(dist > bola.r + game.player.r, `respawnou longe (dist=${dist})`);
});

test('i-frames impedem morte em sequência', () => {
  const game = createGame({ level: nivelTeste(0.6) });
  const bola = game.balls[0];
  game.player.x = bola.x;
  game.player.y = bola.y;
  game.update(IDLE, DT); // 1ª morte
  assert.equal(game.lives, 2);
  // teleporta de volta para cima da bola COM i-frames ativos
  game.player.x = bola.x;
  game.player.y = bola.y;
  const evs = game.update(IDLE, DT);
  assert.ok(!evs.some((e) => e.type === 'lifeLost'), 'não morreu de novo');
  assert.equal(game.lives, 2);
});

test('quebra de parede também custa vida (sem respawn) e dá i-frames', () => {
  const game = createGame({
    level: { targetPct: 0.6, balls: [{ type: 'normal', x: 600, y: 300, dirX: 1, dirY: 1 }] },
  });
  game.update({ ...IDLE, hJust: true }, DT);
  const posAntes = { x: game.player.x, y: game.player.y };
  const evs = tick(game, 60); // bola quebra a parede
  const hit = evs.find((e) => e.type === 'lifeLost');
  assert.ok(hit, 'perdeu vida na quebra');
  assert.equal(hit.cause, 'shatter');
  assert.equal(game.lives, 2);
  assert.deepEqual({ x: game.player.x, y: game.player.y }, posAntes, 'ficou onde estava');
  assert.ok(game.player.iframes > 0, 'i-frames para não levar dupla');
});

test('3 mortes = game over', () => {
  const game = createGame({ level: nivelTeste(0.6) });
  const bola = game.balls[0];
  let evs = [];
  for (let morte = 0; morte < 3; morte++) {
    game.player.iframes = 0; // encerra a janela de invencibilidade
    game.player.x = bola.x;
    game.player.y = bola.y;
    evs = game.update(IDLE, DT);
  }
  assert.equal(game.lives, 0);
  assert.equal(game.status, 'gameover');
  assert.ok(evs.some((e) => e.type === 'gameover'));
  // jogo parado: update não faz mais nada
  assert.deepEqual(game.update(IDLE, DT), []);
});

test('trigger é negado durante o canal de vault', () => {
  const game = createGame({ level: nivelTeste(0.6) });
  // constrói uma parede vertical na grade e cola o jogador nela
  for (let cy = 0; cy < game.grid.rows; cy++) game.grid.set(100, cy, 1); // WALL
  const face = game.grid.cellRect(100, 0).x; // px da face esquerda
  game.player.x = face - game.player.r;
  game.player.y = 388;
  // pressiona contra a parede para iniciar o canal
  game.update({ ...IDLE, moveX: 1 }, DT);
  const evs = game.update({ ...IDLE, moveX: 1, hJust: true }, DT);
  const denied = evs.find((e) => e.type === 'denied');
  assert.ok(denied, 'negado');
  assert.equal(denied.reason, 'vaulting');
});

test('vault no jogo: atravessa parede pronta e emite evento', () => {
  const game = createGame({ level: nivelTeste(0.6) });
  for (let cy = 0; cy < game.grid.rows; cy++) game.grid.set(100, cy, 1);
  const face = game.grid.cellRect(100, 0).x;
  game.player.x = face - game.player.r;
  game.player.y = 388;
  let vaulted = false;
  for (let i = 0; i < 60 && !vaulted; i++) {
    vaulted = game.update({ ...IDLE, moveX: 1 }, DT).some((e) => e.type === 'vault');
  }
  assert.ok(vaulted, 'evento vault');
  assert.ok(game.player.x > face + 8, `do outro lado: x=${game.player.x}`);
});

// ---------- Fatia 5: countdown e vidas customizadas ----------

test('countdown: bolas congeladas, triggers negados, "go" libera tudo', () => {
  const game = createGame({
    level: { targetPct: 0.6, countdown: 0.2, balls: [{ type: 'normal', x: 200, y: 200, dirX: 1, dirY: 1 }] },
  });
  const b0 = { x: game.balls[0].x, y: game.balls[0].y };
  const evs = game.update({ ...IDLE, hJust: true }, DT);
  assert.ok(evs.some((e) => e.type === 'denied' && e.reason === 'countdown'), 'trigger negado');
  assert.deepEqual({ x: game.balls[0].x, y: game.balls[0].y }, b0, 'bola congelada');
  // jogador PODE se reposicionar durante o countdown
  game.update({ ...IDLE, moveX: 1 }, DT);
  assert.ok(game.player.x > 640, 'jogador se moveu');
  // termina o countdown
  const all = tick(game, 15);
  assert.ok(all.some((e) => e.type === 'go'), 'evento go');
  assert.notDeepEqual({ x: game.balls[0].x, y: game.balls[0].y }, b0, 'bola se movendo');
});

test('vidas iniciais customizadas (progressão entre zonas)', () => {
  const game = createGame({ level: nivelTeste(0.6), lives: 5 });
  assert.equal(game.lives, 5);
});

test('bônus de tempo: decresce jogando, congelado no countdown, nunca negativo', () => {
  const comCountdown = createGame({
    level: { targetPct: 0.6, countdown: 0.5, balls: [{ type: 'normal', x: 200, y: 200, dirX: 1, dirY: 1 }] },
  });
  const t0 = comCountdown.timeLeft;
  comCountdown.update(IDLE, DT);
  assert.equal(comCountdown.timeLeft, t0, 'congelado durante o countdown');

  const game = createGame({ level: nivelTeste(0.6) });
  const antes = game.timeLeft;
  tick(game, 60); // 1s
  assert.ok(Math.abs(game.timeLeft - (antes - 1)) < 0.001, 'caiu 1s');
  tick(game, 60 * 120); // 2 minutos — passa do limite
  assert.equal(game.timeLeft, 0, 'não fica negativo');
});

// ---------- Fatia 8: efeitos dos power-ups ----------

test('relógio: bolas a meia velocidade enquanto dura, depois normal', () => {
  const game = createGame({ level: nivelTeste(0.6) });
  const b = game.balls[0];
  game.applyPowerup('relogio');
  assert.ok(game.effects.clock > 0);
  const x0 = b.x;
  game.update(IDLE, DT);
  const passoLento = Math.abs(b.x - x0);
  // espera o efeito acabar
  tick(game, 60 * 6);
  const x1 = b.x;
  game.update(IDLE, DT);
  const passoNormal = Math.abs(b.x - x1);
  assert.ok(Math.abs(passoLento * 2 - passoNormal) < 0.01, `${passoLento} vs ${passoNormal}`);
});

test('escudo: absorve 1 toque sem perder vida e não acumula', () => {
  const game = createGame({ level: nivelTeste(0.6) });
  game.applyPowerup('escudo');
  game.applyPowerup('escudo'); // segundo é ignorado
  assert.equal(game.effects.shield, true);
  const bola = game.balls[0];
  game.player.x = bola.x;
  game.player.y = bola.y;
  const evs = game.update(IDLE, DT);
  assert.ok(evs.some((e) => e.type === 'shieldBreak'), 'escudo estourou');
  assert.ok(!evs.some((e) => e.type === 'lifeLost'), 'vida intacta');
  assert.equal(game.lives, 3);
  assert.equal(game.effects.shield, false);
  // sem escudo (e sem i-frames), o próximo toque mata
  game.player.iframes = 0;
  game.player.x = game.balls[0].x;
  game.player.y = game.balls[0].y;
  const evs2 = game.update(IDLE, DT);
  assert.ok(evs2.some((e) => e.type === 'lifeLost'));
});

test('escudo NÃO protege contra quebra de parede', () => {
  const game = createGame({
    level: { targetPct: 0.6, balls: [{ type: 'normal', x: 600, y: 300, dirX: 1, dirY: 1 }] },
  });
  game.applyPowerup('escudo');
  game.update({ ...IDLE, hJust: true }, DT);
  const evs = tick(game, 60);
  assert.ok(evs.some((e) => e.type === 'lifeLost' && e.cause === 'shatter'), 'quebra custou vida');
  assert.equal(game.effects.shield, true, 'escudo continua (é proteção corporal)');
});

test('turbo: a próxima parede cresce mais rápido e o efeito é consumido', () => {
  const semTurbo = createGame({ level: nivelTeste(0.6) });
  semTurbo.update({ ...IDLE, hJust: true }, DT);
  const comTurbo = createGame({ level: nivelTeste(0.6) });
  comTurbo.applyPowerup('turbo');
  comTurbo.update({ ...IDLE, hJust: true }, DT);
  assert.equal(comTurbo.effects.turbo, false, 'consumido no disparo');
  // após alguns ticks, a parede turbo tem ~2× mais células pendentes
  const { pendingCells } = awaitImportWalls();
  for (let i = 0; i < 10; i++) {
    semTurbo.update(IDLE, DT);
    comTurbo.update(IDLE, DT);
  }
  const lenNormal = pendingCells(semTurbo.wall).length;
  const lenTurbo = pendingCells(comTurbo.wall).length;
  assert.ok(lenTurbo >= lenNormal * 1.7, `turbo ${lenTurbo} vs normal ${lenNormal}`);
});

// import síncrono auxiliar (o módulo já foi carregado pelo game)
import { pendingCells as _pendingCells } from '../src/game/walls.js';
function awaitImportWalls() {
  return { pendingCells: _pendingCells };
}

test('zona 3+: power-up spawna de verdade durante o jogo', () => {
  const game = createGame({
    level: {
      targetPct: 0.99,
      zone: 3,
      seed: 42,
      balls: [{ type: 'normal', x: 200, y: 200, dirX: 1, dirY: -1 }],
    },
  });
  const evs = tick(game, 60 * 25); // 25s
  assert.ok(evs.some((e) => e.type === 'powerupSpawn'), 'spawnou na zona 3');
});

test('realocação após fill concede i-frames', () => {
  const game = createGame({ level: nivelTeste(0.6) });
  game.update({ ...IDLE, hJust: true }, DT);
  // tica até o momento exato da realocação (i-frames decaem depois, correto)
  let relocated = false;
  for (let i = 0; i < 200 && !relocated; i++) {
    relocated = game.update(IDLE, DT).some((e) => e.type === 'relocate');
  }
  assert.ok(relocated, 'foi realocado');
  assert.ok(game.player.iframes > 0, 'chegou invencível no novo chão');
});
