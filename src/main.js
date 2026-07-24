// ZONA ZERO — raiz de composição.
// Este arquivo é a ÚNICA ponte entre o jogo puro (src/game/) e o mundo
// (DOM, canvas, áudio, storage). Por enquanto: esqueleto renderizando a arena.

import { LOGICAL_W, LOGICAL_H, HUD_H, CELL, THEMES, DEFAULT_THEME } from './config.js';
import { createLoop } from './core/loop.js';
import { createViewport } from './ui/viewport.js';

const canvas = document.getElementById('game');
const vp = createViewport(canvas, { logicalW: LOGICAL_W, logicalH: LOGICAL_H });

let theme = THEMES[DEFAULT_THEME];

function update(_dt) {
  // Fatia 1: aqui entra game.update(input, dt) → eventos.
}

function render() {
  vp.checkResize();
  const ctx = vp.ctx;

  vp.clearAll('#000');
  vp.applyTransform();

  // Fundo da tela lógica
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  // Grade tênue da arena (a cada 4 células fica elegante sem poluir)
  ctx.strokeStyle = theme.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= LOGICAL_W; x += CELL * 4) {
    ctx.moveTo(x, HUD_H);
    ctx.lineTo(x, LOGICAL_H);
  }
  for (let y = HUD_H; y <= LOGICAL_H; y += CELL * 4) {
    ctx.moveTo(0, y);
    ctx.lineTo(LOGICAL_W, y);
  }
  ctx.stroke();

  // Separador da HUD
  ctx.strokeStyle = theme.claimedEdge;
  ctx.beginPath();
  ctx.moveTo(0, HUD_H - 0.5);
  ctx.lineTo(LOGICAL_W, HUD_H - 0.5);
  ctx.stroke();

  // Placeholder de título (vira HUD de verdade na fatia 4)
  ctx.fillStyle = theme.hudText;
  ctx.font = 'bold 24px "Courier New", monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('ZONA ZERO', 16, HUD_H / 2);
  ctx.textAlign = 'right';
  ctx.font = '16px "Courier New", monospace';
  ctx.fillText('esqueleto — fatia 0', LOGICAL_W - 16, HUD_H / 2);
}

const loop = createLoop({ update, render });
loop.start();
