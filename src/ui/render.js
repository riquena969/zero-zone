// Renderer do mundo (fatia 1: flat, sem glow — o neon de verdade vem na fatia 13).
// Desenha a partir do estado puro do jogo; nunca muta nada.

import { WALL, CLAIMED, LOGICAL_W, LOGICAL_H, HUD_H, CELL, VAULT_TIME } from '../config.js';
import { pendingCells } from '../game/walls.js';
import { STRINGS } from './strings.js';

// Botão de pausa na HUD (hit test compartilhado com o main via este export)
export const PAUSE_RECT = { x: LOGICAL_W - 46, y: 10, w: 36, h: 36 };

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

  function drawHud(game, theme, ui) {
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

    // vidas como orbes ao lado do nome
    ctx.fillStyle = theme.danger;
    for (let i = 0; i < game.lives; i++) {
      ctx.beginPath();
      ctx.arc(200 + i * 24, HUD_H / 2, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = theme.hudText;
    ctx.font = '18px "Courier New", monospace';

    // zona e placar
    ctx.textAlign = 'left';
    ctx.fillText(`${STRINGS.hud.zone} ${ui.zone}`, 330, HUD_H / 2);
    ctx.fillText(`${STRINGS.hud.score} ${ui.score}`, 470, HUD_H / 2);
    ctx.fillText(`${STRINGS.hud.hi} ${ui.hi}`, 700, HUD_H / 2);

    // progresso
    const pct = Math.floor(game.grid.coveredFraction() * 100);
    const alvo = Math.round(game.targetPct * 100);
    ctx.textAlign = 'right';
    ctx.fillText(`${STRINGS.hud.conquered}: ${pct}% / ${alvo}%`, PAUSE_RECT.x - 16, HUD_H / 2);

    // botão de pausa (duas barras)
    ctx.fillStyle = theme.hudText;
    ctx.fillRect(PAUSE_RECT.x + 8, PAUSE_RECT.y + 8, 7, 20);
    ctx.fillRect(PAUSE_RECT.x + 21, PAUSE_RECT.y + 8, 7, 20);
  }

  // Countdown 3-2-1: número gigante + setinhas mostrando para onde cada bola vai
  function drawCountdown(game, theme) {
    for (const b of game.balls) {
      const len = Math.hypot(b.vx, b.vy) || 1;
      const ux = b.vx / len;
      const uy = b.vy / len;
      const x1 = b.x + ux * (b.r + 22);
      const y1 = b.y + uy * (b.r + 22);
      ctx.strokeStyle = theme.balls[b.type];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x + ux * (b.r + 6), b.y + uy * (b.r + 6));
      ctx.lineTo(x1, y1);
      // ponta da seta
      const ang = Math.atan2(uy, ux);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - 8 * Math.cos(ang - 0.5), y1 - 8 * Math.sin(ang - 0.5));
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - 8 * Math.cos(ang + 0.5), y1 - 8 * Math.sin(ang + 0.5));
      ctx.stroke();
    }

    ctx.fillStyle = theme.player;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 120px "Courier New", monospace';
    ctx.fillText(String(Math.ceil(game.countdown)), LOGICAL_W / 2, (HUD_H + LOGICAL_H) / 2);
  }

  function drawOverlay(theme, titleColor, title, hint) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, HUD_H, LOGICAL_W, LOGICAL_H - HUD_H);
    ctx.fillStyle = titleColor;
    ctx.textAlign = 'center';
    ctx.font = 'bold 56px "Courier New", monospace';
    ctx.fillText(title, LOGICAL_W / 2, LOGICAL_H / 2 - 20);
    ctx.fillStyle = theme.hudText;
    ctx.font = '22px "Courier New", monospace';
    ctx.fillText(hint, LOGICAL_W / 2, LOGICAL_H / 2 + 32);
  }

  function draw(game, theme, ui = { zone: 1, score: 0, hi: 0 }) {
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

    // orbe do jogador (pisca a 4Hz durante i-frames)
    const p = game.player;
    const piscando = p.iframes > 0 && Math.floor(p.iframes * 8) % 2 === 0;
    if (!piscando) {
      ctx.fillStyle = theme.player;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = theme.playerGlow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // arco de progresso do vault (escalando a parede)
    if (p.vault && p.vault.progress > 0) {
      const frac = Math.min(1, p.vault.progress / VAULT_TIME);
      ctx.strokeStyle = theme.playerGlow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 7, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
    }

    if (game.countdown > 0) drawCountdown(game, theme);

    drawHud(game, theme, ui);
    if (game.status === 'won') {
      drawOverlay(theme, theme.player, STRINGS.win.title, STRINGS.win.restart);
    } else if (game.status === 'gameover') {
      drawOverlay(theme, theme.danger, STRINGS.gameover.title, STRINGS.gameover.restart);
    }
  }

  return { draw };
}
