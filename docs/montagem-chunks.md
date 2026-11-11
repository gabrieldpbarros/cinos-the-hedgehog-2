# Cálculo da geometria de um chunk genérico

*Arquivos descritos:* [Chunk.js](../src/game/logic/terrain/Chunk.js), [Terrain.js](../src/game/logic/terrain/Terrain.js), [GreenHillChunkModel.js](../src/game/rendering/terrain/GreenHillChunkModel.js) e [TerrainModel.js](../src/game/rendering/terrain/TerrainModel.js).

## Montagem da classe

Cada chunk mede 40 unidades em X e 10 em Z. A face inferior fica sempre 3 unidades (`soilDepth`) abaixo da superfície em cada extremidade; ela acompanha a inclinação, em vez de ficar fixa em Y = -3. Os valores comuns são definidos por `Chunk.length`, `Chunk.depth` e `Chunk.soilDepth`.

Para construir o `Chunk` lógico, devem ser definidos a coordenada X global de início (`initialX`), a estratégia de relevo (`chunkType`), a altura da superfície nessa coordenada (`baseY`) e a distância acumulada sobre a superfície (`surfaceStart`). O ângulo `theta` é opcional e usa `Chunk.theta` por padrão. Os materiais pertencem ao modelo visual, não ao `Chunk` lógico.
> `initialX` e `surfaceStart` coincidem enquanto o percurso anterior for plano e ambos usarem a mesma origem; após uma rampa, podem diferir.

`Chunk` guarda `endY` e calcula a distância acumulada até o fim da superfície: `surfaceEnd = surfaceStart + Math.hypot(length, rise)`, em que `rise = endY - baseY`. A estratégia fornece `heightAt` e `normalAt`; `getHeightAtX(x)` e `getNormalVector(x)` convertem o X global para o X local antes de consultá-la. A `Mesh` final fica em `GreenHillChunkModel`.
> [!NOTE]
> Enquanto não foi implementado um chunk curvo, o uso da hipotenusa é suficiente para o cálculo.

## Criação do chunk

Dado que o objetivo da generalização em uma classe é facilitar a geração de instâncias aleatórias durante uma *run*, `GreenHillChunkModel.getChunkModel()` utiliza as informações do `Chunk` para gerar **coordenadas locais**, com $\{x: 0 \leq x \leq 40\}$ e $\{z: -5 \leq z \leq 5\}$. Em cada ponta, a base é `altura da superfície - soilDepth`. Atualmente, as faces são construídas a partir das alturas nas duas extremidades; uma curva exigirá pontos intermediários.

A criação da geometria do chunk prevê o uso de pontos para desenhar cada face do poliedro, uma vez que utilizamos a classe `BufferGeometry` do *Three.js*. Cada face é definida da mesma forma em que figuras são definidas em *WebGL*, por meio de triângulos.

Dessa forma, considerando a referência original do chão do jogo, sabemos que todas as faces deverão formar o quadriculado marrom, exceto a face de cima, que deve conter listras de grama.

### Definição de uma face genérica

Utilizamos a função interna `face` de `GreenHillChunkModel` para popular os vetores `positions`, `uvs` e `indices` de acordo com cada coordenada local do modelo.

- `positions`: Contém as coordenadas locais de cada vértice da face;
- `uvs`: Contém as coordenadas da textura correspondentes a cada vértice;
- `indices`: Referencia os vértices que formam cada triângulo.

Em `positions`, definimos os pontos locais da face; a *Mesh* é deslocada para `initialX` depois. `uvs` mapeia a textura nesses pontos; a repetição fora do intervalo de 0 a 1 depende de `RepeatWrapping`. Cada face tem quatro vértices e dois triângulos, com índices `(0, 1, 2)` e `(0, 2, 3)`. O `materialIndex` seleciona terra ou grama para a face.

Por exemplo, para uma face no plano $XY$, podemos definir os pontos:

| Índice |   Vértice   |
| :----- | ----------: |
|   0    | (0, -3, 5)  |
|   1    | (40, -3, 5) |
|   2    | (40, 0, 5)  |
|   3    | (0, 0, 5)   |

Tomando as seguintes transformações para $uv$:

$$
u = \frac{x_0 + x}{4}; \ v = \frac{y}{4},
$$

em que $x_0$ é a coordenada inicial do chunk no eixo $x$ (`initialX`). Assumindo $x_0=0$, temos

| Índice |   Vértice   |     $uv$     |
| :----- | ----------: | -----------: |
|   0    | (0, -3, 5)  |  (0, -0.75)  |
|   1    | (40, -3, 5) |  (10, -0.75) |
|   2    | (40, 0, 5)  |  (10, 0)     |
|   3    | (0, 0, 5)   |  (0, 0)      |

Esse processo se repete para cada uma das seis faces do poliedro, com transformações específicas para cada plano ($XY$, $XZ$ e $YZ$).

No topo, a coordenada horizontal da grama é `u = distância acumulada sobre a superfície / 2.9`. Assim, o padrão acompanha o comprimento da rampa e continua no chunk seguinte; `v = z / 4` atravessa a pista.

### Geometria final

Com os pontos das faces, coordenadas $uv$ e respectivos índices dos pontos das faces, podemos inserir no buffer de geometria os atributos e construir a figura final:

```js
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
geometry.setIndex(indices);
geometry.computeVertexNormals();
```

A partir daí, tratamos como uma geometria comum de *Three.js*, adicionando-a a um `Mesh`. Corrigimos a posição inicial do modelo e o retornamos para o tratador de cena, repetindo o processo para cada chunk criado.

## Lógica de criação

A fim de não sobrecarregar a GPU conforme a progressão do jogo, causada por chunks gerados já ultrapassados há muito pelo jogador, mantemos apenas cinco chunks carregados, destruindo o mais antigo quando é perdido de vista e gerando um novo logo à frente da fila de chunks.

`Terrain` mantém cinco `Chunk` lógicos e sorteia entre plano, subida e descida. Cada novo chunk começa em `lastChunk.initialX + Chunk.length`, recebe `baseY = lastChunk.endY` e `surfaceStart = lastChunk.surfaceEnd`. Quando o jogador alcança o início do terceiro chunk da lista, `Terrain.update(x)` acrescenta um novo e remove o primeiro; um `while` cobre avanços maiores em um quadro. O método retorna os chunks adicionados para `SceneView.updateChunks()`. `TerrainModel` cria as respectivas malhas, remove a malha mais antiga e libera sua geometria, materiais e texturas. A suavização de quinas entre rampas ainda não foi implementada.
