# Inimigos e obstáculos

Sistema integrado à `main` junto com anéis, pausa, chegada, pontuação e reinício. A versão original do PR #13 foi portada para a arquitetura atual e ganhou testes próprios.

## Geração

- A fase mantém o Buzz Bomber inicial em X=5, usado para demonstrar a perda de anéis.
- Depois disso, o `Level` gera inimigos e espinhos à frente do jogador, começando em X=14, com espaçamento de 10 a 20 unidades e até 140 unidades de antecedência. A distância maior evita que apareçam no meio da tela na segunda câmera.
- Inimigos voam entre 0,8 e 3,2 unidades acima do terreno; espinhos ficam apoiados na superfície.
- A geração para na linha de chegada e os elementos que ficam para trás do primeiro chunk ativo são removidos da lógica e da cena.
- Antes de confirmar um espinho ou inimigo, o `Level` compara sua AABB com os anéis estáticos ativos; se houver sobreposição, o hazard é descartado. A geração de anéis também ignora posições ocupadas por hazards já existentes.
- O sorteio usa `Math.random` por padrão e pode ser injetado no construtor para testes determinísticos.

## Regras de contato

- Girar/pular sobre um Buzz Bomber derrota o inimigo e aplica um pequeno impulso vertical.
- Encostar em um inimigo sem girar, ou em um espinho, consome todo o saldo de anéis, espalha os anéis e concede 2 segundos de invulnerabilidade.
- Sem saldo de anéis, o contato encerra a partida.
- A coleta de anéis acontece antes do contato com hazards no mesmo quadro, então um anel coletado no mesmo passo conta para a pontuação antes de ser perdido.

## Apresentação

Os espinhos são um modelo procedural (`src/game/rendering/entities/ObstacleModel.js`), sem dependência externa. Geometrias e materiais exclusivos do obstáculo são liberados quando ele sai da cena.

## Verificações

- `npm test`: 67 testes.
- `npx eslint src tests`: sem erros.
- `npm run build`: passa com base `/cinos-the-hedgehog-2/`.
- Navegador: geração inicial mista, derrota de inimigo, dano com anéis, derrota sem anéis, remoção de hazards atrasados e vitória em 1000 m.
