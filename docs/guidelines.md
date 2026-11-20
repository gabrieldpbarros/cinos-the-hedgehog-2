# Diretrizes e trilha do jogo

## Objetivo e estado atual

O projeto é um jogo 3D de corrida inspirado no protótipo feito em Scratch e na estética de Green Hill. O Sonic pode andar nos dois sentidos, acelerar, frear, agachar (com pose procedural) e pular; o salto também ativa o giro usado para derrotar inimigos. O HUD mostra distância, velocidade, saldo de anéis e tempo da fase.

A `main` atual já possui:

- coleta de anéis com HUD, espalhamento, recoleta e invulnerabilidade;
- BuzzBombers e espinhos gerados ao longo da fase;
- dano com consumo do saldo de anéis e derrota quando o saldo chega a zero;
- pausa com lista de controles, botões de continuar/reiniciar e mute de áudio;
- efeitos e trilha chiptune originais sintetizados no navegador;
- vitória em 1000 m, tela de resultados com **tempo**, **anéis carregados / total coletado** e nota;
- terreno com oito chunks ativos, permitindo voltar alguns trechos;
- hazards gerados a 140 unidades para não aparecerem na segunda câmera;
- reinício por teclado ou botão;
- duas câmeras em perspectiva, luz ambiente, duas luzes direcionais, terreno texturizado e modelos 3D.

A interface usa as fontes abertas Bungee e Chakra Petch, com créditos em [font-credits.md](font-credits.md). O estado detalhado do código está em [arquitetura-engine.md](arquitetura-engine.md); as regras de anéis e hazards estão em [rings.md](rings.md) e [obstacles.md](obstacles.md).

## Decisões de projeto

| Tema | Diretriz atual |
| --- | --- |
| Tecnologia | Three.js com Vite. `src/main.js` inicia o jogo, o loop e a interface; `Game` coordena regras, nível e cena. |
| Coordenadas | X é avanço, Y é altura e Z é profundidade. `position` na lógica representa o centro da hitbox; o modelo recebe um deslocamento visual para alinhar suas origens. |
| Terreno | `Terrain` mantém oito `Chunk` lógicos, deixando três atrás do jogador para permitir voltar. Cada chunk tem 40 unidades em X, 10 em Z e espessura de terra de 3 unidades abaixo de cada ponta da superfície. `GreenHillChunkModel` gera as malhas e texturas. |
| Controle | `Input` guarda teclas pressionadas; controladores traduzem esse estado em ações. A entidade interpreta ações e atualiza a física. Regras de movimento não devem depender de Three.js. |
| Colisão | `EntityLogic.checkCollision` usa varredura de segmento contra AABB. `Level` resolve coleta de anéis, contato com hazards, dano e derrota. |
| Pontuação | Saldo de anéis no HUD; ao final, anéis carregados / total coletado e nota de A a F por anéis por minuto. |
| Recursos | Arquivos carregados por URL ficam em `public/assets/`, `public/model-imports/` ou `public/fonts/`. Registrar fonte e licença em `docs/model-credits.md` e `docs/font-credits.md`. |

A explicação completa das responsabilidades e da ordem de atualização está em [arquitetura-engine.md](arquitetura-engine.md). Para a matemática do terreno, consultem [montagem-chunks.md](montagem-chunks.md).

## Estrutura do repositório

```text
index.html                    canvas, HUD, overlay, fontes e créditos
src/main.js                   entrada, loop, HUD, pausa e menus
src/game/
  Game.js, Level.js           partida, estados, anéis, hazards e pontuação
  constants.js                parâmetros de movimento e tempo
  entities/Entity.js          ponte entre lógica e modelo
  logic/                      entrada, controladores, entidades e terreno
  rendering/                  cena, luzes, fundo procedural, modelos, anéis, obstáculos e áudio
public/fonts/                 Bungee e Chakra Petch + licenças OFL
public/model-imports/         modelos e arquivos associados
tests/                        testes Node da lógica e da apresentação
docs/                         guias, relatórios e créditos
```

Instalem dependências na raiz com `npm ci`. Usem `npm run dev` para abrir o Vite na porta 3001, `npm test` para executar os testes Node, `npx eslint src tests` para verificar JavaScript e `npm run build` para gerar `dist/` com o caminho-base do GitHub Pages. O workflow de deploy está em `.github/workflows/deploy.yml`.

## Trilha restante

1. **Demonstração:** gravar o vídeo mostrando movimentação, coleta, dano, derrota de inimigo, espinhos, pausa, vitória e derrota, e vincular o link no README.
2. **Apresentação final:** revisar o vídeo, os créditos de modelos/fontes e o relatório da disciplina.
3. **Melhorias opcionais:** modo infinito selecionável, novos tipos de obstáculo e mais elementos no fundo procedural.

## Critérios de verificação

Testem deslocamento nos dois sentidos, salto repetido, frenagem, pose de agachamento, troca de câmera, pausa, coleta de anéis, dano com e sem saldo, derrota de inimigo ao girar, colisão com espinhos, vitória em 1000 m e reinício. Confiram o cronômetro no HUD e nas telas finais, o saldo de anéis e a tela final com **saldo / total coletado**. Também voltem alguns chunks após avançar e verifiquem que o mapa continua existindo.

No terreno, verifiquem continuidade entre chunks, descarte dos antigos e preservação das texturas nas rampas. Para mudanças de engine, executem `npm test`, `npx eslint src tests` e `npm run build`; depois testem no navegador em ambas as câmeras e redimensionem a janela.

Para aprender o framework, consultem [threejs-guide.md](threejs-guide.md). Mudanças de escopo devem ser registradas aqui antes de serem tratadas como parte obrigatória do jogo.
