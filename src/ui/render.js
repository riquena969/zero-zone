// Renderer do mundo (fatia 1: flat, sem glow — o neon de verdade vem na fatia 13).
// Desenha a partir do estado puro do jogo; nunca muta nada.

import { WALL, CLAIMED, LOGICAL_W, LOGICAL_H, HUD_H, CELL } from '../config.js';
import { pendingCells } from '../game/walls.js';
import { STRINGS } from './strings.js';

export function createRenderer(vp) {
  const ctx = vp.ctx;

  function drawStateRects(grid, state, fillStyle) {
    ctx.fillStyle = fillStyle;
    for (const r of grid.rects(state)) {
      const px = grid.cellRect(r.cx, r.cy);
      ctx.fillRect(px.x, px.y, r.w * CELL, r.h * CELL);
    }
  }

  function drawArenaGrid(theme) {
    ctx.strokeStyle = theme.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= LOGICAL_W; x += CELL * 4) {
      ctx.moveTo(x, HUD_H);
      ctx.lineTo(x, LOGICAL_H);
    }
    for (let y = HUD_H; y <= LOGICAL_H; y += CELL * 4) {
      ctx.moveTo(0, y);
      ctx.lineTo(LOGICAL_W, y);
    }
    ctx.stroke();
  }

  function drawHud(game, theme) {
    ctx.strokeStyle = theme.claimedEdge;
    ctx.beginPath();
    ctx.moveTo(0, HUD_H - 0.5);
    ctx.lineTo(LOGICAL_W, HUD_H - 0.5);
    ctx.stroke();

    ctx.fillStyle = theme.hudText;
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(STRINGS.gameName, 16, HUD_H / 2);

    const pct = Math.floor(game.grid.coveredFraction() * 100);
    const alvo = Math.round(game.targetPct * 100);
    ctx.font = '18px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${STRINGS.hud.conquered}: ${pct}% / ${alvo}%`, LOGICAL_W - 16, HUD_H / 2);
  }

  function drawWinOverlay(theme) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, HUD_H, LOGICAL_W, LOGICAL_H - HUD_H);
    ctx.fillStyle = theme.player;
    ctx.textAlign = 'center';
    ctx.font = 'bold 56px "Courier New", monospace';
    ctx.fillText(STRINGS.win.title, LOGICAL_W / 2, LOGICAL_H / 2 - 20);
    ctx.fillStyle = theme.hudText;
    ctx.font = '22px "Courier New", monospace';
    ctx.fillText(STRINGS.win.restart, LOGICAL_W / 2, LOGICAL_H / 2 + 32);
  }

  function draw(game, theme) {
    vp.checkResize();
    vp.clearAll('#000');
    vp.applyTransform();

    // fundo + grade
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    drawArenaGrid(theme);

    // território e paredes
    drawStateRects(game.grid, CLAIMED, theme.claimed);
    drawStateRects(game.grid, WALL, theme.wall);

    // parede em crescimento (células frágeis)
    if (game.wall) {
      ctx.fillStyle = theme.wallGrow;
      for (const c of pendingCells(game.wall)) {
        const px = game.grid.cellRect(c.cx, c.cy);
        ctx.fillRect(px.x, px.y, px.w, px.h);
      }
    }

    // bolinhas
    for (const b of game.balls) {
      ctx.fillStyle = theme.balls[b.type];
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // orbe do jogador
    const p = game.player;
    ctx.fillStyle = theme.player;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.playerGlow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 3, 0, Math.PI * 2);
    ctx.stroke();

    drawHud(game, theme);
    if (game.status === 'won') drawWinOverlay(theme);
  }

  return { draw };
}
