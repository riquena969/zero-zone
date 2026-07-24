// ZONA ZERO — raiz de composição.
// Única ponte entre o jogo puro (src/game/) e o mundo (DOM, canvas, áudio).

import { LOGICAL_W, LOGICAL_H, THEMES, DEFAULT_THEME } from './config.js';
import { createLoop } from './core/loop.js';
import { createViewport } from './ui/viewport.js';
import { createKeyboardInput } from './ui/input.js';
import { createRenderer, PAUSE_RECT } from './ui/render.js';
import { createPauseMenu } from './ui/screens.js';
import { createGame } from './game/game.js';

const canvas = document.getElementById('game');
const overlayRoot = document.getElementById('overlay-root');
const vp = createViewport(canvas, { logicalW: LOGICAL_W, logicalH: LOGICAL_H });
const input = createKeyboardInput(window);
const renderer = createRenderer(vp);

let themeKey = DEFAULT_THEME;
let theme = THEMES[themeKey];

// Nível de teste (a tabela de zonas chega na fatia 5)
function novoJogo() {
  return createGame({
    level: {
      targetPct: 0.6,
      balls: [{ type: 'normal', x: 320, y: 250, dirX: 1, dirY: 1 }],
    },
  });
}

let game = novoJogo();
let paused = false;

const pauseMenu = createPauseMenu(overlayRoot, {
  onResume: () => setPaused(false),
  onRestart: () => {
    game = novoJogo();
    setPaused(false);
  },
  onTheme: (key) => {
    themeKey = key;
    theme = THEMES[key];
  },
});

function setPaused(v) {
  if (paused === v) return;
  paused = v;
  if (v) pauseMenu.show(themeKey);
  else pauseMenu.hide();
}

// Auto-pausa ao perder o foco — e NUNCA retoma sozinho.
window.addEventListener('blur', () => setPaused(true));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) setPaused(true);
});

// Botão de pausa da HUD (hit test em coordenadas lógicas)
canvas.addEventListener('click', (e) => {
  const { x, y } = vp.toLogical(e.clientX, e.clientY);
  if (
    x >= PAUSE_RECT.x &&
    x <= PAUSE_RECT.x + PAUSE_RECT.w &&
    y >= PAUSE_RECT.y &&
    y <= PAUSE_RECT.y + PAUSE_RECT.h
  ) {
    setPaused(true);
  }
});

function update(dt) {
  const snap = input.sample();
  if (snap.pauseJust) {
    setPaused(!paused);
    return;
  }
  if (paused) return;
  if (snap.restartJust) {
    game = novoJogo();
    return;
  }
  game.update(snap, dt);
  // eventos → áudio/fx nas fatias 12/13
}

function render() {
  renderer.draw(game, theme, { zone: 1, score: 0, hi: 0 });
}

createLoop({ update, render }).start();
