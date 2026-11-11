# Diretrizes e trilha do jogo

## Objetivo e estado atual

O projeto é um jogo 3D de corrida inspirado no protótipo feito em Scratch e na estética de Green Hill. O Sonic pode andar nos dois sentidos, acelerar, frear e pular; a distância percorrida aparece no HUD. Tocar o BuzzBomber causa derrota e a tecla Espaço reinicia a página. Há duas câmeras em perspectiva, luz ambiente e duas luzes direcionais, terreno texturizado e modelos 3D para Sonic e BuzzBomber.

Ainda faltam o modo com distância-alvo e vitória, o modo infinito selecionável, a geração de obstáculos ao longo do percurso e a apresentação final. O estado inicial `menu` é usado apenas durante o carregamento; pausa e vitória constam como possibilidades no código, mas não têm fluxo implementado. Não descrevam esses itens como concluídos nas entregas.

## Decisões de projeto

| Tema | Diretriz atual |
| --- | --- |
| Tecnologia | Three.js com Vite. `src/main.js` inicia o jogo e o loop; `Game` coordena regras, nível e cena. |
| Coordenadas | X é avanço, Y é altura e Z é profundidade. `position` na lógica representa o centro da hitbox; o modelo recebe um deslocamento visual para alinhar suas origens. |
| Terreno | `Terrain` guarda cinco `Chunk` lógicos. Cada chunk tem 40 unidades em X, 10 em Z e espessura de terra de 3 unidades abaixo de cada ponta da superfície. `GreenHillChunkModel` gera as malhas e texturas. |
| Controle | `Input` guarda teclas pressionadas; controladores traduzem esse estado em ações. A entidade interpreta ações e atualiza a física. Regras de movimento não devem depender de Three.js. |
| Colisão | `EntityLogic` calcula sobreposição de hitboxes retangulares por eixo. `Entity` sincroniza dimensões lógicas e caixa visual de depuração. A colisão Sonic–BuzzBomber é verificada diretamente por `Game`. |
| Recursos | Arquivos carregados por URL ficam em `public/assets/` ou `public/model-imports/`. Registrar fonte e licença de modelos externos em `docs/model-credits.md` e manter o crédito visível quando necessário. |

A explicação completa das responsabilidades e da ordem de atualização está em [arquitetura-engine.md](arquitetura-engine.md). Para a matemática do terreno, consultem [montagem-chunks.md](montagem-chunks.md).

## Estrutura do repositório

```text
index.html                    canvas, HUD, overlay e créditos
src/main.js                   entrada da aplicação, relógio e loop
src/game/
  Game.js, Level.js           partida, nível e integração
  constants.js                parâmetros de movimento e tempo
  entities/Entity.js          ponte entre lógica e modelo
  logic/                      entrada, controladores, entidades e terreno
  rendering/                  cena, luzes, modelos e geometria do terreno
public/assets/               skybox temporária
public/model-imports/         modelos e arquivos associados
tests/                        testes Node da lógica e das animações
docs/                         guias, relatórios e créditos
```

Instalem dependências na raiz com `npm ci`. Usem `npm run dev` para abrir o Vite na porta 3001, `npm test` para executar os testes Node, `npx eslint src tests` para verificar JavaScript e `npm run build` para gerar `dist/` com o caminho-base do GitHub Pages. O workflow de deploy está em `.github/workflows/deploy.yml`.

## Trilha restante

1. **Fechar o ciclo de partida:** oferecer escolha entre modo distância e infinito. No primeiro, `Game` recebe uma meta e conclui a partida ao alcançá-la; no segundo, continua até uma derrota. Manter a distância como pontuação em ambos.
2. **Completar os obstáculos:** gerar inimigos ou espinhos ao longo da pista com espaçamento que permita reagir. Validar colisão e posição em rampas. O BuzzBomber atual é uma instância fixa de teste.
3. **Revisar experiência e apresentação:** mostrar vitória, derrota e reinício sem estados ambíguos; conferir animações, câmeras, sombras e legibilidade dos obstáculos. Substituir a skybox temporária se houver tempo.
4. **Preparar a entrega:** executar testes, ESLint e build; testar no navegador em ambas as câmeras, redimensionar a janela e percorrer rampas. Atualizar créditos, relatório e evidências em `docs/`.

Cada entrega parcial deve partir de uma versão executável. Reduzam variedade de cenários e efeitos antes de comprometer os requisitos obrigatórios: dois personagens complexos, duas câmeras, projeção perspectiva, múltiplas luzes e texturas, jogabilidade, pontuação e conclusão de partida.

## Critérios de verificação

Testem deslocamento nos dois sentidos, salto repetido, frenagem, colisão com o BuzzBomber, derrota e reinício. Confirmem que a hitbox do Sonic diminui apenas em altura durante `Spin`, que a do BuzzBomber é mais estreita no eixo X e que as caixas de depuração correspondem às dimensões usadas na colisão. No terreno, verifiquem continuidade entre chunks, descarte dos antigos e preservação das texturas nas rampas. Depois de implementar os modos, acrescentem testes para vitória na distância-alvo e ausência de vitória no infinito.

Para aprender o framework, consultem [threejs-guide.md](threejs-guide.md). Mudanças de escopo devem ser registradas aqui antes de serem tratadas como parte obrigatória do jogo.
