// A grade é a fonte da verdade geométrica do jogo (modelo do JezzBall original):
// células OPEN | WALL | CLAIMED, conquista por conectividade (flood fill),
// % de área por contagem inteira de células — exato, sem drift de float.
// Módulo PURO: nada de DOM aqui.

import { OPEN, WALL, CLAIMED } from '../config.js';

export function createGrid({ cols, rows, cell, originX, originY }) {
  const cells = new Uint8Array(cols * rows); // nasce tudo OPEN (0)
  const counts = { open: cols * rows, wall: 0, claimed: 0 };
  const KEY = ['open', 'wall', 'claimed'];

  function idx(cx, cy) {
    return cy * cols + cx;
  }

  function inBounds(cx, cy) {
    return cx >= 0 && cy >= 0 && cx < cols && cy < rows;
  }

  // Fora da grade é sólido: as bordas da arena são "parede" de graça.
  function get(cx, cy) {
    return inBounds(cx, cy) ? cells[idx(cx, cy)] : WALL;
  }

  function set(cx, cy, state) {
    if (!inBounds(cx, cy)) return;
    const i = idx(cx, cy);
    const prev = cells[i];
    if (prev === state) return;
    counts[KEY[prev]]--;
    counts[KEY[state]]++;
    cells[i] = state;
  }

  function cellAt(px, py) {
    return {
      cx: Math.floor((px - originX) / cell),
      cy: Math.floor((py - originY) / cell),
    };
  }

  function cellRect(cx, cy) {
    return { x: originX + cx * cell, y: originY + cy * cell, w: cell, h: cell };
  }

  // "Conquistado" para o jogador = tudo que não é mais espaço livre.
  function coveredFraction() {
    return (counts.wall + counts.claimed) / (cols * rows);
  }

  // Componentes conectados (4-vizinhança) das células OPEN.
  // comp[i] = id do componente, ou -1 para células não-OPEN.
  function analyze() {
    const comp = new Int32Array(cols * rows).fill(-1);
    const sizes = [];
    const stack = [];
    let count = 0;

    for (let start = 0; start < cells.length; start++) {
      if (cells[start] !== OPEN || comp[start] !== -1) continue;
      const id = count++;
      let size = 0;
      stack.length = 0;
      stack.push(start);
      comp[start] = id;

      while (stack.length) {
        const i = stack.pop();
        size++;
        const cx = i % cols;
        const cy = (i / cols) | 0;
        // 4 vizinhos
        if (cx > 0 && cells[i - 1] === OPEN && comp[i - 1] === -1) {
          comp[i - 1] = id;
          stack.push(i - 1);
        }
        if (cx < cols - 1 && cells[i + 1] === OPEN && comp[i + 1] === -1) {
          comp[i + 1] = id;
          stack.push(i + 1);
        }
        if (cy > 0 && cells[i - cols] === OPEN && comp[i - cols] === -1) {
          comp[i - cols] = id;
          stack.push(i - cols);
        }
        if (cy < rows - 1 && cells[i + cols] === OPEN && comp[i + cols] === -1) {
          comp[i + cols] = id;
          stack.push(i + cols);
        }
      }
      sizes.push(size);
    }
    return { comp, count, sizes };
  }

  // Claima toda célula OPEN cujo componente NÃO está no keepSet
  // (keepSet = componentes que contêm bolinhas). Retorna quantas claimou.
  function claimWhere(comp, keepSet) {
    let claimed = 0;
    for (let i = 0; i < cells.length; i++) {
      const c = comp[i];
      if (c >= 0 && !keepSet.has(c)) {
        set(i % cols, (i / cols) | 0, CLAIMED);
        claimed++;
      }
    }
    return claimed;
  }

  // Greedy meshing: funde células contíguas do mesmo estado em retângulos
  // (em coordenadas de célula) — o render desenha barras limpas, não quadradinhos.
  function rects(state) {
    const used = new Uint8Array(cols * rows);
    const out = [];
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const i = idx(cx, cy);
        if (used[i] || cells[i] !== state) continue;

        let w = 1;
        while (cx + w < cols && !used[idx(cx + w, cy)] && cells[idx(cx + w, cy)] === state) w++;

        let h = 1;
        expand: while (cy + h < rows) {
          for (let dx = 0; dx < w; dx++) {
            const j = idx(cx + dx, cy + h);
            if (used[j] || cells[j] !== state) break expand;
          }
          h++;
        }

        for (let dy = 0; dy < h; dy++) {
          for (let dx = 0; dx < w; dx++) used[idx(cx + dx, cy + dy)] = 1;
        }
        out.push({ cx, cy, w, h });
      }
    }
    return out;
  }

  return {
    cols,
    rows,
    cell,
    originX,
    originY,
    idx,
    get,
    set,
    cellAt,
    cellRect,
    counts: () => ({ ...counts }),
    coveredFraction,
    analyze,
    claimWhere,
    rects,
  };
}
