# ZONA ZERO — Design & Especificação

_Spec aprovada em 2026-07-23. Jogo de arena estilo JezzBall com personagem controlável._

## Conceito

Jogo de browser inspirado no clássico JezzBall (dividir a arena para cercar bolinhas quicando), com um twist original: em vez de clicar, **você controla um orbe de energia dentro da arena** que não pode encostar nas bolinhas e dispara as paredes divisórias de onde estiver (tecla **H** = horizontal, **V** = vertical). Roda em PC (setinhas/WASD + H/V) e mobile (sempre paisagem, joystick virtual + 2 botões). Placar top-10 local (localStorage) com iniciais de 3 letras estilo fliperama.

**Decisões de produto**: localStorage (não online) · visual neon arcade · campanha 12 níveis + infinito · bola acerta parede em construção = perde 1 vida · ritmo tático e tenso · toda partida começa do nível 1 (score de run única) · quebra fiel ao clássico: metade ancorada vira parede permanente · música dinâmica procedural + SFX · power-ups (3) na v1 · personagem = orbe de energia · deploy GitHub Pages · HUD clássica ("CONQUISTADO: x% / alvo") · PWA instalável · seletor de temas (Tron padrão, Synthwave, Fliperama) · níveis apresentados como "ZONA N".

**Decisões de design**: countdown 3-2-1 com bolas congeladas mostrando setinhas de direção, spawn a distância mínima do jogador (que nasce no centro) · morrer não reseta bolas nem território · sem dash · sem cancelamento de parede · camping em território conquistado é seguro mas inútil (não dispara de lá; bônus de tempo derrete) · prender bolas em jaulas pequenas é a estratégia central · bolinhas atravessam umas às outras · quebra à distância legível (hit-stop ~80ms + flash + som distinto) · HI-score na HUD · game over com estatísticas da run · celebração de fim de nível (~1,5s) · acessibilidade: bolas distinguíveis por forma/tamanho/comportamento + toggles de shake/flash · música synthwave tensa · sem save de run · attract mode no título · compartilhar score (Web Share/clipboard) · dicas contextuais one-shot · iniciais por seletor OU digitação direta (grade de letras no touch) · fullscreen + vibração leve no mobile (toggles).

## O problema central e sua solução

O medo original: "você vai ficar sempre fechado com a bolinha". A solução transforma isso na graça do jogo:

1. **Ao completar uma parede, toda área desconectada das bolinhas é preenchida** (território conquistado, pontos) — independente de onde o jogador está. Jogador em área preenchida é **realocado** para a área aberta mais próxima (ponto mais longe das bolinhas), com 2s de invencibilidade.
2. **Território conquistado é chão seguro e caminhável** — bolinha nunca entra.
3. **Vault**: o jogador pula paredes prontas segurando a direção contra elas por 0,4s (indicador de progresso), vulnerável durante o canal e com pouso por conta e risco. Toda área é sempre alcançável → zero softlock.

Tensão emergente: quanto mais você conquista, menor o espaço em que fica confinado junto com as bolinhas.

## Modelo geométrico: grade + flood fill

A regra "metade ancorada fica" cria tocos → áreas em L/T. Modelo (o mesmo do JezzBall original): **grade de células**.

- **Célula de 8px**. Área jogável 1280×664 (56px de HUD no topo) → **160×83 = 13.280 células**. Paredes com 1 célula de espessura real.
- **Estados**: `OPEN` | `WALL` | `CLAIMED`. % = contagem de células — aritmética inteira exata.
- **Conquista por conectividade**: ao completar parede, flood fill dos componentes `OPEN`; componente sem bolinha → `CLAIMED`.
- **Parede em crescimento**: 2 pontas avançando (progresso float, commit por célula). Células pendentes frágeis em toda a extensão: bola encostou → pendentes somem + 1 vida; células da metade já ancorada ficam como `WALL` permanente. Ponta ancora ao alcançar célula sólida — paredes ancoram em tocos antigos. Ambas ancoradas = completa → checagem de conquista. (Toco sozinho nunca sela área.)
- **Colisões**: bola = círculo × tilemap (por eixo, reflexão espelhada; substep quando deslocamento/tick > 4px); jogador = círculo × tilemap (`WALL` bloqueia, `CLAIMED` caminhável, pendentes intangíveis); jogador × bola e jogador × power-up = círculo × círculo.
- **Vault**: contra `WALL` por 0,4s → salta para a primeira célula livre do outro lado (varre até 6 células).
- **Render**: células contíguas fundidas em runs → barras neon; a grade é invisível ao jogador.

## Regras

- **Bolinhas**: diagonais puras (vx=±s, vy=±s), velocidade constante, reflexão elástica.
- **Parede**: nasce na célula do jogador, cresce nas 2 direções; 1 em progresso por vez; H prioridade sobre V; sem cancelamento. Trigger negado (buzz, cooldown 250ms) se: em progresso, em vault, ou pisando em `CLAIMED`.
- **Jogador (orbe)**: 8 direções, r=10. Tocou bolinha = 1 vida (salvo escudo), respawn no ponto mais seguro do componente, 2s i-frames. Quebra de parede também dá i-frames. Ambos zeram combo.
- **Vidas**: 3 iniciais, +1 por nível (teto 6). 0 = game over.
- **Pausa**: Esc/P + botão HUD; auto-pausa em blur (nunca retoma sozinho); toggles no menu.

## Power-ups

Surgem no componente do jogador, em célula `OPEN` a distância mínima do jogador e das bolas. A cada ~20s (após countdown), duram 8s pulsando. Sem pontos por coleta.

| Power-up | Efeito | Zona |
|----------|--------|------|
| Relógio | Bolas a 50% por 5s (música desacelera) | 3 |
| Escudo | 1 toque de bola (anel no orbe; não acumula; não protege quebra) | 5 |
| Turbo | Próxima parede 2× mais rápida (ícone HUD) | 7 |

## Ritmo (tuning inicial em config.js)

Ponta da parede ~530px/s (meia arena ≈ 1,2s) · bola normal 170px/s por eixo · jogador ~300px/s · teto do infinito ~420px/s por eixo.

## Level design

| Zona | Bolinhas | Alvo | Novidade |
|----|----------|------|----------|
| 1 | 1 normal lenta | 60% | Tutorial |
| 2 | 2 normais | 65% | — |
| 3 | 2 normais (1 média) | 70% | Power-up Relógio |
| 4 | 2 normais + 1 veloz | 70% | Veloz: r=8, 1.6× |
| 5 | 3 mistas mais rápidas | 75% | Power-up Escudo |
| 6 | 2 + 1 gigante | 70% | Gigante: r=26, 0.7× |
| 7 | 4 mistas | 75% | Power-up Turbo |
| 8 | 3 + 1 fantasma | 75% | Fantasma: esmaece até 20% |
| 9 | 5 mistas | 75% | — |
| 10 | 4 + 1 perseguidora | 75% | Homing suave, anti-camping |
| 11 | 6 mistas | 78% | — |
| 12 | 6 todos os tipos | 80% | Mistura final |
| 13+ | +1 bola/2 zonas (teto 10) | 80% | +5%/zona velocidade até teto; depois mix maligno → platô de skill |

## Pontuação

- Pontos ∝ % conquistado × multiplicador da zona.
- Big chunk: fill único ≥15% da arena = 2×.
- Combo: fills consecutivos sem quebra/morte (teto); quebra/morte zera.
- Bônus de zona: vidas×500 + excedente%×100 + tempo (regressivo, só bônus — nunca falha por tempo).
- Game over → stats da run → top 10? → iniciais → placar → compartilhar.

## Persistência

`storage.js`: interface KV (localStorage + fallback memória) + top-10 `{name, score, level, date}` (empate: existente ganha) + prefs (mudo, vibração, shake/flash, tema, dicas vistas). Trocável por backend online sem tocar no jogo.

## Controles

- **PC**: setinhas + WASD, H/V paredes, Esc/P pausa, Enter confirma, M mudo.
- **Mobile**: paisagem obrigatória (overlay de rotação + pausa). Joystick flutuante (esquerda, dead zone 0.15, raio 60px); botões V (embaixo) e H (acima) na direita (~96px). Multitouch por `Map<identifier, role>`. `touch-action:none` etc. Fullscreen + vibração.

## Áudio (procedural, zero assets)

7+ SFX WebAudio + música synthwave por sequenciador (2-3 canais) reagindo: BPM/camadas com % conquistado, camada extra a <10% do alvo, desacelera com Relógio. Unlock no 1º gesto; mudo persistido.

## Arquitetura

Vanilla JS, ES modules (paths relativos — GitHub Pages em subpath), Canvas 2D, zero dependências, zero build. `python3 -m http.server 8080` para servir; `node --test` para testes.

**Separação estrita**: nada em `src/game/` ou `src/services/` referencia `window`/`document`/`canvas`/`localStorage`. Só `src/ui/` e `main.js` tocam DOM.

Ver árvore de módulos e ordem canônica do tick no plano de implementação (`~/.claude/plans/man-quero-sua-ajuda-sharded-pillow.md`) e no código.

**Ordem canônica do tick**: timers → jogador (vault → mover/clamp) → coleta de power-up → trigger → passo da parede (quebra → ancorar → completou: WALL, flood fill, claims, realocação) → bolinhas → colisão jogador×bola → vitória.

## Verificação

- `node --test`: invariantes de grade (células constantes, componente com bola nunca claimado), quebra preserva ancorada, confinamento 10k ticks, vault, homing, fronteiras de score, top-10, JSON corrompido, integração headless.
- Manual: navegador do Windows via localhost (WSL2 encaminha) — desktop + emulação mobile; Playwright headless best-effort; celular real ao fim.
