// Overlays DOM (menus). O canvas cuida do mundo; DOM cuida de texto clicável —
// acessível, com foco e touch targets decentes de graça.

import { THEMES } from '../config.js';
import { STRINGS } from './strings.js';

const THEME_KEYS = Object.keys(THEMES);

export function createPauseMenu(root, { onResume, onRestart, onTheme, onToggle }) {
  const S = STRINGS.pause;
  const el = document.createElement('div');
  el.className = 'menu hidden';
  el.innerHTML = `
    <div class="menu-panel">
      <h2>${S.title}</h2>
      <button data-act="resume">${S.resume}</button>
      <button data-act="restart">${S.restart}</button>
      <button data-act="theme"></button>
      <button data-act="sound"></button>
      <button data-act="vibrate"></button>
    </div>
  `;
  root.appendChild(el);

  const btn = (act) => el.querySelector(`[data-act="${act}"]`);
  let themeKey = THEME_KEYS[0];
  let prefs = { mute: false, vibrate: true };

  function paint() {
    btn('theme').textContent = `${S.theme}: ${THEMES[themeKey].label}`;
    btn('sound').textContent = `${S.sound}: ${prefs.mute ? S.off : S.on}`;
    btn('vibrate').textContent = `${S.vibrate}: ${prefs.vibrate ? S.on : S.off}`;
  }

  el.addEventListener('click', (e) => {
    const act = e.target.dataset && e.target.dataset.act;
    if (act === 'resume') onResume();
    else if (act === 'restart') onRestart();
    else if (act === 'theme') {
      themeKey = THEME_KEYS[(THEME_KEYS.indexOf(themeKey) + 1) % THEME_KEYS.length];
      onTheme(themeKey);
      paint();
    } else if (act === 'sound') {
      prefs.mute = onToggle('mute');
      paint();
    } else if (act === 'vibrate') {
      prefs.vibrate = onToggle('vibrate');
      paint();
    }
  });

  return {
    show(currentThemeKey, currentPrefs) {
      if (currentThemeKey) themeKey = currentThemeKey;
      if (currentPrefs) prefs = { mute: currentPrefs.mute, vibrate: currentPrefs.vibrate };
      paint();
      el.classList.remove('hidden');
    },
    hide() {
      el.classList.add('hidden');
    },
  };
}

// Overlay "gire o celular" — visibilidade 100% via CSS (portrait + toque)
export function createRotateOverlay(root) {
  const el = document.createElement('div');
  el.className = 'rotate-overlay';
  el.innerHTML = `<div><h2>${STRINGS.rotate.title}</h2><p>${STRINGS.rotate.sub}</p></div>`;
  root.appendChild(el);
}

// Botão de tela cheia (canto superior esquerdo, discreto)
export function createFullscreenButton(root) {
  const el = document.createElement('button');
  el.className = 'fullscreen-btn';
  el.textContent = '⛶';
  el.title = 'Tela cheia';
  root.appendChild(el);
  el.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  });
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

export function createTitleScreen(root, { onPlay, onHowto, onBoard }) {
  const el = document.createElement('div');
  el.className = 'menu title-screen hidden';
  el.innerHTML = `
    <div class="title-box">
      <h1>${STRINGS.gameName}</h1>
      <p class="subtitle">${STRINGS.title.subtitle}</p>
      <button data-act="play">${STRINGS.title.play}</button>
      <button data-act="howto">${STRINGS.title.howto}</button>
      <button data-act="board">${STRINGS.title.board}</button>
      <p class="key-hint">${STRINGS.title.hint}</p>
    </div>
  `;
  root.appendChild(el);
  el.addEventListener('click', (e) => {
    const act = e.target.dataset && e.target.dataset.act;
    if (act === 'play') onPlay();
    else if (act === 'howto') onHowto();
    else if (act === 'board') onBoard();
  });
  return {
    show: () => el.classList.remove('hidden'),
    hide: () => el.classList.add('hidden'),
  };
}

// Entrada de iniciais estilo fliperama: 3 slots A-Z.
// Aceita digitação direta (teclado físico), setinhas, e ▲/▼ por toque/clique.
export function createInitialsScreen(root, { onSubmit }) {
  const S = STRINGS.initials;
  const el = document.createElement('div');
  el.className = 'menu hidden';
  el.innerHTML = `
    <div class="menu-panel">
      <h2>${S.title}</h2>
      <p data-slot="score" class="final-score"></p>
      <p>${S.prompt}</p>
      <div class="initials-row">
        ${[0, 1, 2]
          .map(
            (i) => `
          <div class="initial-slot" data-slot-idx="${i}">
            <button class="tiny" data-up="${i}">▲</button>
            <div class="letter" data-letter="${i}">A</div>
            <button class="tiny" data-down="${i}">▼</button>
          </div>`,
          )
          .join('')}
      </div>
      <button data-act="ok">${S.confirm}</button>
    </div>
  `;
  root.appendChild(el);

  const A = 65;
  let letters = ['A', 'A', 'A'];
  let active = 0;

  function paint() {
    for (let i = 0; i < 3; i++) {
      const slot = el.querySelector(`[data-letter="${i}"]`);
      slot.textContent = letters[i];
      slot.parentElement.classList.toggle('active', i === active);
    }
  }

  function cycle(i, delta) {
    const code = (letters[i].charCodeAt(0) - A + delta + 26) % 26;
    letters[i] = String.fromCharCode(A + code);
    active = i;
    paint();
  }

  function submit() {
    onSubmit(letters.join(''));
  }

  function onKey(e) {
    if (e.key === 'Enter') return submit();
    if (e.key === 'Backspace') {
      active = Math.max(0, active - 1);
      return paint();
    }
    if (e.key === 'ArrowLeft') {
      active = Math.max(0, active - 1);
      return paint();
    }
    if (e.key === 'ArrowRight') {
      active = Math.min(2, active + 1);
      return paint();
    }
    if (e.key === 'ArrowUp') return cycle(active, 1);
    if (e.key === 'ArrowDown') return cycle(active, -1);
    if (/^[a-zA-Z]$/.test(e.key)) {
      letters[active] = e.key.toUpperCase();
      active = Math.min(2, active + 1);
      return paint();
    }
  }

  el.addEventListener('click', (e) => {
    const d = e.target.dataset || {};
    if (d.up !== undefined) cycle(Number(d.up), 1);
    else if (d.down !== undefined) cycle(Number(d.down), -1);
    else if (d.act === 'ok') submit();
  });

  return {
    show(score) {
      letters = ['A', 'A', 'A'];
      active = 0;
      el.querySelector('[data-slot="score"]').textContent = String(score);
      paint();
      el.classList.remove('hidden');
      document.addEventListener('keydown', onKey);
    },
    hide() {
      el.classList.add('hidden');
      document.removeEventListener('keydown', onKey);
    },
  };
}

export function createLeaderboardScreen(root, { onBack, onShare }) {
  const S = STRINGS.leaderboard;
  const el = document.createElement('div');
  el.className = 'menu hidden';
  el.innerHTML = `
    <div class="menu-panel">
      <h2>${S.title}</h2>
      <table class="board-table"><tbody data-slot="rows"></tbody></table>
      <p class="key-hint hidden" data-slot="empty">${S.empty}</p>
      <button data-act="share">${S.share}</button>
      <button data-act="back">${S.back}</button>
    </div>
  `;
  root.appendChild(el);
  el.addEventListener('click', (e) => {
    const act = e.target.dataset && e.target.dataset.act;
    if (act === 'back') onBack();
    else if (act === 'share') onShare();
  });

  return {
    show(entries, highlightPos) {
      const rows = el.querySelector('[data-slot="rows"]');
      rows.innerHTML = entries
        .map(
          (en, i) => `
        <tr class="${i + 1 === highlightPos ? 'highlight' : ''}">
          <td>${i + 1}.</td><td>${en.name}</td><td>${en.score}</td><td>Z${en.level}</td>
        </tr>`,
        )
        .join('');
      el.querySelector('[data-slot="empty"]').classList.toggle('hidden', entries.length > 0);
      el.classList.remove('hidden');
    },
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
