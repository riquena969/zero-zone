// Áudio 100% procedural via WebAudio — zero arquivos.
// SFX: osciladores curtos com envelope. Música: sequenciador synthwave tenso
// (baixo + arpejo + pulso de lead) que REAGE ao jogo: BPM e camadas sobem com o
// % conquistado, camada extra quando falta <10% para o alvo, desacelera sob o
// Relógio. AudioContext só nasce no 1º gesto (iOS); sons pré-unlock são
// descartados (nunca enfileirados).

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let schedulerId = null;

  // estado musical
  let intensity = 0; // 0..1 — sobe com o % conquistado
  let nearWin = false; // <10% do alvo → camada extra
  let clockSlow = false; // efeito Relógio → tudo mais lento
  let step = 0;
  let nextNoteTime = 0;

  // Lá menor, vibe sombria: baixo em 8 passos, arpejo em 4
  const BASS = [55, 55, 82.4, 55, 65.4, 65.4, 98, 73.4]; // A1 A1 E2 A1 C2 C2 G2 D2
  const ARP = [220, 261.6, 329.6, 440]; // A3 C4 E4 A4
  const LEAD = [880, 659.3]; // A5 E5 alternando

  function ensureCtx() {
    if (ctx) return true;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.5;
    musicGain.connect(master);
    startScheduler();
    return true;
  }

  function note({ freq, freqEnd, dur, type = 'square', vol = 0.25, delay = 0, out = master }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst({ dur = 0.2, vol = 0.25, delay = 0 }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(master);
    src.start(t0);
  }

  // ---------- Música: agendamento com antecedência (padrão WebAudio) ----------
  function startScheduler() {
    const LOOKAHEAD = 0.12; // s agendados à frente
    nextNoteTime = ctx.currentTime + 0.05;
    schedulerId = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      const bpm = (100 + 40 * intensity) * (clockSlow ? 0.6 : 1);
      const sixteenth = 60 / bpm / 4;
      while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
        scheduleStep(step, nextNoteTime, sixteenth);
        nextNoteTime += sixteenth;
        step = (step + 1) % 16;
      }
    }, 30);
  }

  function scheduleStep(s, t, dur) {
    const delay = Math.max(0, t - ctx.currentTime);
    // baixo: colcheias (passos pares)
    if (s % 2 === 0) {
      note({
        freq: BASS[(s / 2) % 8],
        dur: dur * 1.8,
        type: 'sawtooth',
        vol: 0.16 + 0.06 * intensity,
        delay,
        out: musicGain,
      });
    }
    // "hi-hat": ruído curtinho nos contratempos, entra com o jogo esquentando
    if (intensity > 0.15 && s % 4 === 2) {
      noiseBurst({ dur: 0.03, vol: 0.05 + 0.05 * intensity, delay });
    }
    // arpejo: semínimas, entra na metade do caminho
    if (intensity > 0.35 && s % 4 === 0) {
      note({
        freq: ARP[(s / 4) % 4],
        dur: dur * 3,
        type: 'triangle',
        vol: 0.12,
        delay,
        out: musicGain,
      });
    }
    // pulso de lead: só na reta final (<10% do alvo) — a camada da tensão
    if (nearWin && s % 8 === 0) {
      note({
        freq: LEAD[(s / 8) % 2],
        dur: dur * 5,
        type: 'square',
        vol: 0.07,
        delay,
        out: musicGain,
      });
    }
  }

  // ---------- SFX ----------
  const SFX = {
    wallStart: () => note({ freq: 220, freqEnd: 440, dur: 0.12, vol: 0.22 }),
    anchor: () => note({ freq: 660, dur: 0.07, vol: 0.18 }),
    fill: () => {
      note({ freq: 523.3, dur: 0.09, type: 'triangle', vol: 0.28 });
      note({ freq: 659.3, dur: 0.09, type: 'triangle', vol: 0.28, delay: 0.07 });
      note({ freq: 784, dur: 0.14, type: 'triangle', vol: 0.3, delay: 0.14 });
    },
    shatter: () => {
      noiseBurst({ dur: 0.25, vol: 0.3 });
      note({ freq: 300, freqEnd: 70, dur: 0.3, type: 'sawtooth', vol: 0.3 });
    },
    death: () => note({ freq: 420, freqEnd: 55, dur: 0.55, type: 'sawtooth', vol: 0.34 }),
    win: () => {
      [523.3, 659.3, 784, 1046.5].forEach((f, i) =>
        note({ freq: f, dur: 0.16, type: 'triangle', vol: 0.3, delay: i * 0.12 }),
      );
    },
    gameover: () => {
      [392, 311.1, 233.1, 174.6].forEach((f, i) =>
        note({ freq: f, dur: 0.3, type: 'sawtooth', vol: 0.25, delay: i * 0.22 }),
      );
    },
    powerup: () => note({ freq: 880, freqEnd: 1760, dur: 0.16, type: 'triangle', vol: 0.28 }),
    shieldBreak: () => note({ freq: 1200, freqEnd: 200, dur: 0.22, vol: 0.28 }),
    denied: () => note({ freq: 110, dur: 0.09, vol: 0.14 }),
    countdown: () => note({ freq: 440, dur: 0.09, type: 'triangle', vol: 0.25 }),
    go: () => note({ freq: 880, dur: 0.2, type: 'triangle', vol: 0.3 }),
    vault: () => note({ freq: 330, freqEnd: 660, dur: 0.12, type: 'triangle', vol: 0.22 }),
    relocate: () => note({ freq: 500, freqEnd: 900, dur: 0.1, type: 'triangle', vol: 0.2 }),
  };

  return {
    // Chamar no 1º gesto do usuário (pointerdown/keydown) — iOS exige.
    unlock() {
      if (!ensureCtx()) return;
      if (ctx.state === 'suspended') ctx.resume();
    },
    resume() {
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    play(name) {
      if (!ctx || muted) return;
      const fn = SFX[name];
      if (fn) fn();
    },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.55;
    },
    setTension({ intensity: i, nearWin: nw, clockSlow: cs }) {
      intensity = Math.max(0, Math.min(1, i));
      nearWin = nw;
      clockSlow = cs;
    },
    dispose() {
      if (schedulerId) clearInterval(schedulerId);
      if (ctx) ctx.close();
    },
  };
}
