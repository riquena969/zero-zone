// Bolinhas: movimento diagonal puro (vx=±s, vy=±s) com reflexão elástica na
// grade. A velocidade por eixo NUNCA muda de módulo — só de sinal — então a
// trajetória é 100% previsível (base da estratégia do jogo). Módulo PURO.

import { OPEN, BALL_TYPES } from '../config.js';
import { moveAABB } from './collide.js';

const ballSolid = (s) => s !== OPEN; // WALL e CLAIMED bloqueiam bolas

export function makeBall({ type = 'normal', x, y, dirX = 1, dirY = 1, speedMul = 1 }) {
  const def = BALL_TYPES[type];
  const s = def.axisSpeed * speedMul;
  return {
    type,
    x,
    y,
    r: def.r,
    vx: Math.sign(dirX) * s,
    vy: Math.sign(dirY) * s,
  };
}

// Um tick: move com anti-tunneling e inverte o sinal do eixo que bateu.
// Retorna { hit } para SFX de quique.
export function stepBall(ball, grid, dt) {
  const res = moveAABB(grid, ball.x, ball.y, ball.r, ball.vx * dt, ball.vy * dt, ballSolid);
  ball.x = res.x;
  ball.y = res.y;
  if (res.hitX) ball.vx = -ball.vx;
  if (res.hitY) ball.vy = -ball.vy;
  return { hit: res.hitX || res.hitY };
}
