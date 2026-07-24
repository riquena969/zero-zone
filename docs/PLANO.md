# ZONA ZERO — Plano de Implementação

_Plano aprovado em 2026-07-23. Especificação de design completa em [`docs/superpowers/specs/2026-07-23-zona-zero-design.md`](superpowers/specs/2026-07-23-zona-zero-design.md)._

> **STATUS (2026-07-24): as 15 fatias foram concluídas — jogo no ar em https://riquena969.github.io/zero-zone/ (110 testes passando).** Para futuros deploys: bump da versão do cache em `sw.js` (`zona-zero-vN`) + push.

## Visão geral

Jogo de browser inspirado no JezzBall: você controla um **orbe de energia** dentro da arena, não pode encostar nas bolinhas e dispara paredes divisórias de onde estiver (**H** = horizontal, **V** = vertical). Ao completar uma parede, toda área desconectada das bolinhas vira **território conquistado**. Objetivo: conquistar a % alvo de cada ZONA. Roda em PC (setinhas/WASD + H/V) e mobile (paisagem, joystick + 2 botões). Placar top-10 local com iniciais de 3 letras.

**Stack**: JavaScript vanilla, ES modules, Canvas 2D, zero dependências, zero build. Servir com `python3 -m http.server 8080` (ou `npm run serve`). Testes com `node --test` (ou `npm test`).

## Decisões de produto (fechadas com o usuário)

| Tema | Decisão |
|------|---------|
| Placar | localStorage (interface KV trocável por backend depois) |
| Visual | Neon arcade com **seletor de temas**: Tron (padrão), Synthwave, Fliperama |
| Estrutura | Campanha de 12 ZONAS + modo infinito |
| Punição | Bola acerta parede em construção = quebra + **perde 1 vida** (clássico) |
| Ritmo | Tático e tenso (parede ~530px/s, bola 170, jogador 300) |
| Progressão | Sempre do nível 1, score de run única (fliperama) |
| Quebra | **Fiel ao clássico**: metade já ancorada fica como parede permanente (toco) |
| Áudio | Música synthwave dinâmica procedural + SFX (zero assets) |
| Power-ups | Relógio, Escudo e Turbo já na v1 (ZONAs 3/5/7) |
| Personagem | Orbe/faísca de energia com rastro neon |
| Deploy | GitHub Pages + PWA instalável |
| HUD | Clássica: "CONQUISTADO: x% / alvo" subindo |

## Arquitetura

```
index.html  css/style.css
src/
├── main.js                # composição: loop + telas + input + game; roteia eventos → audio/fx/telas
├── config.js              # TODOS os tunables (geometria, velocidades, pontuação, 3 paletas de tema)
├── core/loop.js           # timestep fixo 60Hz + render rAF (determinismo p/ testes headless)
├── core/statemachine.js   # telas: title(attract)↔howto, playing↔paused, levelclear, gameover→initials→leaderboard
├── game/                  # ---- PURO: nada de DOM; importável no Node = smoke test ----
│   ├── rng.js             # PRNG seedado (mulberry32)
│   ├── grid.js            # CRÍTICO: grade 160×83 (células 8px), flood fill, claim, % exato, greedy meshing
│   ├── collide.js         # AABB×tilemap com substeps (anti-tunneling), círculo×círculo
│   ├── walls.js           # parede em crescimento: pontas, ancoragem (toco permanente), fragilidade, completude
│   ├── balls.js           # tipos, diagonais puras, reflexão exata, fantasma, perseguidora
│   ├── powerups.js        # spawn no componente do jogador, timers, efeitos
│   ├── player.js          # mover+clamp, fits/depenetrate, i-frames, escudo, vault, safestPoint
│   ├── levels.js          # tabela 12 ZONAs + fórmula do infinito + spawns seedados
│   ├── scoring.js         # fills, big-chunk, combo, bônus de nível, stats da run
│   └── game.js            # CRÍTICO: ordem canônica do tick, cola das regras, retorna eventos
├── services/storage.js    # adapter KV (localStorage/memória) + leaderboard top-10 + prefs
└── ui/                    # ---- única camada que toca DOM ----
    ├── viewport.js        # letterbox 1280×720 + DPR + toLogical() (fonte única de mapeamento)
    ├── input.js           # snapshot unificado/tick {moveX, moveY, hJust, vJust...}, edge-triggered
    ├── touch.js           # joystick flutuante + botões H/V, multitouch por identifier
    ├── render.js          # neon: barras via greedy meshing, glow pré-cozido, orbe com rastro
    ├── fx.js              # partículas + screen shake + hit-stop
    ├── audio.js           # SFX + música dinâmica (WebAudio procedural)
    ├── screens.js         # overlays DOM (menus, placar, iniciais, tutorial, rotate)
    └── strings.js         # todos os textos PT-BR + nome do jogo
test/                      # espelha os módulos puros + integração headless
```

**Ordem canônica do tick** (`game.js`): timers → jogador (vault → mover/clamp) → coleta de power-up → trigger de parede → passo da parede (fragilidade/quebra → ancorar → completou: WALL, flood fill, claims, realocação) → bolinhas → colisão jogador×bola → vitória (após todos os claims).

**Modelo geométrico**: grade de células 8px (160×83 = 13.280 células), estados OPEN/WALL/CLAIMED, conquista por conectividade (flood fill), % por contagem inteira — exato, sem drift. Paredes ancoram em tocos antigos criando labirintos orgânicos.

## Etapas (fatias verticais — jogável desde a fatia 1)

Cada fatia termina com: `node --test` verde + checagem manual no navegador + 1 commit.

### ✅ Fatia 0 — Esqueleto
`git init`, `index.html`, `css/style.css`, `src/main.js`, `src/config.js`, `src/core/loop.js` (timestep fixo 60Hz + clamp anti-espiral), `src/ui/viewport.js` (letterbox + DPR + `toLogical`). Canvas renderizando arena com grade neon. Design doc salvo no repo.

### ✅ Fatia 1 — Jogo mínimo
TDD nos módulos puros (**50 testes passando**): `rng`, `grid` (flood fill, claim, meshing, property test com 200 seeds), `collide` (anti-tunneling), `balls` (confinamento 10k ticks), `walls` (ancoragem/quebra/toco), `player` (clamp, depenetrate), `game` (integração headless: disparo→split→claim→vitória, negados, quebra).
Falta: `ui/input.js` (teclado), `ui/render.js` (flat), `ui/strings.js`, fiação no `main.js`. Resultado: mover + H/V + 1 bola + quebra + claim + vitória (R reinicia). **Checkpoint de diversão com o usuário — tunar ritmo aqui.**

### Fatia 2 — Vidas e morte
Colisão jogador×bola (mesmo componente, ignorada em i-frames), vida perdida em toque E em quebra de parede, `safestPoint` (respawn no ponto mais longe das bolas), i-frames 2s piscando, realocação com i-frames quando o componente do jogador é claimado, game over básico. 3 vidas.

### Fatia 3 — Vault
Segurar direção contra parede por 0,4s → salta para a primeira célula livre do outro lado (varre até 6 células de espessura). Indicador de progresso circular, triggers bloqueados durante o canal, buzz de negado pisando em CLAIMED. Pouso por conta e risco (sem i-frames). Garante zero softlock.

### Fatia 4 — HUD e pausa
HUD canvas: ZONA N, CONQUISTADO %/alvo, vidas, score, HI, botão pausa. Esc/P, auto-pausa em blur/visibilitychange (nunca retoma sozinho), menu DOM (continuar/reiniciar/sair) com toggles (som, vibração, shake/flash, tema).

### Fatia 5 — Níveis
`levels.js`: tabela de 12 ZONAs + fórmula do infinito (+1 bola/2 zonas teto 10, +5%/zona velocidade até teto ~420px/s, depois mix mais maligno → platô de skill). Countdown 3-2-1 com bolas congeladas mostrando setinhas de direção, spawns seedados a distância mínima do jogador, progressão, +1 vida por zona (teto 6), tela de zona completa, tutorial na ZONA 1.

| Zona | Bolinhas | Alvo | Novidade |
|----|----------|------|----------|
| 1 | 1 normal lenta | 60% | Tutorial |
| 2 | 2 normais | 65% | — |
| 3 | 2 normais (1 média) | 70% | Power-up Relógio |
| 4 | 2 + 1 veloz | 70% | Veloz (r=8, 1.6×) |
| 5 | 3 mistas rápidas | 75% | Power-up Escudo |
| 6 | 2 + 1 gigante | 70% | Gigante (r=26, 0.7×) |
| 7 | 4 mistas | 75% | Power-up Turbo |
| 8 | 3 + 1 fantasma | 75% | Fantasma (esmaece até 20%) |
| 9 | 5 mistas | 75% | — |
| 10 | 4 + 1 perseguidora | 75% | Homing suave anti-camping |
| 11 | 6 mistas | 78% | — |
| 12 | 6 todos os tipos | 80% | Mistura final |
| 13+ | fórmula | 80% | Infinito |

### Fatia 6 — Pontuação
`scoring.js`: pontos ∝ % × multiplicador da zona; big chunk (fill único ≥15% = 2×); combo (fills consecutivos sem quebra/morte, com teto; quebra/morte zera); bônus de zona (vidas×500 + excedente%×100 + tempo regressivo só-bônus — **zona nunca falha por tempo**); stats da run (paredes construídas/quebradas, maior combo, maior jaula).

### Fatia 7 — Bolas especiais
Veloz, gigante, fantasma (sempre colide, contorno tênue permanente), perseguidora (curva limitada, velocidade constante, confinada ao componente, única não-diagonal). Distinguíveis por forma/tamanho/comportamento, não só cor.

### Fatia 8 — Power-ups
`powerups.js`: spawn no componente do jogador a distância mínima (coletar exige se expor), a cada ~20s, 8s no chão pulsando. Relógio (bolas 50% por 5s, música junto), Escudo (1 toque; anel no orbe; não acumula; NÃO protege quebra), Turbo (próxima parede 2×; ícone HUD).

### Fatia 9 — Telas e PT-BR
`screens.js` + `strings.js` + `statemachine.js`: título com attract mode (arena viva ao fundo), como jogar, zona completa com celebração (~1,5s bolas implodem), game over com stats, navegação teclado+clique, dicas contextuais one-shot.

### Fatia 10 — Persistência
`storage.js`: adapter KV (localStorage + fallback memória p/ modo privado), top-10 `{name, score, level, date}` (empate: existente ganha), prefs. Iniciais A-Z: seletor por setinhas + digitação direta + grade touch; validação `/^[A-Z]{3}$/`. Tela de placar. Compartilhar score (Web Share API + fallback clipboard).

### Fatia 11 — Mobile
`touch.js`: joystick flutuante (metade esquerda, dead zone 0.15, raio 60px), botões V (embaixo) e H (acima) na direita (~96px), multitouch por `Map<identifier, role>`, `touchcancel` limpo. Overlay "gire o celular" (matchMedia + pausa). Fullscreen API + `navigator.vibrate` (toggles). Auditoria: `touch-action:none`, `overscroll-behavior:none`, preventDefault.

### Fatia 12 — Áudio
`audio.js`: 7 SFX procedurais (disparo, ancorou, conquistou, quebrou, morreu, zona completa, power-up) + música synthwave tensa por sequenciador (2-3 canais de osciladores) reagindo ao jogo: BPM/camadas sobem com o % conquistado, camada extra a <10% do alvo, desacelera com Relógio. Unlock no 1º gesto (iOS) + resume em visibilitychange. Mudo persistido (M).

### Fatia 13 — Polish
`fx.js`: partículas (fill burst, estilhaços, morte do orbe, implosão na celebração), screen shake (toggle), micro hit-stop ~80ms na quebra, glow pré-cozido (sprites offscreen + composite `lighter`, re-baked por tema — nunca `shadowBlur` por frame), rastro do orbe, grade estática pré-renderizada. Tuning final. p95 do frame ≤ 20ms na ZONA 12.

### Fatia 14 — Deploy + PWA
Push para GitHub, GitHub Pages da raiz (paths relativos já garantidos), `manifest.json` + service worker com cache versionado (só entra aqui para não atrapalhar o dev), meta tags og:, README com screenshot/GIF, teste na URL pública (desktop + celular real + instalação PWA).

## Verificação

- **Unit (`node --test`)**: invariantes de grade (soma de células constante; componente com bola nunca claimado — property test com 200 seeds), quebra preserva metade ancorada, confinamento de bola 10k ticks sem NaN/tunneling no teto de velocidade, vault 0,4s contínuos, curva da perseguidora ≤ turnRate·dt, fronteiras exatas do score (15% dobra; 14,99% não), top-10 (ordenação/truncamento/empate/JSON corrompido), integração headless (completar zona por script; morrer 3× → game over).
- **Manual**: navegador do Windows via `localhost:8080` (WSL2 encaminha a porta) — desktop + emulação mobile do DevTools; celular real na rede local ou na URL do GitHub Pages.
- **Playwright**: best-effort no WSL (requer `sudo npx playwright install chrome` — opcional; nada depende dele).

## Edge cases resolvidos por design

Bola na fronteira de célula no claim (célula = centro da bola) · jogador sobre células que viraram WALL (depenetrate BFS) · tunneling (substeps ≤ meia célula + teto de velocidade) · H+V no mesmo tick (H vence) · vitória durante parede em crescimento (pendentes descartadas) · power-up sob célula que virou WALL/CLAIMED (some) · spam de trigger (edge-triggered + cooldown do buzz) · corredores de 2 células onde só bolas passam (jogador contorna via vault) · localStorage indisponível (fallback memória) · aba oculta (auto-pausa + clamp do acumulador) · iOS audio lock (unlock no 1º gesto) · DPR/zoom (re-checado por frame, mapeamento único no viewport).
