import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WALL, CLAIMED, PLAYER_RADIUS } from '../src/config.js';
import { createGrid } from '../src/game/grid.js';
import { makePlayer, movePlayer, depenetrate, fits, safestPoint, updateVault } from '../src/game/player.js';

function makeGrid() {
  return createGrid({ cols: 10, rows: 8, cell: 8, originX: 0, originY: 56 });
}

test('makePlayer usa raio do config', () => {
  const p = makePlayer({ x: 40, y: 88 });
  assert.equal(p.r, PLAYER_RADIUS);
});

test('diagonal é normalizada (não anda mais rápido)', () => {
  const g = makeGrid();
  const reto = makePlayer({ x: 40, y: 88 });
  movePlayer(reto, g, 1, 0, 100, 0.1); // 10px
  const diag = makePlayer({ x: 40, y: 88 });
  movePlayer(diag, g, 1, 1, 100, 0.1);
  const dist = Math.hypot(diag.x - 40, diag.y - 88);
  assert.ok(Math.abs(dist - 10) < 0.01, `diagonal andou ${dist}, esperado 10`);
  assert.equal(reto.x - 40, 10);
});

test('WALL bloqueia o jogador', () => {
  const g = makeGrid();
  for (let cy = 0; cy < 8; cy++) g.set(5, cy, WALL); // px [40,48)
  const p = makePlayer({ x: 20, y: 88 });
  movePlayer(p, g, 1, 0, 1000, 0.1); // tenta atravessar
  assert.equal(p.x, 40 - p.r);
});

test('CLAIMED é chão caminhável para o jogador', () => {
  const g = makeGrid();
  for (let cy = 0; cy < 8; cy++) g.set(5, cy, CLAIMED);
  const p = makePlayer({ x: 20, y: 88 });
  movePlayer(p, g, 1, 0, 1000, 0.1);
  assert.ok(p.x > 48, `deveria atravessar área conquistada, ficou em ${p.x}`);
});

test('bordas da arena confinam o jogador', () => {
  const g = makeGrid();
  const p = makePlayer({ x: 40, y: 88 });
  movePlayer(p, g, -1, 0, 10000, 1);
  assert.equal(p.x, p.r); // borda esquerda em x=0
  movePlayer(p, g, 0, -1, 10000, 1);
  assert.equal(p.y, 56 + p.r); // topo da arena em y=56
});

test('depenetrate: jogador sobre parede recém-criada é empurrado para fora', () => {
  const g = makeGrid();
  const p = makePlayer({ x: 44, y: 92 }); // centro da célula (5,4)
  for (let cx = 0; cx < 10; cx++) g.set(cx, 4, WALL); // linha inteira vira WALL
  const moved = depenetrate(p, g);
  assert.ok(moved, 'reportou que moveu');
  // não pode mais sobrepor WALL: testa movendo 0 (colisão estática via clamp)
  const antes = { x: p.x, y: p.y };
  movePlayer(p, g, 0, 0, 100, 0.1);
  assert.deepEqual({ x: p.x, y: p.y }, antes, 'posição estável = livre de parede');
  // saiu da linha da parede (y fora de [88,96) expandido pelo raio)
  assert.ok(p.y <= 88 - p.r || p.y >= 96 + p.r, `ainda encostado: y=${p.y}`);
});

test('depenetrate sem sobreposição é no-op', () => {
  const g = makeGrid();
  const p = makePlayer({ x: 40, y: 70 });
  const moved = depenetrate(p, g);
  assert.equal(moved, false);
  assert.deepEqual({ x: p.x, y: p.y }, { x: 40, y: 70 });
});

test('safestPoint: fica no mesmo componente, cabe, e maximiza distância da bola', () => {
  const g = makeGrid();
  for (let cy = 0; cy < 8; cy++) g.set(5, cy, WALL); // divide: esquerda x∈[0,40), direita x∈[48,80)
  const bola = { x: 20, y: 70, r: 6 };
  const ref = { x: 20, y: 100 }; // jogador morreu aqui (lado esquerdo)
  const pt = safestPoint(g, [bola], ref.x, ref.y, PLAYER_RADIUS);
  assert.ok(pt, 'achou ponto');
  assert.ok(pt.x < 40, `continua no lado esquerdo: x=${pt.x}`);
  assert.ok(fits(g, pt.x, pt.y, PLAYER_RADIUS), 'orbe cabe lá');
  // máximo teórico nessa região: canto oposto onde o orbe cabe = (28,108) ou
  // (12,108), ambos a √1508 ≈ 38,83 da bola — o argmax exato
  const dist = Math.hypot(pt.x - bola.x, pt.y - bola.y);
  assert.ok(Math.abs(dist - Math.sqrt(1508)) < 0.01, `argmax exato, veio ${dist}`);
  assert.ok(dist > Math.hypot(ref.x - bola.x, ref.y - bola.y), 'mais longe que onde morreu');
});

test('safestPoint ignora bolas de outros componentes', () => {
  const g = makeGrid();
  for (let cy = 0; cy < 8; cy++) g.set(5, cy, WALL);
  // bola só do lado DIREITO; ref do lado esquerdo
  const bola = { x: 60, y: 88, r: 6 };
  const pt = safestPoint(g, [bola], 20, 88, PLAYER_RADIUS);
  assert.ok(pt, 'achou ponto mesmo sem bola no componente');
  assert.ok(pt.x < 40, 'no componente do ref');
});

// ---------- Fatia 3: vault ----------

// Cenário padrão: parede na coluna 5 (px [40,48)); jogador colado à esquerda
// (centro x=30, borda em 40), pressionando para a direita.
function gridComParede() {
  const g = makeGrid();
  for (let cy = 0; cy < 8; cy++) g.set(5, cy, WALL);
  return g;
}

test('vault: 0,4s contínuos contra a parede saltam para o outro lado', () => {
  const g = gridComParede();
  const p = makePlayer({ x: 30, y: 88 });
  let hopped = false;
  for (let i = 0; i < 4; i++) {
    const r = updateVault(p, g, 1, 0, 0.1);
    hopped = !!(r && r.hopped);
  }
  assert.ok(hopped, 'saltou');
  assert.ok(p.x > 48, `do outro lado: x=${p.x}`);
  assert.equal(p.y, 88, 'mesma altura');
  assert.ok(fits(g, p.x, p.y, p.r), 'pouso válido');
  assert.equal(p.vault, null, 'canal encerrado');
});

test('vault: soltar a direção zera o progresso', () => {
  const g = gridComParede();
  const p = makePlayer({ x: 30, y: 88 });
  updateVault(p, g, 1, 0, 0.2);
  updateVault(p, g, 0, 0, 0.1); // soltou
  assert.equal(p.vault, null, 'progresso zerado');
  updateVault(p, g, 1, 0, 0.2);
  const r = updateVault(p, g, 1, 0, 0.1);
  assert.ok(!(r && r.hopped), '0,2+0,3 com pausa no meio não salta (não acumula)');
});

test('vault: deslizar ao longo da parede mantém o canal', () => {
  const g = gridComParede();
  const p = makePlayer({ x: 30, y: 88 });
  let hopped = false;
  for (let i = 0; i < 4; i++) {
    // diagonal: pressiona na parede (x) e desliza (y) — componente x = 0.707 ≥ 0.4
    const r = updateVault(p, g, 0.707, 0.707, 0.1);
    hopped = !!(r && r.hopped);
  }
  assert.ok(hopped, 'canal sobreviveu ao deslize diagonal');
});

test('vault: sem parede encostada não canaliza', () => {
  const g = makeGrid();
  const p = makePlayer({ x: 30, y: 88 });
  const r = updateVault(p, g, 1, 0, 0.1);
  assert.equal(r, null);
  assert.equal(p.vault, null);
});

test('vault: parede mais grossa que o alcance não permite canal', () => {
  const g = makeGrid();
  for (let cx = 3; cx < 10; cx++) {
    for (let cy = 0; cy < 8; cy++) g.set(cx, cy, WALL); // 7 células de espessura
  }
  const p = makePlayer({ x: 14, y: 88 }); // colado na face x=24
  const r = updateVault(p, g, 1, 0, 0.1);
  assert.equal(r, null, 'nem começa o canal');
});

test('vault: corredor fino demais do outro lado não permite canal', () => {
  const g = gridComParede();
  for (let cy = 0; cy < 8; cy++) g.set(7, cy, WALL); // corredor de 1 célula (8px < orbe 20px)
  const p = makePlayer({ x: 30, y: 88 });
  const r = updateVault(p, g, 1, 0, 0.1);
  assert.equal(r, null, 'pouso impossível → canal não inicia');
});

test('vault vertical funciona igual', () => {
  const g = makeGrid();
  for (let cx = 0; cx < 10; cx++) g.set(cx, 4, WALL); // linha px y∈[88,96)
  const p = makePlayer({ x: 40, y: 78 }); // colado por cima (borda em 88)
  let hopped = false;
  for (let i = 0; i < 4; i++) {
    const r = updateVault(p, g, 0, 1, 0.1);
    hopped = !!(r && r.hopped);
  }
  assert.ok(hopped, 'saltou para baixo');
  assert.ok(p.y > 96, `abaixo da linha: y=${p.y}`);
});
