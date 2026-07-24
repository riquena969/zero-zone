// ZONA ZERO — raiz de composição.
// Única ponte entre o jogo puro (src/game/) e o mundo (DOM, canvas, áudio).
// Máquina de estados: title(attract) ↔ howto, playing ↔ paused, levelclear, gameover.

import { LOGICAL_W, LOGICAL_H, GRID_W, GRID_H, THEMES, DEFAULT_THEME, LIVES_MAX } from './config.js';
import { createLoop } from './core/loop.js';
import { createStateMachine } from './core/statemachine.js';
import { createViewport } from './ui/viewport.js';
import { createKeyboardInput, combineInputs } from './ui/input.js';
import { createTouchInput } from './ui/touch.js';
import { createRenderer, PAUSE_RECT } from './ui/render.js';
import {
  createPauseMenu,
  createLevelClearMenu,
  createTutorialBar,
  createTitleScreen,
  createHowtoScreen,
  createGameOverScreen,
  createHintToast,
  createInitialsScreen,
  createLeaderboardScreen,
  createRotateOverlay,
  createFullscreenButton,
} from './ui/screens.js';
import { createGame } from './game/game.js';
import { levelSpec } from './game/levels.js';
import { createScoring } from './game/scoring.js';
import { createStorage } from './services/storage.js';
import { createAudio } from './ui/audio.js';
import { createFx } from './ui/fx.js';
import { STRINGS } from './ui/strings.js';

const canvas = document.getElementById('game');
const overlayRoot = document.getElementById('overlay-root');
const vp = createViewport(canvas, { logicalW: LOGICAL_W, logicalH: LOGICAL_H });
const touchInput = createTouchInput(canvas, vp);
const input = combineInputs(createKeyboardInput(window), touchInput);
const fx = createFx();
const renderer = createRenderer(vp, fx);

const cellCenter = (c) => {
  const r = game.grid.cellRect(c.cx, c.cy);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
};

const storage = createStorage();
const prefs = storage.getPrefs();
const audio = createAudio();
audio.setMuted(prefs.mute);

// iOS/Chrome: AudioContext só pode nascer num gesto do usuário
const unlockAudio = () => audio.unlock();
window.addEventListener('pointerdown', unlockAudio, { once: false });
window.addEventListener('keydown', unlockAudio, { once: false });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) audio.resume();
});

// eventos do jogo → SFX (roteados no estado playing)
const EVENT_SFX = {
  wallStart: 'wallStart',
  anchor: 'anchor',
  fill: 'fill',
  shatter: 'shatter',
  lifeLost: 'death',
  win: 'win',
  gameover: 'gameover',
  powerup: 'powerup',
  powerupSpawn: 'countdown',
  shieldBreak: 'shieldBreak',
  denied: 'denied',
  countdown: 'countdown',
  go: 'go',
  vault: 'vault',
  relocate: 'relocate',
};

let themeKey = THEMES[prefs.theme] ? prefs.theme : DEFAULT_THEME;
let theme = THEMES[themeKey];
let hi = storage.getLeaderboard()[0]?.score ?? 0;

// ---------- Estado da run ----------
const newSeed = () => (Math.random() * 0xffffffff) >>> 0; // UI pode ser aleatória; o jogo é seedado
let seed = newSeed();
let zone = 1;
let game = null;
let scoring = createScoring();
let vaultHintShown = prefs.hintsSeen.includes('vault');

function startZone(z, lives) {
  zone = z;
  game = createGame({ level: levelSpec(z, seed), lives });
  scoring.setZone(z);
  if (z === 1) tutorialBar.show();
  else tutorialBar.hide();
}

function newRun() {
  seed = newSeed();
  scoring = createScoring();
  startZone(1, undefined);
}

// Arena viva ao fundo do título: só bolinhas quicando, sem orbe.
function makeAttract() {
  const g = createGame({
    level: {
      targetPct: 1,
      seed: newSeed(),
      balls: [
        { type: 'normal', x: 300, y: 250, dirX: 1, dirY: 1 },
        { type: 'veloz', x: 900, y: 500, dirX: -1, dirY: 1 },
        { type: 'gigante', x: 640, y: 300, dirX: 1, dirY: -1 },
        { type: 'fantasma', x: 1000, y: 200, dirX: -1, dirY: -1 },
        { type: 'normal', x: 200, y: 550, dirX: 1, dirY: -1 },
      ],
    },
  });
  g.player.iframes = Number.MAX_SAFE_INTEGER; // nunca morre (e nem aparece)
  return g;
}

// ---------- Telas DOM ----------
const titleScreen = createTitleScreen(overlayRoot, {
  onPlay: () => machine.goto('playing', { fresh: true }),
  onHowto: () => machine.goto('howto'),
  onBoard: () => machine.goto('leaderboard'),
});
const howtoScreen = createHowtoScreen(overlayRoot, { onBack: () => machine.goto('title') });
const pauseMenu = createPauseMenu(overlayRoot, {
  onResume: () => machine.goto('playing'),
  onRestart: () => {
    startZone(zone, game.lives);
    machine.goto('playing');
  },
  onTheme: (key) => {
    themeKey = key;
    theme = THEMES[key];
    storage.setPref('theme', key);
  },
  onToggle: (key) => {
    prefs[key] = !prefs[key];
    storage.setPref(key, prefs[key]);
    if (key === 'mute') audio.setMuted(prefs.mute);
    return prefs[key];
  },
});
const levelClearMenu = createLevelClearMenu(overlayRoot, {
  onNext: () => {
    startZone(zone + 1, Math.min(LIVES_MAX, game.lives + 1));
    machine.goto('playing');
  },
});
const gameOverScreen = createGameOverScreen(overlayRoot, {
  onRetry: () => machine.goto('playing', { fresh: true }),
  onMenu: () => machine.goto('title'),
});
const tutorialBar = createTutorialBar(overlayRoot);
const hintToast = createHintToast(overlayRoot);
createRotateOverlay(overlayRoot);
createFullscreenButton(overlayRoot);

const initialsScreen = createInitialsScreen(overlayRoot, {
  onSubmit: (name) => {
    const pos = storage.addScore({
      name,
      score: scoring.score,
      level: scoring.stats.zoneReached,
    });
    hi = storage.getLeaderboard()[0]?.score ?? hi;
    machine.goto('leaderboard', { highlight: pos });
  },
});

const leaderboardScreen = createLeaderboardScreen(overlayRoot, {
  onBack: () => machine.goto('title'),
  onShare: shareScore,
});

async function shareScore() {
  const best = storage.getLeaderboard()[0];
  const text = STRINGS.leaderboard.shareText(best ? best.score : scoring.score);
  const url = location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title: STRINGS.gameName, text, url });
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      hintToast.show(STRINGS.leaderboard.shared);
    }
  } catch {
    // usuário cancelou o share — sem drama
  }
}

// ---------- Estados ----------
let attract = null;

const machine = createStateMachine({
  title: {
    enter() {
      attract = makeAttract();
      titleScreen.show();
      tutorialBar.hide();
    },
    exit: () => titleScreen.hide(),
    update(dt, snap) {
      attract.update({}, dt);
      if (snap.confirmJust) machine.goto('playing', { fresh: true });
    },
    render() {
      renderer.draw(attract, theme, { zone: 0, score: 0, hi: 0, hidePlayer: true, hideHud: true });
    },
  },

  howto: {
    enter: () => howtoScreen.show(),
    exit: () => howtoScreen.hide(),
    update(dt, snap) {
      attract.update({}, dt);
      if (snap.confirmJust || snap.pauseJust) machine.goto('title');
    },
    render() {
      renderer.draw(attract, theme, { zone: 0, score: 0, hi: 0, hidePlayer: true, hideHud: true });
    },
  },

  playing: {
    enter(params) {
      if (params && params.fresh) newRun();
    },
    update(dt, snap) {
      if (fx.tick(dt)) return; // micro hit-stop: mundo congelado por ~80ms
      if (snap.pauseJust) {
        machine.goto('paused');
        return;
      }
      if (snap.restartJust) {
        newRun();
        return;
      }

      const events = game.update(snap, dt);
      for (const e of events) {
        if (EVENT_SFX[e.type]) audio.play(EVENT_SFX[e.type]);
        if (e.type === 'complete') {
          scoring.onWallComplete();
          // faíscas ao longo da parede recém-completada
          for (let i = 0; i < e.cells.length; i += 4) {
            const pt = cellCenter(e.cells[i]);
            fx.burst(pt.x, pt.y, theme.wall, { count: 3, speed: 90, life: 0.4, size: 2.5 });
          }
        } else if (e.type === 'shatter') {
          scoring.onShatter();
          fx.addShake(8);
          fx.addHitStop(0.08); // quebra à distância precisa ser legível
          for (let i = 0; i < e.cells.length; i += 2) {
            const pt = cellCenter(e.cells[i]);
            fx.burst(pt.x, pt.y, theme.wallGrow, { count: 5, speed: 200, life: 0.5 });
          }
        } else if (e.type === 'lifeLost') {
          if (e.cause === 'ball') scoring.onDeath();
          if (prefs.vibrate && navigator.vibrate) navigator.vibrate(80);
          fx.addShake(10);
          fx.burst(game.player.x, game.player.y, theme.danger, { count: 26, speed: 260, life: 0.7 });
        } else if (e.type === 'fill') {
          scoring.onFill(e.cells / (GRID_W * GRID_H), zone);
          fx.addShake(3);
          fx.flash(theme.claimedEdge, 0.18);
        } else if (e.type === 'powerup') {
          fx.burst(game.player.x, game.player.y, theme.powerup, { count: 16, speed: 180, life: 0.5 });
        } else if (e.type === 'shieldBreak') {
          fx.burst(game.player.x, game.player.y, theme.powerup, { count: 20, speed: 240, life: 0.6 });
        } else if (e.type === 'vault') {
          fx.burst(game.player.x, game.player.y, theme.playerGlow, { count: 8, speed: 120, life: 0.35 });
        } else if (e.type === 'win') {
          // implosão: cada bola presa vira um festival de partículas
          for (const b of game.balls) {
            fx.burst(b.x, b.y, theme.balls[b.type], { count: 22, speed: 200, life: 0.9 });
          }
          fx.addShake(5);
          machine.goto('levelclear');
        } else if (e.type === 'gameover') {
          machine.goto(storage.qualifies(scoring.score) ? 'initials' : 'gameover');
        }
      }

      // música reage ao jogo: intensidade = progresso rumo ao alvo
      audio.setTension({
        intensity: game.grid.coveredFraction() / game.targetPct,
        nearWin: game.targetPct - game.grid.coveredFraction() < 0.1,
        clockSlow: game.effects.clock > 0,
      });

      // dica contextual do vault (one-shot, persistida)
      if (!vaultHintShown && game.player.vault) {
        vaultHintShown = true;
        storage.setPref('hintsSeen', [...prefs.hintsSeen, 'vault']);
        hintToast.show(STRINGS.hints.vault);
      }
    },
    render() {
      renderer.draw(game, theme, {
        zone,
        score: scoring.score,
        hi,
        touch: touchInput.visual(),
        allowShake: prefs.shake,
        allowFlash: prefs.flash,
      });
    },
  },

  paused: {
    enter: () => pauseMenu.show(themeKey, prefs),
    exit: () => pauseMenu.hide(),
    update(dt, snap) {
      if (snap.pauseJust) machine.goto('playing');
    },
    render() {
      renderer.draw(game, theme, { zone, score: scoring.score, hi });
    },
  },

  levelclear: {
    enter() {
      this.animT = 0;
      this.menuShown = false;
    },
    exit: () => levelClearMenu.hide(),
    update(dt, snap) {
      fx.tick(dt); // partículas da implosão continuam vivas na celebração
      this.animT += dt;
      if (!this.menuShown && this.animT >= 1.5) {
        this.menuShown = true;
        const bonus = scoring.zoneBonus({
          lives: game.lives,
          covered: game.grid.coveredFraction(),
          target: game.targetPct,
          timeLeft: game.timeLeft,
        });
        levelClearMenu.show(zone, game.grid.coveredFraction(), bonus);
      }
      if (this.menuShown && snap.confirmJust) {
        startZone(zone + 1, Math.min(LIVES_MAX, game.lives + 1));
        machine.goto('playing');
      }
    },
    render() {
      const scale = Math.max(0, 1 - this.animT / 1.5);
      renderer.draw(game, theme, {
        zone,
        score: scoring.score,
        hi,
        ballScale: scale,
        allowShake: prefs.shake,
        allowFlash: prefs.flash,
      });
    },
  },

  gameover: {
    enter: () => gameOverScreen.show(scoring.score, scoring.stats),
    exit: () => gameOverScreen.hide(),
    update(dt, snap) {
      if (snap.confirmJust || snap.restartJust) machine.goto('playing', { fresh: true });
    },
    render() {
      renderer.draw(game, theme, { zone, score: scoring.score, hi });
    },
  },

  initials: {
    enter: () => initialsScreen.show(scoring.score),
    exit: () => initialsScreen.hide(),
    render() {
      renderer.draw(game ?? attract, theme, { zone, score: scoring.score, hi, hideHud: !game });
    },
  },

  leaderboard: {
    enter(params) {
      leaderboardScreen.show(storage.getLeaderboard(), params && params.highlight);
    },
    exit: () => leaderboardScreen.hide(),
    update(dt, snap) {
      if (attract) attract.update({}, dt);
      if (snap.pauseJust) machine.goto('title');
    },
    render() {
      const backdrop = game ?? attract;
      renderer.draw(backdrop, theme, {
        zone,
        score: scoring.score,
        hi,
        hidePlayer: backdrop === attract,
        hideHud: backdrop === attract,
      });
    },
  },
});

// Auto-pausa ao perder o foco — e NUNCA retoma sozinho.
window.addEventListener('blur', () => {
  if (machine.name === 'playing') machine.goto('paused');
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && machine.name === 'playing') machine.goto('paused');
});

// Girou para retrato no meio da partida → pausa (o overlay de rotação cobre)
const portraitQuery = matchMedia('(orientation: portrait)');
portraitQuery.addEventListener('change', () => {
  if (portraitQuery.matches && machine.name === 'playing') machine.goto('paused');
});

// Botão de pausa da HUD (hit test em coordenadas lógicas)
canvas.addEventListener('click', (e) => {
  if (machine.name !== 'playing') return;
  const { x, y } = vp.toLogical(e.clientX, e.clientY);
  if (
    x >= PAUSE_RECT.x &&
    x <= PAUSE_RECT.x + PAUSE_RECT.w &&
    y >= PAUSE_RECT.y &&
    y <= PAUSE_RECT.y + PAUSE_RECT.h
  ) {
    machine.goto('paused');
  }
});

// ---------- Loop ----------
machine.goto('title');
createLoop({
  update: (dt) => {
    const snap = input.sample();
    if (snap.muteJust) {
      prefs.mute = !prefs.mute;
      storage.setPref('mute', prefs.mute);
      audio.setMuted(prefs.mute);
    }
    machine.update(dt, snap);
  },
  render: () => machine.render(),
}).start();
