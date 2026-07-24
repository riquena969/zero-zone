// Input unificado: produtores (teclado agora, touch na fatia 11) alimentam um
// snapshot por tick — {moveX, moveY, hJust, vJust, ...} — consumido pelo game.
// "Just" = edge-triggered: true por exatamente uma amostra, mesmo em taps
// mais curtos que um tick (o keydown fica retido até o próximo sample()).

const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

export function createKeyboardInput(target = window) {
  const held = new Set();
  const tapped = new Set();

  function onKeyDown(e) {
    if (PREVENT.has(e.code)) e.preventDefault(); // sem scroll da página
    if (e.repeat) return; // auto-repeat do SO não é novo aperto
    held.add(e.code);
    tapped.add(e.code);
  }

  function onKeyUp(e) {
    held.delete(e.code);
  }

  function onBlur() {
    held.clear(); // evita tecla "presa" ao trocar de janela
  }

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', onBlur);

  function axis(negA, negB, posA, posB) {
    return (held.has(posA) || held.has(posB) ? 1 : 0) - (held.has(negA) || held.has(negB) ? 1 : 0);
  }

  return {
    sample() {
      const s = {
        moveX: axis('ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD'),
        moveY: axis('ArrowUp', 'KeyW', 'ArrowDown', 'KeyS'),
        hJust: tapped.has('KeyH'),
        vJust: tapped.has('KeyV'),
        restartJust: tapped.has('KeyR'),
        pauseJust: tapped.has('Escape') || tapped.has('KeyP'),
        muteJust: tapped.has('KeyM'),
      };
      tapped.clear();
      return s;
    },
    dispose() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', onBlur);
    },
  };
}
