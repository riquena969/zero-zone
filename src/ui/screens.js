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
