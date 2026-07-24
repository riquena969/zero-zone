// Bolinhas: movimento diagonal puro (vx=±s, vy=±s) com reflexão elástica na
// grade. A velocidade por eixo NUNCA muda de módulo — só de sinal — então a
// trajetória é 100% previsível (base da estratégia do jogo).
// Exceção deliberada: a PERSEGUIDORA navega por ângulo (homing suave com curva
// limitada) — a única não-diagonal do jogo. Módulo PURO.

import { OPEN, BALL_TYPES, GHOST_CYCLE, GHOST_MIN_ALPHA } from '../config.js';
import { moveAABB } from './collide.js';

const ballSolid = (s) => s !== OPEN; // WALL e CLAIMED bloqueiam bolas

export function makeBall({ type = 'normal', x, y, dirX = 1, dirY = 1, speedMul = 1 }) {
  const def = BALL_TYPES[type];
  const s = def.axisSpeed * speedMul;
  const ball = {
    type,
    x,
    y,
    r: def.r,
    vx: Math.sign(dirX) * s,
    vy: Math.sign(dirY) * s,
  };
  if (type === 'fantasma') ball.ghostPhase = 0;
  if (def.homing) {
    ball.homing = true;
    ball.turnRate = def.turnRate;
    ball.speed = s; // velocidade LINEAR constante (não por eixo)
    ball.heading = Math.atan2(dirY, dirX);
    ball.vx = Math.cos(ball.heading) * s;
    ball.vy = Math.sin(ball.heading) * s;
  }
  return ball;
}

// Opacidade do fantasma: cicla 1 → piso → 1 (cosseno). Colisão não muda nunca.
export function ghostAlpha(ball) {
  const t = (ball.ghostPhase ?? 0) / GHOST_CYCLE;
  const wave = 0.5 + 0.5 * Math.cos(t * Math.PI * 2); // 1 no início, 0 no meio
  return GHOST_MIN_ALPHA + (1 - GHOST_MIN_ALPHA) * wave;
}

// Vira o nariz da perseguidora em direção ao alvo, com giro máximo por tick.
// |v| permanece exatamente ball.speed.
export function steerHoming(ball, targetX, targetY, dt) {
  const desired = Math.atan2(targetY - ball.y, targetX - ball.x);
  let diff = desired - ball.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const maxTurn = ball.turnRate * dt;
  ball.heading += Math.max(-maxTurn, Math.min(maxTurn, diff));
  ball.vx = Math.cos(ball.heading) * ball.speed;
  ball.vy = Math.sin(ball.heading) * ball.speed;
}

// Um tick: move com anti-tunneling e inverte o sinal do eixo que bateu.
// Retorna { hit } para SFX de quique.
export function stepBall(ball, grid, dt) {
  const res = moveAABB(grid, ball.x, ball.y, ball.r, ball.vx * dt, ball.vy * dt, ballSolid);
  ball.x = res.x;
  ball.y = res.y;
  if (res.hitX) ball.vx = -ball.vx;
  if (res.hitY) ball.vy = -ball.vy;
  if (ball.homing && (res.hitX || res.hitY)) {
    ball.heading = Math.atan2(ball.vy, ball.vx); // re-sincroniza após quicar
  }
  if (ball.type === 'fantasma') {
    ball.ghostPhase = ((ball.ghostPhase ?? 0) + dt) % GHOST_CYCLE;
  }
  return { hit: res.hitX || res.hitY };
}
