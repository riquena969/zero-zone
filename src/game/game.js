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
  IFRAMES_TIME,
  LIVES_START,
  TIME_BONUS_START,
  CLOCK_DURATION,
  CLOCK_FACTOR,
  TURBO_FACTOR,
  SHIELD_IFRAMES,
} from '../config.js';
import { createGrid } from './grid.js';
import { circlesOverlap } from './collide.js';
import { makeBall, stepBall, steerHoming } from './balls.js';
import { spawnWall, stepWall } from './walls.js';
import { makePlayer, movePlayer, depenetrate, fits, safestPoint, updateVault } from './player.js';
import { createPowerups, unlockedTypes } from './powerups.js';
import { mulberry32 } from './rng.js';

export function createGame({ level, lives }) {
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
    status: 'playing', // 'playing' | 'won' | 'gameover'
    targetPct: level.targetPct,
    zone: level.zone ?? 1,
    countdown: level.countdown ?? 0, // 3-2-1 congelado no início da zona
    timeLeft: TIME_BONUS_START, // regressivo, só para bônus — a zona nunca falha por tempo
    lives: lives ?? LIVES_START,
    effects: { clock: 0, shield: false, turbo: false },
    powerups: null,
    wallSpeed: WALL_TIP_SPEED, // velocidade da parede EM PROGRESSO (turbo mexe aqui)
    applyPowerup,
    update,
  };

  if (unlockedTypes(game.zone).length) {
    game.powerups = createPowerups({ zone: game.zone, rng: mulberry32(level.seed ?? 1) });
  }

  function applyPowerup(type) {
    if (type === 'relogio') game.effects.clock = CLOCK_DURATION;
    else if (type === 'escudo') game.effects.shield = true; // não acumula: é booleano
    else if (type === 'turbo') game.effects.turbo = true;
  }

  function loseLife(cause, events) {
    game.lives--;
    player.iframes = IFRAMES_TIME;
    events.push({ type: 'lifeLost', cause, lives: game.lives });
    if (game.lives <= 0) {
      game.status = 'gameover';
      events.push({ type: 'gameover' });
    }
  }

  function tryTrigger(input, events) {
    if (!input.hJust && !input.vJust) return;
    const axis = input.hJust ? 'h' : 'v'; // H vence V no mesmo tick
    if (game.wall) {
      events.push({ type: 'denied', reason: 'busy' });
      return;
    }
    if (player.vault) {
      events.push({ type: 'denied', reason: 'vaulting' });
      return;
    }
    const c = grid.cellAt(player.x, player.y);
    const w = spawnWall({ grid, axis, cx: c.cx, cy: c.cy });
    if (!w) {
      events.push({ type: 'denied', reason: 'ground' }); // pisando em CLAIMED
      return;
    }
    game.wall = w;
    game.wallSpeed = WALL_TIP_SPEED * (game.effects.turbo ? TURBO_FACTOR : 1);
    const turbo = game.effects.turbo;
    game.effects.turbo = false; // consumido no disparo
    events.push({ type: 'wallStart', axis, turbo });
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
      // chega no ponto mais seguro do novo componente, invencível por 2s
      const pt = safestPoint(grid, balls, best.x, best.y, player.r);
      player.x = (pt ?? best).x;
      player.y = (pt ?? best).y;
      player.iframes = IFRAMES_TIME;
      events.push({ type: 'relocate' });
    }
  }

  function update(input, dt) {
    const events = [];
    if (game.status !== 'playing') return events;

    // countdown 3-2-1: mundo congelado, jogador pode se reposicionar
    if (game.countdown > 0) {
      const prevCeil = Math.ceil(game.countdown);
      game.countdown -= dt;
      movePlayer(player, grid, input.moveX ?? 0, input.moveY ?? 0, PLAYER_SPEED, dt);
      if (input.hJust || input.vJust) events.push({ type: 'denied', reason: 'countdown' });
      if (game.countdown <= 0) {
        game.countdown = 0;
        events.push({ type: 'go' });
      } else if (Math.ceil(game.countdown) !== prevCeil) {
        events.push({ type: 'countdown', n: Math.ceil(game.countdown) });
      }
      return events;
    }

    // timers
    if (player.iframes > 0) player.iframes = Math.max(0, player.iframes - dt);
    if (game.timeLeft > 0) game.timeLeft = Math.max(0, game.timeLeft - dt);
    if (game.effects.clock > 0) game.effects.clock = Math.max(0, game.effects.clock - dt);

    // jogador: vault primeiro; se saltou, o movimento deste tick já foi o salto
    const vr = updateVault(player, grid, input.moveX ?? 0, input.moveY ?? 0, dt);
    if (vr && vr.hopped) {
      events.push({ type: 'vault' });
    } else {
      movePlayer(player, grid, input.moveX ?? 0, input.moveY ?? 0, PLAYER_SPEED, dt);
    }

    // power-ups: spawn/expiração + coleta
    if (game.powerups) {
      events.push(...game.powerups.update(dt, { grid, player, balls }));
      const got = game.powerups.tryCollect(player);
      if (got) {
        applyPowerup(got);
        events.push({ type: 'powerup', ptype: got });
      }
    }

    // trigger de parede
    tryTrigger(input, events);

    // passo da parede em crescimento
    if (game.wall) {
      const r = stepWall(game.wall, grid, balls, dt, game.wallSpeed);
      events.push(...r.events);
      if (r.shattered) {
        game.wall = null;
        loseLife('shatter', events); // regra clássica: quebra custa vida (sem respawn)
      } else if (r.completed) {
        game.wall = null;
        resolveCompletion(events);
      }
    }

    // bolinhas (relógio desacelera o TEMPO delas; perseguidora vira o nariz antes)
    const ballDt = game.effects.clock > 0 ? dt * CLOCK_FACTOR : dt;
    for (const b of balls) {
      if (b.homing) steerHoming(b, player.x, player.y, ballDt);
      stepBall(b, grid, ballDt);
    }

    // toque de bolinha (ignorado durante i-frames; escudo absorve 1)
    if (game.status === 'playing' && player.iframes <= 0) {
      for (const b of balls) {
        if (circlesOverlap(player.x, player.y, player.r, b.x, b.y, b.r)) {
          if (game.effects.shield) {
            game.effects.shield = false;
            player.iframes = SHIELD_IFRAMES;
            events.push({ type: 'shieldBreak' });
          } else {
            loseLife('ball', events);
            if (game.status === 'playing') {
              const pt = safestPoint(grid, balls, player.x, player.y, player.r);
              if (pt) {
                player.x = pt.x;
                player.y = pt.y;
              }
            }
          }
          break;
        }
      }
    }

    // vitória (depois de todos os claims do tick)
    if (game.status === 'playing' && grid.coveredFraction() >= game.targetPct) {
      game.status = 'won';
      events.push({ type: 'win', covered: grid.coveredFraction() });
    }

    return events;
  }

  return game;
}
