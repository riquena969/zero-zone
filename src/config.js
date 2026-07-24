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

// ---------- Níveis ----------
export const COUNTDOWN_TIME = 3; // s de 3-2-1 no início da zona (bolas congeladas)
export const LIVES_MAX = 6; // +1 vida por zona completa, até este teto
export const SPAWN_MARGIN = 48; // px das bordas da arena para spawn de bolas
export const SPAWN_MIN_PLAYER_DIST = 220; // px mínimos entre bola e jogador no spawn
export const SPAWN_MIN_BALL_DIST = 60; // px mínimos entre bolas no spawn

// ---------- Power-ups ----------
export const POWERUP_UNLOCK = { relogio: 3, escudo: 5, turbo: 7 }; // zona em que entram
export const POWERUP_INTERVAL = 20; // s entre spawns
export const POWERUP_RETRY = 2; // s para tentar de novo se não achou posição
export const POWERUP_LIFETIME = 8; // s no chão antes de sumir
export const POWERUP_RADIUS = 14;
export const POWERUP_MIN_PLAYER_DIST = 160; // coletar exige se deslocar
export const POWERUP_MIN_BALL_DIST = 80;
export const CLOCK_DURATION = 5; // s de bolas lentas
export const CLOCK_FACTOR = 0.5;
export const TURBO_FACTOR = 2; // próxima parede 2× mais rápida
export const SHIELD_IFRAMES = 1; // s de invencibilidade ao estourar o escudo

// ---------- Pontuação ----------
export const POINTS_PER_PCT = 100; // pontos por 1% conquistado (antes dos multiplicadores)
export const BIG_CHUNK_PCT = 0.15; // fill único ≥ 15% da arena vale 2×
export const COMBO_STEP = 0.5; // multiplicador: 1 + combo × step
export const COMBO_MULT_MAX = 4;
export const ZONE_BONUS_PER_LIFE = 500;
export const ZONE_BONUS_PER_EXCESS_PCT = 100; // por ponto % acima do alvo
export const TIME_BONUS_START = 60; // s de bônus de tempo por zona (regressivo, só bônus)
export const TIME_BONUS_RATE = 50; // pontos por segundo restante

// ---------- Vault (pular parede) ----------
export const VAULT_TIME = 0.4; // s segurando contra a parede
export const VAULT_PRESS_MIN = 0.4; // componente mínimo do movimento na direção da parede
export const VAULT_MAX_SCAN = 6; // espessura máxima de parede atravessável (células)

// ---------- Bolinhas ----------
// Distinguíveis por FORMA/tamanho/comportamento, não só cor (daltonismo).
export const BALL_TYPES = {
  normal: { r: 12, axisSpeed: 170 },
  veloz: { r: 8, axisSpeed: 272 }, // pequena, 1.6×
  gigante: { r: 26, axisSpeed: 119 }, // enorme, 0.7× — difícil de cercar
  fantasma: { r: 12, axisSpeed: 170 }, // esmaece em ciclos; SEMPRE colide
  perseguidora: { r: 11, axisSpeed: 150, homing: true, turnRate: 1.2 }, // rad/s — anti-camping
};
export const MAX_AXIS_SPEED = 420; // teto do infinito (anti-tunneling)
export const GHOST_CYCLE = 3; // s por ciclo de esmaecimento do fantasma
export const GHOST_MIN_ALPHA = 0.2; // piso de opacidade (nunca some de vez — justiça)

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
    powerup: '#66ffc2',
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
    powerup: '#7cffb0',
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
    powerup: '#00f593',
  },
};

export const DEFAULT_THEME = 'tron';
