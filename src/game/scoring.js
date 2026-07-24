// Pontuação da RUN (persiste entre zonas): redutor puro sobre os eventos do
// jogo — main.js roteia fill/quebra/morte/vitória para cá. Módulo PURO.

import {
  POINTS_PER_PCT,
  BIG_CHUNK_PCT,
  COMBO_STEP,
  COMBO_MULT_MAX,
  ZONE_BONUS_PER_LIFE,
  ZONE_BONUS_PER_EXCESS_PCT,
  TIME_BONUS_RATE,
} from '../config.js';

export function createScoring() {
  const s = {
    score: 0,
    combo: 0, // fills consecutivos sem quebra/morte
    stats: {
      wallsBuilt: 0,
      wallsShattered: 0,
      maxCombo: 0,
      biggestFillPct: 0,
      zoneReached: 1,
    },

    onWallComplete() {
      s.stats.wallsBuilt++;
    },

    onShatter() {
      s.stats.wallsShattered++;
      s.combo = 0;
    },

    onDeath() {
      s.combo = 0;
    },

    setZone(zone) {
      s.stats.zoneReached = Math.max(s.stats.zoneReached, zone);
    },

    // fraction = fatia da arena preenchida neste fill (0..1)
    onFill(fraction, zone) {
      const comboMult = Math.min(COMBO_MULT_MAX, 1 + s.combo * COMBO_STEP);
      let points = Math.round(fraction * 100 * POINTS_PER_PCT * zone * comboMult);
      const doubled = fraction >= BIG_CHUNK_PCT;
      if (doubled) points *= 2;
      s.score += points;
      s.combo++;
      s.stats.maxCombo = Math.max(s.stats.maxCombo, s.combo);
      s.stats.biggestFillPct = Math.max(s.stats.biggestFillPct, fraction);
      return { points, doubled, comboMult };
    },

    zoneBonus({ lives, covered, target, timeLeft }) {
      const livesBonus = lives * ZONE_BONUS_PER_LIFE;
      const excessBonus = Math.round(Math.max(0, covered - target) * 100 * ZONE_BONUS_PER_EXCESS_PCT);
      const timeBonus = Math.floor(timeLeft) * TIME_BONUS_RATE;
      const total = livesBonus + excessBonus + timeBonus;
      s.score += total;
      return { livesBonus, excessBonus, timeBonus, total };
    },
  };
  return s;
}
