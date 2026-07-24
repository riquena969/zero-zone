// ZONA ZERO — todos os tunables do jogo num lugar só.
// Regra: código de gameplay NUNCA tem número mágico; ele importa daqui.

// ---------- Geometria ----------
export const LOGICAL_W = 1280; // resolução lógica (letterboxed no viewport)
export const LOGICAL_H = 720;
export const HUD_H = 56; // faixa da HUD no topo, fora da área jogável

export const CELL = 8; // célula da grade em px lógicos (paredes têm 1 célula de espessura)
export const GRID_W = LOGICAL_W / CELL; // 160
export const GRID_H = (LOGICAL_H - HUD_H) / CELL; // 83
export const ARENA_Y = HUD_H; // y lógico onde a arena começa

// ---------- Estados da grade ----------
export const OPEN = 0;
export const WALL = 1;
export const CLAIMED = 2;

// ---------- Jogador ----------
export const PLAYER_RADIUS = 10;
export const PLAYER_SPEED = 300; // px/s
export const IFRAMES_TIME = 2; // s de invencibilidade após morte/quebra/realocação
export const LIVES_START = 3;

// ---------- Bolinhas ----------
export const BALL_TYPES = {
  normal: { r: 12, axisSpeed: 170 },
  // veloz / gigante / fantasma / perseguidora entram na fatia 7
};
export const MAX_AXIS_SPEED = 420; // teto do infinito (anti-tunneling)

// ---------- Parede ----------
export const WALL_TIP_SPEED = 530; // px/s por ponta (meia arena ≈ 1,2s)

// ---------- Temas (paletas selecionáveis pelo jogador) ----------
// Cada tema define TODAS as cores do jogo. Trocar de tema re-coze os sprites de glow.
export const THEMES = {
  tron: {
    label: 'Tron',
    bg: '#050a12', // azul-noite quase preto
    gridLine: 'rgba(0, 220, 255, 0.06)',
    wall: '#00e5ff', // paredes prontas / tocos
    wallGrow: '#ff2fd6', // parede em crescimento (frágil)
    claimed: 'rgba(0, 229, 255, 0.14)', // território conquistado (preenchimento)
    claimedEdge: 'rgba(0, 229, 255, 0.55)',
    player: '#eafcff', // orbe
    playerGlow: '#7df9ff',
    balls: {
      normal: '#ffb02e', // perigo = cores quentes (contraste com o mundo frio)
      veloz: '#ff6b35',
      gigante: '#ff8c42',
      fantasma: '#ffd166',
      perseguidora: '#ff3860',
    },
    hudText: '#bfefff',
    danger: '#ff3860',
  },
  synthwave: {
    label: 'Synthwave',
    bg: '#12041f', // roxo profundo
    gridLine: 'rgba(255, 79, 216, 0.07)',
    wall: '#ff4fd8',
    wallGrow: '#00f0ff',
    claimed: 'rgba(255, 79, 216, 0.14)',
    claimedEdge: 'rgba(255, 79, 216, 0.55)',
    player: '#fff6fb',
    playerGlow: '#ff9de2',
    balls: {
      normal: '#ffd23f',
      veloz: '#ffa62b',
      gigante: '#f9c80e',
      fantasma: '#ffe89e',
      perseguidora: '#ff2e63',
    },
    hudText: '#ffd6f4',
    danger: '#ff2e63',
  },
  fliperama: {
    label: 'Fliperama',
    bg: '#000000', // preto puro, cada elemento numa cor saturada
    gridLine: 'rgba(255, 255, 255, 0.05)',
    wall: '#2de2e6',
    wallGrow: '#f706cf',
    claimed: 'rgba(45, 226, 230, 0.16)',
    claimedEdge: 'rgba(45, 226, 230, 0.6)',
    player: '#ffffff',
    playerGlow: '#fffb96',
    balls: {
      normal: '#fee440',
      veloz: '#fb5607',
      gigante: '#ff8600',
      fantasma: '#c1fba4',
      perseguidora: '#ff006e',
    },
    hudText: '#f8f8f2',
    danger: '#ff006e',
  },
};

export const DEFAULT_THEME = 'tron';
