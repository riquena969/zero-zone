// Colisão contra a grade (tilemap). Entidades são tratadas como AABB
// (quadrado de meia-largura `half`) — tudo no jogo é axis-aligned, então o
// comportamento é idêntico ao de círculo nas faces e muito mais simples.
// Módulo PURO.

const EPS = 0.001;

// Varre um eixo em substeps ≤ meia célula: nunca tunela, em qualquer velocidade.
function sweepAxis(grid, x, y, half, d, axis, isSolid) {
  if (d === 0) return { pos: axis === 'x' ? x : y, hit: false };

  const step = grid.cell / 2;
  const dir = Math.sign(d);
  let remaining = Math.abs(d);
  let pos = axis === 'x' ? x : y;

  while (remaining > 1e-9) {
    const dd = Math.min(remaining, step);
    remaining -= dd;
    pos += dir * dd;

    const cx0 = axis === 'x' ? pos - half : x - half;
    const cx1 = axis === 'x' ? pos + half - EPS : x + half - EPS;
    const cy0 = axis === 'y' ? pos - half : y - half;
    const cy1 = axis === 'y' ? pos + half - EPS : y + half - EPS;
    const a = grid.cellAt(cx0, cy0);
    const b = grid.cellAt(cx1, cy1);

    // Procura a face sólida MAIS restritiva no sentido do movimento.
    let clamp = null;
    for (let cy = a.cy; cy <= b.cy; cy++) {
      for (let cx = a.cx; cx <= b.cx; cx++) {
        if (!isSolid(grid.get(cx, cy))) continue;
        const r = grid.cellRect(cx, cy);
        if (axis === 'x') {
          const edge = dir > 0 ? r.x - half : r.x + r.w + half;
          clamp = clamp === null ? edge : dir > 0 ? Math.min(clamp, edge) : Math.max(clamp, edge);
        } else {
          const edge = dir > 0 ? r.y - half : r.y + r.h + half;
          clamp = clamp === null ? edge : dir > 0 ? Math.min(clamp, edge) : Math.max(clamp, edge);
        }
      }
    }
    if (clamp !== null) return { pos: clamp, hit: true };
  }
  return { pos, hit: false };
}

// Move um AABB pela grade, eixo a eixo (permite deslizar em paredes).
export function moveAABB(grid, x, y, half, dx, dy, isSolid) {
  const rx = sweepAxis(grid, x, y, half, dx, 'x', isSolid);
  const nx = rx.pos;
  const ry = sweepAxis(grid, nx, y, half, dy, 'y', isSolid);
  return { x: nx, y: ry.pos, hitX: rx.hit, hitY: ry.hit };
}

// Círculo × círculo (jogador × bola, jogador × power-up). Tangente não colide.
export function circlesOverlap(x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const rr = r1 + r2;
  return dx * dx + dy * dy < rr * rr;
}
