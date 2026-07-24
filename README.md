# ⚡ ZONA ZERO

> Cerque as bolinhas. Não encoste nelas.

Arcade neon inspirado no clássico **JezzBall** — com um twist: em vez de um cursor, **você é um orbe de energia dentro da arena**. Dispare paredes divisórias de onde estiver, prenda as bolinhas em jaulas cada vez menores e conquiste a zona... sabendo que cada parede que você fecha também aperta o espaço em que **você** está preso com elas.

**🎮 Jogar agora: https://riquena969.github.io/zero-zone/**

## Como jogar

| Ação | PC | Celular (paisagem) |
|------|----|--------------------|
| Mover o orbe | Setas ou WASD | Joystick (lado esquerdo) |
| Parede horizontal | **H** | Botão **H** |
| Parede vertical | **V** | Botão **V** |
| Escalar parede | Segurar a direção contra ela (~0,4s) | idem, com o joystick |
| Pausar | Esc / P | Botão ⏸ |
| Mudo | M | Menu de pausa |

- Quando uma parede completa, **toda área sem bolinha vira território seu**. Conquiste a meta da zona para avançar.
- Bolinha bateu na parede em construção? Ela quebra e custa **1 vida** — mas a metade que já ancorou **fica** (tocos viram terreno tático).
- Fills gigantes (≥15% da arena) valem **2×**; sequências sem erro sobem o **combo**.
- Power-ups surgem perto do perigo: **relógio** (bolas lentas), **escudo** (aguenta 1 toque), **turbo** (parede 2× mais rápida).
- 12 zonas desenhadas + **modo infinito** para caçar recorde. Placar top-10 com iniciais estilo fliperama (fica no seu navegador).

## Rodar localmente

```bash
python3 -m http.server 8080   # ou: npm run serve
# abra http://localhost:8080
```

Zero dependências, zero build: JavaScript vanilla + Canvas 2D, ES modules servidos estáticos. PWA instalável (offline após a primeira visita).

## Desenvolvimento

```bash
npm test   # node --test — 110 testes dos módulos puros (grade, colisão, regras, score, storage)
```

Arquitetura, decisões de design e o plano completo de implementação: [`docs/PLANO.md`](docs/PLANO.md) · [spec de design](docs/superpowers/specs/2026-07-23-zona-zero-design.md).

Feito com [Claude Code](https://claude.com/claude-code).
