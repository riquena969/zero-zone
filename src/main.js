// ZONA ZERO — raiz de composição.
// Única ponte entre o jogo puro (src/game/) e o mundo (DOM, canvas, áudio).
// Fatia 1: jogo mínimo jogável — mover, disparar H/V, cercar a bolinha, vencer.

import { LOGICAL_W, LOGICAL_H, THEMES, DEFAULT_THEME } from './config.js';
import { createLoop } from './core/loop.js';
import { createViewport } from './ui/viewport.js';
import { createKeyboardInput } from './ui/input.js';
import { createRenderer } from './ui/render.js';
import { createGame } from './game/game.js';

const canvas = document.getElementById('game');
const vp = createViewport(canvas, { logicalW: LOGICAL_W, logicalH: LOGICAL_H });
const input = createKeyboardInput(window);
const renderer = createRenderer(vp);

const theme = THEMES[DEFAULT_THEME];

// Nível de teste da fatia 1 (a tabela de verdade chega na fatia 5)
function novoJogo() {
  return createGame({
    level: {
      targetPct: 0.6,
      balls: [{ type: 'normal', x: 320, y: 250, dirX: 1, dirY: 1 }],
    },
  });
}

let game = novoJogo();

function update(dt) {
  const snap = input.sample();
  if (snap.restartJust) {
    game = novoJogo();
    return;
  }
  game.update(snap, dt);
  // eventos → áudio/fx nas fatias 12/13
}

function render() {
  renderer.draw(game, theme);
}

createLoop({ update, render }).start();
