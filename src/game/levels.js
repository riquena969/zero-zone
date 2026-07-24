// Tabela das 12 ZONAS da campanha + fórmula do modo infinito.
// Data-driven: cada entrada é 'tipo@speedMul'. Tipos que ainda não existem em
// BALL_TYPES caem para 'normal' (as especiais chegam na fatia 7 sem tocar aqui).
// Posições de spawn são seedadas: a distância mínima do jogador garante que
// ninguém morre no segundo zero. Módulo PURO.

import {
  BALL_TYPES,
  MAX_AXIS_SPEED,
  LOGICAL_W,
  LOGICAL_H,
  ARENA_Y,
  COUNTDOWN_TIME,
  SPAWN_MARGIN,
  SPAWN_MIN_PLAYER_DIST,
  SPAWN_MIN_BALL_DIST,
} from '../config.js';
import { mulberry32 } from './rng.js';

// Zonas 1..12 — uma novidade por zona quase sempre (ver docs/PLANO.md)
const CAMPAIGN = [
  { target: 0.6, balls: ['normal@0.85'] },
  { target: 0.65, balls: ['normal@0.9', 'normal@0.9'] },
  { target: 0.7, balls: ['normal@0.9', 'normal@1.1'] }, // + Relógio (fatia 8)
  { target: 0.7, balls: ['normal@1', 'normal@1', 'veloz@1'] },
  { target: 0.75, balls: ['normal@1.1', 'normal@1.1', 'veloz@1'] }, // + Escudo
  { target: 0.7, balls: ['normal@1', 'normal@1', 'gigante@1'] },
  { target: 0.75, balls: ['normal@1.1', 'normal@1', 'veloz@1', 'gigante@1'] }, // + Turbo
  { target: 0.75, balls: ['normal@1', 'normal@1.1', 'veloz@1', 'fantasma@1'] },
  { target: 0.75, balls: ['normal@1', 'normal@1.1', 'veloz@1', 'gigante@1', 'fantasma@1'] },
  { target: 0.75, balls: ['normal@1.1', 'normal@1.1', 'veloz@1', 'fantasma@1', 'perseguidora@1'] },
  { target: 0.78, balls: ['normal@1.15', 'normal@1.15', 'veloz@1', 'veloz@1', 'gigante@1', 'fantasma@1'] },
  { target: 0.8, balls: ['normal@1.2', 'veloz@1', 'veloz@1', 'gigante@1', 'fantasma@1', 'perseguidora@1'] },
];

const INFINITE_POOL = ['normal', 'normal', 'veloz', 'gigante', 'fantasma', 'perseguidora'];

function infiniteDef(zone, rnd) {
  const count = Math.min(10, 6 + Math.floor((zone - 11) / 2));
  const speed = 1.15 * 1.05 ** (zone - 12);
  const balls = [];
  for (let i = 0; i < count; i++) {
    // zonas mais fundas puxam mais para o fim da pool (fantasma/perseguidora)
    const bias = Math.min(0.5, (zone - 12) * 0.03);
    const idx = Math.min(
      INFINITE_POOL.length - 1,
      Math.floor((rnd() + bias) * INFINITE_POOL.length),
    );
    balls.push(`${INFINITE_POOL[idx]}@${speed}`);
  }
  return { target: 0.8, balls };
}

function parseEntry(entry) {
  const [rawType, rawMul] = entry.split('@');
  const type = BALL_TYPES[rawType] ? rawType : 'normal'; // fallback até a fatia 7
  let speedMul = rawMul ? Number(rawMul) : 1;
  // teto de velocidade do engine (anti-tunneling)
  speedMul = Math.min(speedMul, MAX_AXIS_SPEED / BALL_TYPES[type].axisSpeed);
  return { type, speedMul };
}

function placeBall(rnd, placed) {
  const cx = LOGICAL_W / 2;
  const cy = ARENA_Y + (LOGICAL_H - ARENA_Y) / 2;
  let x = cx;
  let y = cy;
  for (let tries = 0; tries < 200; tries++) {
    x = SPAWN_MARGIN + rnd() * (LOGICAL_W - 2 * SPAWN_MARGIN);
    y = ARENA_Y + SPAWN_MARGIN + rnd() * (LOGICAL_H - ARENA_Y - 2 * SPAWN_MARGIN);
    if (Math.hypot(x - cx, y - cy) < SPAWN_MIN_PLAYER_DIST) continue;
    if (placed.some((p) => Math.hypot(x - p.x, y - p.y) < SPAWN_MIN_BALL_DIST)) continue;
    break;
  }
  return { x, y };
}

export function levelSpec(zone, seedBase) {
  const rnd = mulberry32((seedBase ^ Math.imul(zone, 0x9e3779b9)) >>> 0);
  const def = zone <= 12 ? CAMPAIGN[zone - 1] : infiniteDef(zone, rnd);

  const placed = [];
  const balls = def.balls.map((entry) => {
    const { type, speedMul } = parseEntry(entry);
    const pos = placeBall(rnd, placed);
    placed.push(pos);
    return {
      type,
      speedMul,
      x: pos.x,
      y: pos.y,
      dirX: rnd() < 0.5 ? -1 : 1,
      dirY: rnd() < 0.5 ? -1 : 1,
    };
  });

  return { zone, targetPct: def.target, countdown: COUNTDOWN_TIME, balls };
}
