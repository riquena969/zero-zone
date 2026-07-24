// Controles de toque: joystick FLUTUANTE na metade esquerda (nasce onde o dedo
// pousa) + botões H/V na direita. Multitouch por identifier — mover e disparar
// ao mesmo tempo é requisito. touchcancel (ligação, notificação) solta só o
// papel daquele dedo. Coordenadas sempre via vp.toLogical (fonte única).

import { LOGICAL_W, TOUCH } from '../config.js';

export function createTouchInput(canvas, vp) {
  const roles = new Map(); // touch.identifier → 'stick' | 'h' | 'v'
  const tapped = new Set(); // edge-trigger até o próximo sample()
  let stick = null; // { ox, oy, dx, dy } em coordenadas lógicas
  let active = false; // vira true no primeiro toque (mostra os controles)

  const inBtn = (x, y, btn) => Math.hypot(x - btn.x, y - btn.y) <= TOUCH.btnHit;

  function hasStick() {
    for (const role of roles.values()) if (role === 'stick') return true;
    return false;
  }

  function onStart(e) {
    e.preventDefault();
    active = true;
    for (const t of e.changedTouches) {
      const { x, y } = vp.toLogical(t.clientX, t.clientY);
      if (inBtn(x, y, TOUCH.btnV)) {
        roles.set(t.identifier, 'v');
        tapped.add('v');
      } else if (inBtn(x, y, TOUCH.btnH)) {
        roles.set(t.identifier, 'h');
        tapped.add('h');
      } else if (x < LOGICAL_W / 2 && !hasStick()) {
        roles.set(t.identifier, 'stick');
        stick = { ox: x, oy: y, dx: 0, dy: 0 };
      }
    }
  }

  function onMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (roles.get(t.identifier) !== 'stick' || !stick) continue;
      const { x, y } = vp.toLogical(t.clientX, t.clientY);
      let dx = (x - stick.ox) / TOUCH.stickRadius;
      let dy = (y - stick.oy) / TOUCH.stickRadius;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        dx /= len;
        dy /= len;
      }
      if (Math.hypot(dx, dy) < TOUCH.deadZone) {
        dx = 0;
        dy = 0;
      }
      stick.dx = dx;
      stick.dy = dy;
    }
  }

  function onEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const role = roles.get(t.identifier);
      roles.delete(t.identifier);
      if (role === 'stick') stick = null;
    }
  }

  canvas.addEventListener('touchstart', onStart, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onEnd, { passive: false });
  canvas.addEventListener('touchcancel', onEnd, { passive: false });

  return {
    sample() {
      const s = {
        moveX: stick ? stick.dx : 0,
        moveY: stick ? stick.dy : 0,
        hJust: tapped.has('h'),
        vJust: tapped.has('v'),
      };
      tapped.clear();
      return s;
    },

    // Estado para o render desenhar joystick/botões (só em aparelho de toque).
    visual() {
      let hHeld = false;
      let vHeld = false;
      for (const role of roles.values()) {
        if (role === 'h') hHeld = true;
        if (role === 'v') vHeld = true;
      }
      return { show: active, stick, hHeld, vHeld };
    },
  };
}
