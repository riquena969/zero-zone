// Loop de jogo: timestep FIXO de simulação + render por requestAnimationFrame.
// Determinismo: a mesma sequência de inputs produz a mesma simulação em qualquer
// monitor (60/120/144Hz) — essencial para os testes headless de game.js.

export function createLoop({ update, render, dtMs = 1000 / 60, maxTicksPerFrame = 5 }) {
  let rafId = 0;
  let running = false;
  let last = 0;
  let acc = 0;

  function frame(now) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);

    acc += now - last;
    last = now;

    // Clamp anti-espiral: aba oculta / travada gera dt gigante — descartamos o
    // excesso (a auto-pausa em blur cobre o caso comum antes disso).
    const maxAcc = dtMs * maxTicksPerFrame;
    if (acc > maxAcc) acc = maxAcc;

    while (acc >= dtMs) {
      update(dtMs / 1000);
      acc -= dtMs;
    }
    render();
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      acc = 0;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
    get running() {
      return running;
    },
  };
}
