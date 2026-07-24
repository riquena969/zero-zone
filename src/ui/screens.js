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
      <button data-act="next">${STRINGS.levelclear.next}</button>
    </div>
  `;
  root.appendChild(el);
  el.querySelector('[data-act="next"]').addEventListener('click', () => onNext());

  return {
    show(zone, coveredFraction) {
      el.querySelector('[data-slot="title"]').textContent = STRINGS.levelclear.dominated(zone);
      el.querySelector('[data-slot="stats"]').textContent = STRINGS.levelclear.conquered(
        Math.floor(coveredFraction * 100),
      );
      el.classList.remove('hidden');
    },
    hide() {
      el.classList.add('hidden');
    },
  };
}

// Barra de tutorial da ZONA 1 (dicas contextuais one-shot chegam na fatia 9)
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
