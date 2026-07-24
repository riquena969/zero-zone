// Persistência: interface KV mínima (localStorage no browser, memória como
// fallback para modo privado/testes) + leaderboard top-10 + preferências.
// Importável no Node sem browser (o "banco" fica atrás do adapter — trocar por
// um backend online um dia = escrever outro KV, o jogo não muda).

const LB_KEY = 'zz_leaderboard';
const PREFS_KEY = 'zz_prefs';
const MAX_ENTRIES = 10;
const NAME_RE = /^[A-Z]{3}$/;

const DEFAULT_PREFS = {
  mute: false,
  vibrate: true,
  shake: true,
  flash: true,
  theme: 'tron',
  hintsSeen: [],
};

export function createMemoryKV() {
  const m = new Map();
  return {
    get: (k) => (m.has(k) ? m.get(k) : null),
    set: (k, v) => m.set(k, v),
  };
}

// null se localStorage não existe ou não é gravável (modo privado etc.)
export function createLocalStorageKV() {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    const probe = '__zz_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return {
      get: (k) => ls.getItem(k),
      set: (k, v) => ls.setItem(k, v),
    };
  } catch {
    return null;
  }
}

function readJSON(kv, key, fallback) {
  try {
    const raw = kv.get(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function createStorage(kv = createLocalStorageKV() ?? createMemoryKV()) {
  function getLeaderboard() {
    const lb = readJSON(kv, LB_KEY, []);
    return Array.isArray(lb) ? lb : [];
  }

  return {
    getLeaderboard,

    // Empate com o 10º não qualifica: entrada existente ganha.
    qualifies(score) {
      if (score <= 0) return false;
      const lb = getLeaderboard();
      if (lb.length < MAX_ENTRIES) return true;
      return score > lb[lb.length - 1].score;
    },

    // Retorna a posição 1-based da entrada nova (ou -1 se ficou fora do top-10).
    addScore({ name, score, level, date }) {
      const clean = String(name).toUpperCase();
      if (!NAME_RE.test(clean)) throw new Error(`iniciais inválidas: ${name}`);
      const entry = {
        name: clean,
        score,
        level,
        date: date ?? new Date().toISOString().slice(0, 10),
      };
      const lb = getLeaderboard();
      lb.push(entry); // sort estável: em empate, quem já estava fica na frente
      lb.sort((a, b) => b.score - a.score);
      const top = lb.slice(0, MAX_ENTRIES);
      kv.set(LB_KEY, JSON.stringify(top));
      const pos = top.indexOf(entry);
      return pos === -1 ? -1 : pos + 1;
    },

    getPrefs() {
      const stored = readJSON(kv, PREFS_KEY, {});
      return { ...DEFAULT_PREFS, ...stored };
    },

    setPref(key, value) {
      const stored = readJSON(kv, PREFS_KEY, {});
      stored[key] = value;
      kv.set(PREFS_KEY, JSON.stringify(stored));
    },
  };
}
