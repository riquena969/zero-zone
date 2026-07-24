// Renderer do mundo (fatia 1: flat, sem glow — o neon de verdade vem na fatia 13).
// Desenha a partir do estado puro do jogo; nunca muta nada.

import {
  WALL,
  CLAIMED,
  LOGICAL_W,
  LOGICAL_H,
  HUD_H,
  CELL,
  VAULT_TIME,
  POWERUP_LIFETIME,
} from '../config.js';
import { pendingCells } from '../game/walls.js';
import { ghostAlpha } from '../game/balls.js';
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

    // efeitos ativos (relógio restante, turbo armado)
    if (game.effects) {
      ctx.fillStyle = theme.powerup;
      let fx = '';
      if (game.effects.clock > 0) fx += `◷${game.effects.clock.toFixed(1)} `;
      if (game.effects.turbo) fx += '»» ';
      if (fx) ctx.fillText(fx.trim(), 840, HUD_H / 2);
      ctx.fillStyle = theme.hudText;
    }

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

    // bolinhas (cada tipo tem forma/comportamento próprio, não só cor)
    // ui.ballScale < 1 = implosão da celebração de fim de zona
    const ballScale = ui.ballScale ?? 1;
    for (const b of game.balls) {
      if (ballScale <= 0) break;
      const br = b.r * ballScale;
      const cor = theme.balls[b.type];

      if (b.type === 'fantasma') {
        // corpo esmaece em ciclos; contorno tênue NUNCA some (justiça)
        ctx.globalAlpha = ghostAlpha(b);
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.arc(b.x, b.y, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = cor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, br, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }

      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.arc(b.x, b.y, br, 0, Math.PI * 2);
      ctx.fill();

      if (b.homing) {
        // "olho" no nariz — mostra para onde ela está virando (e mete medo)
        const ex = b.x + Math.cos(b.heading) * br * 0.55;
        const ey = b.y + Math.sin(b.heading) * br * 0.55;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex, ey, br * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(ex + Math.cos(b.heading) * 1.5, ey + Math.sin(b.heading) * 1.5, br * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // power-up no chão (pulsa; pisca rápido quando está para sumir)
    const item = game.powerups && game.powerups.item;
    if (item) {
      const restante = POWERUP_LIFETIME - item.age;
      const piscaExpirando = restante < 2 && Math.floor(item.age * 6) % 2 === 0;
      if (!piscaExpirando) {
        const pulso = 1 + 0.12 * Math.sin(item.age * 5);
        ctx.strokeStyle = theme.powerup;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.r * pulso, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = theme.powerup;
        if (item.type === 'relogio') {
          // ponteiros de relógio
          ctx.beginPath();
          ctx.moveTo(item.x, item.y);
          ctx.lineTo(item.x, item.y - item.r * 0.55);
          ctx.moveTo(item.x, item.y);
          ctx.lineTo(item.x + item.r * 0.4, item.y + item.r * 0.15);
          ctx.stroke();
        } else if (item.type === 'escudo') {
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.r * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // turbo: chevron duplo
          ctx.font = `bold ${item.r * 1.2}px "Courier New", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('»', item.x, item.y + 1);
        }
      }
    }

    // orbe do jogador (pisca a 4Hz durante i-frames; oculto no attract mode)
    const p = game.player;
    const piscando = ui.hidePlayer || (p.iframes > 0 && Math.floor(p.iframes * 8) % 2 === 0);
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

    // anel do escudo ativo
    if (game.effects && game.effects.shield && !piscando) {
      ctx.strokeStyle = theme.powerup;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2);
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

    if (!ui.hideHud) drawHud(game, theme, ui);
    // fim de zona / fim de jogo agora são telas DOM (screens.js)
  }

  return { draw };
}
