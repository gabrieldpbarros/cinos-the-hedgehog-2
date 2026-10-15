# Guia de estudo de Three.js para o projeto

Este roteiro complementa [as diretrizes do jogo](guidelines.md). A proposta é aprender cada conceito enquanto se produz uma parte demonstrável do projeto. Não é necessário dominar toda a biblioteca antes de começar; concluam uma etapa, expliquem o que ela faz e só então avancem.

## 1. Preparar o ambiente

Leiam a [instalação oficial](https://threejs.org/manual/pages/installation.html) e escolham **uma** forma de usar a biblioteca. Para um projeto em grupo, a opção recomendada pela documentação é instalar Three.js com npm e uma ferramenta de desenvolvimento como Vite; isso registra dependências e facilita importações. CDN com *import map* também funciona para um começo pequeno, desde que biblioteca e complementos usem a mesma versão. Anotem a escolha e os comandos reais de execução no README quando configurarem o projeto. Hoje o repositório ainda não tem `package.json` nem processo de build.

**Exercício:** abrir o projeto por um servidor local e verificar no console que todos os módulos carregaram. Evitem abrir `index.html` diretamente como arquivo, especialmente quando começarem a carregar modelos e texturas.

## 2. Entender o caminho até a imagem

Estudem [fundamentos](https://threejs.org/manual/pages/fundamentals.html), [criação de uma cena](https://threejs.org/manual/pages/creating-a-scene.html) e [hierarquia da cena](https://threejs.org/manual/pages/scenegraph.html). Identifiquem o papel de cada peça:

| Conceito | Papel no nosso jogo |
| --- | --- |
| `Scene` | Reúne pista, personagens, obstáculos e luzes. |
| `PerspectiveCamera` | Define de onde se vê a pista e produz a projeção perspectiva exigida. |
| `WebGLRenderer` | Desenha a cena no canvas. |
| `Geometry` + `Material` + `Mesh` | Definem forma, aparência e objeto visível. |
| `Object3D` e grupos | Permitem organizar partes de um personagem e movê-las juntas. |

**Exercício:** exibir chão e dois objetos simples em profundidades diferentes. Posicionar a câmera de modo que a profundidade seja visível. Conseguir explicar por que um objeto aparece maior ou menor na imagem.

## 3. Movimento e tamanho da tela

O [ciclo de renderização](https://threejs.org/manual/pages/creating-a-scene.html) atualiza a cena e a desenha repetidamente. Diferenciem **atualização das regras** (posição, salto, colisão e distância) de **renderização** (copiar posições para os modelos e desenhar). Baseiem velocidades no tempo decorrido entre quadros; depender de uma quantidade fixa de quadros por segundo faz o jogo mudar de velocidade entre máquinas.

Leiam o guia de [responsividade](https://threejs.org/manual/pages/responsive.html). O tamanho exibido pelo CSS e a resolução interna do canvas são coisas diferentes. Ao mudar o tamanho, ajustem o renderer e a proporção da câmera; atualizem também a matriz de projeção. O `CanvasResizer` existente mostra a ideia de reagir ao tamanho da janela, mas sua implementação atual modifica diretamente o canvas e não trata a câmera. Adaptem o conceito ao Three.js quando essa etapa chegar.

**Exercício:** fazer um objeto avançar e outro saltar. Redimensionar a janela e confirmar que os objetos não ficam achatados e que as duas câmeras futuras poderão usar a proporção correta.

## 4. Câmeras e composição

Leiam [câmeras](https://threejs.org/manual/pages/cameras.html) e a referência de [`PerspectiveCamera`](https://threejs.org/docs/pages/PerspectiveCamera.html). Entendam campo de visão, proporção, planos próximo e distante, posição e ponto observado. Usem inicialmente uma vista lateral com perspectiva; acrescentem uma vista em três quartos e permitam alternar entre elas. Testem se personagem e obstáculos permanecem legíveis nas duas posições.

**Exercício:** alternar a câmera durante uma partida sem reiniciar o estado do jogo. Verificar novamente as duas vistas após redimensionar a janela.

## 5. Luzes, materiais e texturas

Estudem [luzes](https://threejs.org/manual/pages/lights.html) e [texturas](https://threejs.org/manual/pages/textures.html). Materiais básicos podem parecer visíveis sem iluminação; para demonstrar luzes, usem materiais que respondam à luz nos objetos relevantes. Experimentem primeiro uma luz ambiente ou hemisférica e uma direcional ou pontual. Apliquem texturas diferentes à pista e a outro elemento visível. Observem orientação da textura, repetição e carregamento assíncrono.

Sombras podem melhorar a leitura do salto, mas têm custo: deixem sua configuração para depois de a cena estar funcional. O [guia de sombras](https://threejs.org/manual/pages/shadows.html) explica esse custo e como configurar objetos que projetam ou recebem sombra.

**Exercício:** mostrar claramente duas fontes de luz e duas texturas na mesma cena, inclusive após trocar de câmera. Desligar cada luz temporariamente para reconhecer seu efeito.

## 6. Personagens e animação

Comecem com formas provisórias e substituam-nas por modelos quando o jogo já estiver funcionando. O formato [glTF/GLB é recomendado no guia oficial de modelos](https://threejs.org/manual/pages/loading-3d-models.html); o `GLTFLoader` é um complemento importado separadamente. Confiram escala, orientação, origem, materiais e licença de cada arquivo. Se o modelo tiver animações, estudem o [sistema de animação](https://threejs.org/manual/pages/animation-system.html) e o `AnimationMixer` para tocar ações como corrida e salto.

**Exercício:** carregar protagonista e robô, fazê-los acompanhar as posições definidas pelas regras e demonstrar ao menos a animação necessária para compreender a ação. Validem visualmente que ambos são personagens 3D complexos, e não apenas primitivas isoladas.

## 7. Integrar ao jogo sem misturar responsabilidades

Three.js cuida da representação 3D; as regras dos modos distância e infinito pertencem ao projeto. Mantenham fora dos modelos visuais a pontuação, as condições de vitória e derrota, a geração de obstáculos e as decisões de colisão. A cada quadro, atualizem primeiro as regras e depois a apresentação. Consultem [o guia oficial de criação de jogos](https://threejs.org/manual/pages/game.html) como referência de organização, adaptando-o ao escopo pequeno deste projeto.

**Exercício:** fazer os dois modos usarem a mesma cena e os mesmos personagens; somente a condição de encerramento deve mudar. Verificar os critérios de conclusão descritos em [guidelines.md](guidelines.md).

## Ordem de estudo e diagnóstico

Nas semanas 1 e 2, priorizem as etapas 1 a 3; nas semanas 3 a 6, avancem pelas etapas 4 a 7 conforme as entregas. Ao encontrar uma tela vazia, consultem primeiro o console e a rede do navegador; depois verifiquem se a câmera aponta para os objetos, se eles estão dentro dos planos visíveis e se os recursos foram carregados. Se um objeto estiver preto ou invisível, confiram material e iluminação. Se a cena parecer esticada, confiram tamanho do renderer e proporção da câmera.

Mantenham uma pequena demonstração funcional após cada exercício. Ela serve tanto para aprender quanto para comprovar o avanço semanal do projeto.

## Referências para consulta

Estas páginas são da documentação oficial do Three.js. Sigam a ordem da tabela para o primeiro contato; depois usem a coluna **Quando consultar** para localizar uma dúvida específica. As páginas de manual ensinam conceitos com exemplos, enquanto as referências de API detalham propriedades e métodos.

| Ordem | Referência | Quando consultar |
| --- | --- | --- |
| 1 | [Instalação](https://threejs.org/manual/pages/installation.html) | Escolher npm/Vite ou CDN e configurar o servidor local. |
| 2 | [Fundamentos](https://threejs.org/manual/pages/fundamentals.html) | Entender cena, objetos, malhas, materiais e renderização. |
| 3 | [Criando uma cena](https://threejs.org/manual/pages/creating-a-scene.html) | Montar a primeira câmera, o renderer e o ciclo de animação. |
| 4 | [Hierarquia da cena](https://threejs.org/manual/pages/scenegraph.html) | Agrupar partes e posicionar personagens e obstáculos. |
| 5 | [Design responsivo](https://threejs.org/manual/pages/responsive.html) | Ajustar canvas e projeção após mudanças de tamanho. |
| 6 | [Câmeras](https://threejs.org/manual/pages/cameras.html) e [`PerspectiveCamera`](https://threejs.org/docs/pages/PerspectiveCamera.html) | Criar e ajustar as duas vistas em perspectiva. |
| 7 | [Luzes](https://threejs.org/manual/pages/lights.html), [texturas](https://threejs.org/manual/pages/textures.html) e [sombras](https://threejs.org/manual/pages/shadows.html) | Cumprir os requisitos visuais e investigar aparência ou desempenho. |
| 8 | [Carregando modelos 3D](https://threejs.org/manual/pages/loading-3d-models.html) e [`GLTFLoader`](https://threejs.org/docs/pages/GLTFLoader.html) | Importar personagens em glTF/GLB e resolver falhas de carregamento. |
| 9 | [Sistema de animação](https://threejs.org/manual/pages/animation-system.html) e [`AnimationMixer`](https://threejs.org/docs/pages/AnimationMixer.html) | Reproduzir corrida, salto e animações do robô. |
| 10 | [Criando um jogo](https://threejs.org/manual/pages/game.html) | Estudar uma integração maior depois que a cena básica funcionar. |

Se um exemplo da internet divergir dessas páginas, verifiquem a versão de Three.js usada pelo projeto antes de adaptá-lo. Para investigar um objeto específico, pesquisem seu nome na [referência de API](https://threejs.org/docs/) e confiram os parâmetros e métodos da versão instalada.
