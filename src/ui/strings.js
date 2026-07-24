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
    bonus: (b) => `Vidas +${b.livesBonus} · Excedente +${b.excessBonus} · Tempo +${b.timeBonus}`,
    next: 'PRÓXIMA ZONA',
  },
  tutorial: 'SETAS/WASD mover · H parede horizontal · V parede vertical · segure contra uma parede para escalar',
  title: {
    subtitle: 'cerque as bolinhas. não encoste nelas.',
    play: 'JOGAR',
    howto: 'COMO JOGAR',
    board: 'PLACAR',
    hint: 'ENTER para jogar',
  },
  initials: {
    title: 'NOVO RECORDE!',
    prompt: 'suas iniciais',
    confirm: 'CONFIRMAR',
  },
  leaderboard: {
    title: 'PLACAR',
    back: 'VOLTAR',
    share: 'COMPARTILHAR',
    shared: 'copiado para a área de transferência!',
    empty: 'nenhum recorde ainda — seja o primeiro!',
    shareText: (score) => `Fiz ${score} pontos no ZONA ZERO! Consegue me superar?`,
  },
  howto: {
    title: 'COMO JOGAR',
    lines: [
      'Mova o orbe com as SETAS ou WASD.',
      'H dispara uma parede horizontal; V, uma vertical — a partir de você.',
      'Quando a parede completa, toda área sem bolinha vira território seu.',
      'Bolinha bateu na parede em construção? Ela quebra e custa 1 vida.',
      'A metade que já ancorou FICA — use os tocos a seu favor.',
      'Encostou numa bolinha, perdeu vida. Prenda-as em jaulas pequenas!',
      'Preso? Segure contra uma parede pronta para escalá-la.',
      'Conquiste a meta da zona. Fills grandes e sequências valem mais.',
      'Power-ups surgem perto do perigo: relógio, escudo e turbo.',
    ],
    back: 'VOLTAR',
  },
  gameoverScreen: {
    title: 'FIM DE JOGO',
    score: 'PONTUAÇÃO',
    zone: 'zona alcançada',
    walls: 'paredes construídas',
    shattered: 'paredes perdidas',
    maxCombo: 'maior combo',
    biggestFill: 'maior conquista',
    retry: 'JOGAR DE NOVO',
    menu: 'MENU',
  },
  hints: {
    vault: 'continue segurando contra a parede para escalar!',
  },
};
