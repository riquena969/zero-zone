// Todos os textos do jogo em PT-BR num lugar só (inclui o nome do jogo).
// Trocar o nome ou traduzir = mexer só aqui.

export const STRINGS = {
  gameName: 'ZONA ZERO',
  hud: {
    conquered: 'CONQUISTADO',
    zone: 'ZONA',
    score: 'SCORE',
    hi: 'HI',
  },
  pause: {
    title: 'PAUSA',
    resume: 'CONTINUAR',
    restart: 'REINICIAR ZONA',
    theme: 'TEMA',
  },
  win: {
    title: 'ÁREA DOMINADA!',
    restart: 'aperte R para jogar de novo',
  },
  gameover: {
    title: 'FIM DE JOGO',
    restart: 'aperte R para tentar de novo',
  },
  countdown: {
    go: 'VAI!',
  },
  levelclear: {
    dominated: (zone) => `ZONA ${zone} DOMINADA!`,
    conquered: (pct) => `${pct}% conquistado`,
    next: 'PRÓXIMA ZONA',
  },
  tutorial: 'SETAS/WASD mover · H parede horizontal · V parede vertical · segure contra uma parede para escalar',
  dev: {
    slice: 'fatia 1 — jogo mínimo',
  },
};
