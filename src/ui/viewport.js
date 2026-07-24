// Viewport: encaixa a resolução lógica 1280×720 na janela com letterbox,
// ciente de devicePixelRatio. É a ÚNICA fonte de mapeamento entre coordenadas
// de tela e lógicas — render e toque usam o mesmo transform, nunca divergem.

export function createViewport(canvas, { logicalW, logicalH }) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offX = 0;
  let offY = 0;
  let dpr = 1;
  let cssW = 0;
  let cssH = 0;

  function fit() {
    cssW = canvas.clientWidth;
    cssH = canvas.clientHeight;
    dpr = window.devicePixelRatio || 1;

    const bw = Math.round(cssW * dpr);
    const bh = Math.round(cssH * dpr);
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;

    scale = Math.min(cssW / logicalW, cssH / logicalH);
    offX = (cssW - logicalW * scale) / 2;
    offY = (cssH - logicalH * scale) / 2;
  }

  // Chamado por frame: pega resize, zoom do navegador e troca de monitor (DPR).
  function checkResize() {
    if (
      canvas.clientWidth !== cssW ||
      canvas.clientHeight !== cssH ||
      (window.devicePixelRatio || 1) !== dpr
    ) {
      fit();
    }
  }

  // Aplica o transform lógico→backing store (chamar antes de desenhar o mundo).
  function applyTransform() {
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY);
  }

  // Limpa o canvas inteiro (barras do letterbox em preto).
  function clearAll(color = '#000') {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Coordenada de evento (clientX/Y) → coordenada lógica do jogo.
  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offX) / scale,
      y: (clientY - rect.top - offY) / scale,
    };
  }

  window.addEventListener('resize', fit);
  fit();

  return {
    ctx,
    fit,
    checkResize,
    applyTransform,
    clearAll,
    toLogical,
    get scale() {
      return scale;
    },
  };
}
