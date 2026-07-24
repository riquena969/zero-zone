// ZONA ZERO — raiz de composição.
// Única ponte entre o jogo puro (src/game/) e o mundo (DOM, canvas, áudio).
// Orquestra a RUN: zona → zona, vidas carregadas (+1 por zona, teto), R = nova run.

import { LOGICAL_W, LOGICAL_H, THEMES, DEFAULT_THEME, LIVES_MAX } from './config.js';
import { createLoop } from './core/loop.js';
import { createViewport } from './ui/viewport.js';
import { createKeyboardInput } from './ui/input.js';
import { createRenderer, PAUSE_RECT } from './ui/render.js';
import { createPauseMenu, createLevelClearMenu, createTutorialBar } from './ui/screens.js';
import { createGame } from './game/game.js';
import { levelSpec } from './game/levels.js';

const canvas = document.getElementById('game');
const overlayRoot = document.getElementById('overlay-root');
const vp = createViewport(canvas, { logicalW: LOGICAL_W, logicalH: LOGICAL_H });
const input = createKeyboardInput(window);
const renderer = createRenderer(vp);

let themeKey = DEFAULT_THEME;
let theme = THEMES[themeKey];

// ---------- Estado da run ----------
const newSeed = () => (Math.random() * 0xffffffff) >>> 0; // UI pode ser aleatória; o jogo é seedado
let seed = newSeed();
let zone = 1;
let game = null;
let paused = false;
let levelClearShown = false;

function startZone(z, lives) {
  zone = z;
  game = createGame({ level: levelSpec(z, seed), lives });
  levelClearShown = false;
  if (z === 1) tutorialBar.show();
  else tutorialBar.hide();
}

function newRun() {
  seed = newSeed();
  startZone(1, undefined);
}

// ---------- Telas ----------
const pauseMenu = createPauseMenu(overlayRoot, {
  onResume: () => setPaused(false),
  onRestart: () => {
    startZone(zone, game.lives);
    setPaused(false);
  },
  onTheme: (key) => {
    themeKey = key;
    theme = THEMES[key];
  },
});

const levelClearMenu = createLevelClearMenu(overlayRoot, {
  onNext: () => {
    levelClearMenu.hide();
    startZone(zone + 1, Math.min(LIVES_MAX, game.lives + 1));
  },
});

const tutorialBar = createTutorialBar(overlayRoot);

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

// ---------- Loop ----------
function update(dt) {
  const snap = input.sample();
  if (snap.pauseJust) {
    setPaused(!paused);
    return;
  }
  if (paused) return;
  if (snap.restartJust) {
    levelClearMenu.hide();
    newRun();
    return;
  }

  const events = game.update(snap, dt);

  for (const e of events) {
    if (e.type === 'win' && !levelClearShown) {
      levelClearShown = true;
      levelClearMenu.show(zone, game.grid.coveredFraction());
    }
    // demais eventos → áudio/fx nas fatias 12/13
  }
}

function render() {
  renderer.draw(game, theme, { zone, score: 0, hi: 0 });
}

newRun();
createLoop({ update, render }).start();
