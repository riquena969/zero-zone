// Overlays DOM (menus). O canvas cuida do mundo; DOM cuida de texto clicável —
// acessível, com foco e touch targets decentes de graça.

import { THEMES } from '../config.js';
import { STRINGS } from './strings.js';

const THEME_KEYS = Object.keys(THEMES);

export function createPauseMenu(root, { onResume, onRestart, onTheme }) {
  const el = document.createElement('div');
  el.className = 'menu hidden';
  el.innerHTML = `
    <div class="menu-panel">
      <h2>${STRINGS.pause.title}</h2>
      <button data-act="resume">${STRINGS.pause.resume}</button>
      <button data-act="restart">${STRINGS.pause.restart}</button>
      <button data-act="theme"></button>
    </div>
  `;
  root.appendChild(el);

  const themeBtn = el.querySelector('[data-act="theme"]');
  let themeKey = THEME_KEYS[0];

  function themeLabel() {
    return `${STRINGS.pause.theme}: ${THEMES[themeKey].label}`;
  }

  el.addEventListener('click', (e) => {
    const act = e.target.dataset && e.target.dataset.act;
    if (act === 'resume') onResume();
    else if (act === 'restart') onRestart();
    else if (act === 'theme') {
      themeKey = THEME_KEYS[(THEME_KEYS.indexOf(themeKey) + 1) % THEME_KEYS.length];
      themeBtn.textContent = themeLabel();
      onTheme(themeKey);
    }
  });

  return {
    show(currentThemeKey) {
      if (currentThemeKey) themeKey = currentThemeKey;
      themeBtn.textContent = themeLabel();
      el.classList.remove('hidden');
    },
    hide() {
      el.classList.add('hidden');
    },
  };
}

export function createLevelClearMenu(root, { onNext }) {
  const el = document.createElement('div');
  el.className = 'menu hidden';
  el.innerHTML = `
    <div class="menu-panel">
      <h2 data-slot="title"></h2>
      <p data-slot="stats"></p>
      <p data-slot="bonus"></p>
      <button data-act="next">${STRINGS.levelclear.next}</button>
    </div>
  `;
  root.appendChild(el);
  el.querySelector('[data-act="next"]').addEventListener('click', () => onNext());

  return {
    show(zone, coveredFraction, bonus) {
      el.querySelector('[data-slot="title"]').textContent = STRINGS.levelclear.dominated(zone);
      el.querySelector('[data-slot="stats"]').textContent = STRINGS.levelclear.conquered(
        Math.floor(coveredFraction * 100),
      );
      el.querySelector('[data-slot="bonus"]').textContent = bonus ? STRINGS.levelclear.bonus(bonus) : '';
      el.classList.remove('hidden');
    },
    hide() {
      el.classList.add('hidden');
    },
  };
}

// Barra de tutorial da ZONA 1
export function createTutorialBar(root) {
  const el = document.createElement('div');
  el.className = 'tutorial-bar hidden';
  el.textContent = STRINGS.tutorial;
  root.appendChild(el);
  return {
    show() {
      el.classList.remove('hidden');
    },
    hide() {
      el.classList.add('hidden');
    },
  };
}

export function createTitleScreen(root, { onPlay, onHowto }) {
  const el = document.createElement('div');
  el.className = 'menu title-screen hidden';
  el.innerHTML = `
    <div class="title-box">
      <h1>${STRINGS.gameName}</h1>
      <p class="subtitle">${STRINGS.title.subtitle}</p>
      <button data-act="play">${STRINGS.title.play}</button>
      <button data-act="howto">${STRINGS.title.howto}</button>
      <p class="key-hint">${STRINGS.title.hint}</p>
    </div>
  `;
  root.appendChild(el);
  el.addEventListener('click', (e) => {
    const act = e.target.dataset && e.target.dataset.act;
    if (act === 'play') onPlay();
    else if (act === 'howto') onHowto();
  });
  return {
    show: () => el.classList.remove('hidden'),
    hide: () => el.classList.add('hidden'),
  };
}

export function createHowtoScreen(root, { onBack }) {
  const el = document.createElement('div');
  el.className = 'menu hidden';
  el.innerHTML = `
    <div class="menu-panel howto-panel">
      <h2>${STRINGS.howto.title}</h2>
      <ul>${STRINGS.howto.lines.map((l) => `<li>${l}</li>`).join('')}</ul>
      <button data-act="back">${STRINGS.howto.back}</button>
    </div>
  `;
  root.appendChild(el);
  el.querySelector('[data-act="back"]').addEventListener('click', () => onBack());
  return {
    show: () => el.classList.remove('hidden'),
    hide: () => el.classList.add('hidden'),
  };
}

export function createGameOverScreen(root, { onRetry, onMenu }) {
  const S = STRINGS.gameoverScreen;
  const el = document.createElement('div');
  el.className = 'menu hidden';
  el.innerHTML = `
    <div class="menu-panel">
      <h2 class="danger">${S.title}</h2>
      <p class="final-score" data-slot="score"></p>
      <table class="stats-table">
        <tr><td>${S.zone}</td><td data-slot="zone"></td></tr>
        <tr><td>${S.walls}</td><td data-slot="walls"></td></tr>
        <tr><td>${S.shattered}</td><td data-slot="shattered"></td></tr>
        <tr><td>${S.maxCombo}</td><td data-slot="maxCombo"></td></tr>
        <tr><td>${S.biggestFill}</td><td data-slot="biggestFill"></td></tr>
      </table>
      <button data-act="retry">${S.retry}</button>
      <button data-act="menu">${S.menu}</button>
    </div>
  `;
  root.appendChild(el);
  el.addEventListener('click', (e) => {
    const act = e.target.dataset && e.target.dataset.act;
    if (act === 'retry') onRetry();
    else if (act === 'menu') onMenu();
  });
  const slot = (n) => el.querySelector(`[data-slot="${n}"]`);
  return {
    show(score, stats) {
      slot('score').textContent = `${S.score}: ${score}`;
      slot('zone').textContent = `ZONA ${stats.zoneReached}`;
      slot('walls').textContent = stats.wallsBuilt;
      slot('shattered').textContent = stats.wallsShattered;
      slot('maxCombo').textContent = `${stats.maxCombo}×`;
      slot('biggestFill').textContent = `${Math.round(stats.biggestFillPct * 100)}%`;
      el.classList.remove('hidden');
    },
    hide: () => el.classList.add('hidden'),
  };
}

// Toast de dica contextual (one-shot), some sozinho.
export function createHintToast(root) {
  const el = document.createElement('div');
  el.className = 'tutorial-bar hint-toast hidden';
  root.appendChild(el);
  let timer = null;
  return {
    show(text) {
      el.textContent = text;
      el.classList.remove('hidden');
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.add('hidden'), 4000);
    },
  };
}
