// Parede em crescimento — a mecânica-assinatura do jogo.
// Duas pontas avançam a partir da célula do jogador. Regra "fiel ao clássico":
// a metade que ALCANÇA uma borda ancora e vira WALL permanente na grade na hora;
// as células ainda pendentes (não ancoradas) são frágeis — bola encostou,
// somem (e o jogo cobra 1 vida). Toco ancorado fica para sempre.
// Módulo PURO. Ordem do tick: avançar → quebrar → ancorar → completar
// (quebra vence empates no mesmo tick).

import { OPEN, WALL } from '../config.js';

export function spawnWall({ grid, axis, cx, cy }) {
  if (grid.get(cx, cy) !== OPEN) return null;
  return {
    axis, // 'h' cresce em ±x na linha cy; 'v' cresce em ±y na coluna cx
    originCx: cx,
    originCy: cy,
    originCommitted: false,
    neg: { dir: -1, dist: 0, cells: [], reachedEnd: false, anchored: false },
    pos: { dir: +1, dist: 0, cells: [], reachedEnd: false, anchored: false },
    done: false,
  };
}

function cellForOffset(wall, dir, k) {
  return wall.axis === 'h'
    ? { cx: wall.originCx + dir * k, cy: wall.originCy }
    : { cx: wall.originCx, cy: wall.originCy + dir * k };
}

// Células frágeis: origem (enquanto não committada) + metades não ancoradas.
export function pendingCells(wall) {
  if (wall.done) return [];
  const out = [];
  if (!wall.originCommitted) out.push({ cx: wall.originCx, cy: wall.originCy });
  if (!wall.neg.anchored) out.push(...wall.neg.cells);
  if (!wall.pos.anchored) out.push(...wall.pos.cells);
  return out;
}

function ballTouchesCell(ball, rect) {
  return (
    ball.x - ball.r < rect.x + rect.w &&
    ball.x + ball.r > rect.x &&
    ball.y - ball.r < rect.y + rect.h &&
    ball.y + ball.r > rect.y
  );
}

function commitHalf(wall, half, grid) {
  if (!wall.originCommitted) {
    grid.set(wall.originCx, wall.originCy, WALL);
    wall.originCommitted = true;
  }
  for (const c of half.cells) grid.set(c.cx, c.cy, WALL);
}

export function stepWall(wall, grid, balls, dt, tipSpeed) {
  const events = [];
  if (wall.done) return { events, shattered: false, completed: false };

  // 1) Avança as pontas e commita células pendentes (sem tocar a grade).
  for (const half of [wall.neg, wall.pos]) {
    if (half.anchored || half.reachedEnd) continue;
    half.dist += tipSpeed * dt;
    // entra na célula k quando a ponta cruza a borda próxima dela
    while (half.dist >= (half.cells.length + 0.5) * grid.cell) {
      const k = half.cells.length + 1;
      const next = cellForOffset(wall, half.dir, k);
      if (grid.get(next.cx, next.cy) !== OPEN) {
        half.reachedEnd = true;
        break;
      }
      half.cells.push(next);
    }
  }

  // 2) Quebra: bola encostou em qualquer célula frágil → pendentes somem.
  //    (Metades já ancoradas estão na grade e ficam — regra do clássico.)
  for (const ball of balls) {
    for (const c of pendingCells(wall)) {
      if (ballTouchesCell(ball, grid.cellRect(c.cx, c.cy))) {
        const cells = pendingCells(wall); // captura antes de encerrar (para o fx)
        wall.done = true;
        events.push({ type: 'shatter', cells });
        return { events, shattered: true, completed: false };
      }
    }
  }

  // 3) Ancoragem: metade que alcançou o fim solidifica (origem junto, na 1ª).
  for (const half of [wall.neg, wall.pos]) {
    if (!half.anchored && half.reachedEnd) {
      half.anchored = true;
      commitHalf(wall, half, grid);
      events.push({ type: 'anchor' });
    }
  }

  // 4) Completude: as duas ancoradas → o jogo roda flood fill e claima.
  if (wall.neg.anchored && wall.pos.anchored) {
    wall.done = true;
    events.push({
      type: 'complete',
      cells: [{ cx: wall.originCx, cy: wall.originCy }, ...wall.neg.cells, ...wall.pos.cells],
    });
    return { events, shattered: false, completed: true };
  }
  return { events, shattered: false, completed: false };
}
