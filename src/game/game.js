// Orquestrador de uma sessão de nível: a ordem canônica do tick mora AQUI e
// resolve todos os edge cases de mesmo-frame. Puro: recebe input, devolve
// lista de eventos — main.js roteia eventos para áudio/fx/telas.
//
// Ordem do tick: timers → jogador → trigger → parede (quebra→ancora→completa:
// flood fill, claims, realocação) → bolinhas → [fatia 2: jogador×bola] → vitória.

import {
  GRID_W,
  GRID_H,
  CELL,
  ARENA_Y,
  LOGICAL_W,
  LOGICAL_H,
  OPEN,
  PLAYER_SPEED,
  WALL_TIP_SPEED,
} from '../config.js';
import { createGrid } from './grid.js';
import { makeBall, stepBall } from './balls.js';
import { spawnWall, stepWall } from './walls.js';
import { makePlayer, movePlayer, depenetrate, fits } from './player.js';

export function createGame({ level }) {
  const grid = createGrid({ cols: GRID_W, rows: GRID_H, cell: CELL, originX: 0, originY: ARENA_Y });
  const player = makePlayer({
    x: level.playerX ?? LOGICAL_W / 2,
    y: level.playerY ?? ARENA_Y + (LOGICAL_H - ARENA_Y) / 2,
  });
  const balls = level.balls.map((spec) => makeBall(spec));

  const game = {
    grid,
    player,
    balls,
    wall: null, // parede em crescimento (máx. 1)
    status: 'playing', // 'playing' | 'won'
    targetPct: level.targetPct,
    update,
  };

  function tryTrigger(input, events) {
    if (!input.hJust && !input.vJust) return;
    const axis = input.hJust ? 'h' : 'v'; // H vence V no mesmo tick
    if (game.wall) {
      events.push({ type: 'denied', reason: 'busy' });
      return;
    }
    const c = grid.cellAt(player.x, player.y);
    const w = spawnWall({ grid, axis, cx: c.cx, cy: c.cy });
    if (!w) {
      events.push({ type: 'denied', reason: 'ground' }); // pisando em CLAIMED
      return;
    }
    game.wall = w;
    events.push({ type: 'wallStart', axis });
  }

  // Parede completou: flood fill, claima componentes sem bola, arruma o jogador.
  function resolveCompletion(events) {
    const { comp } = grid.analyze();
    const keep = new Set();
    for (const b of balls) {
      const c = grid.cellAt(b.x, b.y);
      const id = comp[grid.idx(c.cx, c.cy)];
      if (id >= 0) keep.add(id);
    }
    const claimed = grid.claimWhere(comp, keep);
    if (claimed > 0) {
      events.push({ type: 'fill', cells: claimed, covered: grid.coveredFraction() });
    }
    // jogador pode ter ficado sobre a linha nova (empurra) ou em área claimada (realoca)
    depenetrate(player, grid);
    relocateIfStranded(events);
  }

  // Se o chão sob o jogador deixou de ser OPEN (o lado dele foi claimado),
  // realoca para a célula aberta mais próxima em que o orbe caiba.
  function relocateIfStranded(events) {
    const c = grid.cellAt(player.x, player.y);
    if (grid.get(c.cx, c.cy) === OPEN) return;

    let best = null;
    for (let cy = 0; cy < grid.rows; cy++) {
      for (let cx = 0; cx < grid.cols; cx++) {
        if (grid.get(cx, cy) !== OPEN) continue;
        const r = grid.cellRect(cx, cy);
        const x = r.x + r.w / 2;
        const y = r.y + r.h / 2;
        const d = (x - player.x) ** 2 + (y - player.y) ** 2;
        if (best && d >= best.d) continue;
        if (!fits(grid, x, y, player.r)) continue;
        best = { x, y, d };
      }
    }
    if (best) {
      player.x = best.x;
      player.y = best.y;
      events.push({ type: 'relocate' });
    }
  }

  function update(input, dt) {
    const events = [];
    if (game.status !== 'playing') return events;

    // jogador
    movePlayer(player, grid, input.moveX ?? 0, input.moveY ?? 0, PLAYER_SPEED, dt);

    // trigger de parede
    tryTrigger(input, events);

    // passo da parede em crescimento
    if (game.wall) {
      const r = stepWall(game.wall, grid, balls, dt, WALL_TIP_SPEED);
      events.push(...r.events);
      if (r.shattered) {
        game.wall = null;
      } else if (r.completed) {
        game.wall = null;
        resolveCompletion(events);
      }
    }

    // bolinhas
    for (const b of balls) stepBall(b, grid, dt);

    // vitória (depois de todos os claims do tick)
    if (grid.coveredFraction() >= game.targetPct) {
      game.status = 'won';
      events.push({ type: 'win', covered: grid.coveredFraction() });
    }

    return events;
  }

  return game;
}
