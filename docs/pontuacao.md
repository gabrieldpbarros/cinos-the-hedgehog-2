# Sistema de pontuação

## Visão geral

A pontuação deixou de depender apenas do total de anéis coletados. Agora ela
acumula pontos por anéis, por inimigos derrotados em cadeia e por um bônus único
de tempo ao concluir a fase, como nos jogos arcade clássicos.

## Regras

- **Anel:** 10 pontos por anel coletado, incluindo anéis espalhados que são
  recolecionados. Ao levar um impacto, os pontos dos anéis perdidos são
  descontados; recolecioná-los devolve os pontos, sem rendimento extra.
- **Inimigo:** 100 pontos pela primeira derrota. Derrotas consecutivas dentro de
  2 segundos dobram o valor: 100, 200, 400, 800. Passado esse intervalo, a cadeia
  volta a 100 pontos.
- **Bônus de tempo:** concedido uma única vez ao cruzar a chegada, de acordo com
  o tempo decorrido. Abaixo de 50 s são 5000 pontos; depois disso os degraus são
  65 s (3500), 80 s (2500), 100 s (1500), 120 s (800) e zero acima disso.
- **Nota:** A partir de 8500 pontos; B 6500; C 4800; D 3000; E 1500; F abaixo
  disso.

Todos os valores ficam em `SCORE`, em `src/game/constants.js`.

## Implementação

- `src/game/logic/Score.js` guarda os pontos, o tempo da cadeia e o bônus, e
  expõe `gradeForScore()`.
- `Level` incrementa a pontuação ao coletar anéis e ao derrotar inimigos ou
  peixes com o giro, além de avançar o relógio da cadeia a cada quadro.
- `Game.getResults()` finaliza a pontuação com o bônus de tempo na vitória e
  devolve pontos, bônus e nota para a tela de resultados.
- O HUD mostra os pontos com seis dígitos, e as telas de vitória e derrota
  exibem a pontuação ao lado das estatísticas existentes.

## Testes

- `tests/score.test.js` cobre anéis, perda e recoleta, cadeia de inimigos,
  janela da cadeia, degraus do bônus de tempo, idempotência do bônus e as faixas
  de nota.
- `tests/rings.test.js` validou a integração com o `Level` e a nota derivada da
  pontuação.
- `bun test`, `bunx eslint src tests` e `bun run build` passam sem erros.
