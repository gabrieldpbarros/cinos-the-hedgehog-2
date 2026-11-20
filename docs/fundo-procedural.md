# Fundo procedural, água e shaders

Este documento explica como o cenário atrás da pista é construído: céu, nuvens, montanhas, platôs, água, espuma, o penhasco do início e a terra profunda dos chunks. Tudo é gerado em código; não há imagem de skybox. O código fica em `src/game/rendering/background/Backdrop.js` e `src/game/rendering/terrain/`.

## Ideias principais

1. **Distância real gera o paralaxe.** Cada camada fica a uma distância fixa atrás da pista (Z negativo). A câmera em perspectiva desloca menos o que está longe, então o efeito de profundidade dos jogos 2D de rolagem lateral aparece sozinho, sem multiplicar velocidades por camada.
2. **Camadas repetem sem emenda.** Cada fileira é gerada uma vez para um trecho de largura `width`. Cópias do mesmo trecho (mesma geometria e materiais) são posicionadas em volta da câmera: uma atrás e três à frente (`TILE_OFFSETS = [-1, 0, 1, 2, 3]`), porque a câmera oblíqua olha bem adiante na pista.
3. **Mesmo estilo do chão.** Os platôs usam exatamente os materiais da pista (`getTerrainMaterials()`): terra xadrez marrom, grama listrada e uma aba de grama. O fundo "conversa" com o chão em que o Sonic corre.
4. **Low poly de verdade.** Cada triângulo tem uma cor só. Onde não há iluminação da cena (céu, montanhas, nuvens), a luz é calculada uma vez e gravada nas cores dos vértices; na água, a normal de cada faceta é calculada no shader.
5. **Determinístico.** Um gerador com semente (`seededRandom`, algoritmo mulberry32) decide alturas, posições, árvores e nuvens. O cenário é o mesmo a cada partida, e os testes podem verificar valores exatos.

## Camadas, de trás para frente

| Camada | Classe | Distância (Z) | O que é |
| --- | --- | --- | --- |
| Céu | `SkyDome` | esfera de raio 450 centrada na câmera | Gradiente azul → horizonte → azul-claro abaixo. |
| Nuvens | `CloudLayer` | −345 | Icosaedros achatados e agrupados que derivam devagar. |
| Montanhas | `RidgeLayer` | −330 | Cordilheira facetada lilás-azulada, bem desbotada. |
| Colinas | `RidgeLayer` | −275 | Colinas verdes facetadas, parcialmente desbotadas. |
| Ilhas | `MesaLayer` | −195 a −245 | Platôs grandes com árvores; a névoa os desbota. |
| Platôs médios | `MesaLayer` | −95 a −135 | Platôs com xadrez e grama da pista. |
| Platôs próximos | `MesaLayer` | −24 a −62 | Platôs menores, logo atrás da pista. |
| Água | `WaterPlane` | +120 a −640 | Superfície animada, também na frente e sob a pista. |

`Backdrop` monta tudo isso. A cada quadro, `SceneView.sync()` chama `backdrop.advance(dt)` (tempo da água e deriva das nuvens) e `SceneView.render()` chama `backdrop.follow(câmeraAtiva, alturaDoTerreno)` antes de desenhar. Assim o fundo acompanha qualquer uma das duas câmeras.

### Acompanhando a câmera

- **X:** `follow()` calcula em qual trecho a câmera está (`Math.floor(x / width)`) e reposiciona as cópias. Como o trecho termina exatamente como começa, a troca é invisível.
- **Y:** as camadas sobem e descem com a altura do terreno sob o Sonic, para o fundo não sumir em rampas longas. Montanhas e colinas usam fator 0,96–0,98 (um leve paralaxe vertical); água e platôs usam fator 1, para a espuma ficar sempre na linha d'água.
- **Céu:** a esfera é recentrada na câmera a cada quadro, então nunca se chega perto da "parede" do céu.

## Céu (`SkyDome`)

Uma esfera com `side: BackSide` (vista por dentro), `depthTest` e `depthWrite` desligados e `renderOrder = -1`: é desenhada primeiro e tudo aparece na frente dela. O shader usa a direção de cada ponto da esfera:

```glsl
float h = vDirection.y;               // -1 (para baixo) a 1 (zênite)
vec3 color = h > 0.0
  ? mix(horizon, top, pow(smoothstep(0.0, 1.0, h), 0.55))
  : mix(horizon, bottom, smoothstep(0.0, 0.25, -h));
```

O expoente 0,55 deixa o azul forte subir rápido, mantendo só uma faixa clara perto do horizonte. As cores vêm de `PALETTE`; `THREE.Color` as converte para espaço linear, e `#include <colorspace_fragment>` converte de volta para sRGB na saída.

## Facetas "assadas" (`bakeFacets`)

Montanhas, colinas e nuvens usam `MeshBasicMaterial` (sem luz) com cores por vértice. Para cada triângulo:

```
luz       = 1 − shade + shade · max(0, normal · LIGHT)   // LIGHT = luz fixa, de cima e da frente
altura    = 0,85 + 0,15 · (altura do triângulo normalizada)  // base um pouco mais escura
cor final = mix(cor base · luz · altura, cor do horizonte, haze)
```

A geometria é convertida para não indexada, para que os três vértices de cada triângulo tenham a mesma normal e a mesma cor: é isso que dá o visual facetado. O `haze` imita a perspectiva aérea: quanto mais longe, mais a cor puxa para o horizonte. Como a luz já está nas cores, o fundo não fica estourado nem escuro quando as luzes da pista mudam.

### Cordilheiras (`RidgeLayer`)

Cada coluna tem três pontos: base (frente, y = 0), meio (deslocado em X e Z por um "lean" aleatório, na metade da altura) e crista (fundo, altura sorteada). As alturas alternam picos e vales. Entre duas colunas saem quatro triângulos (base→meio e meio→crista). O deslocamento do meio cria facetas com inclinações diferentes. A última coluna reusa a altura da primeira, por isso o trecho se emenda consigo mesmo.

## Platôs e árvores (`MesaLayer`)

- **Corpo:** `CylinderGeometry` com 6 a 9 lados (o número baixo de lados é o low poly), mais largo na base (1,15 × raio) que no topo (0,92 × raio). Os grupos do cilindro recebem materiais diferentes: lateral = terra, tampa de cima = grama.
- **Aba de grama:** um segundo cilindro curto e um pouco mais largo que o topo, com a lateral em `grassEdge`, imitando a borda de grama da pista.
- **UV em unidades do mundo:** `cylinderWorldUVs` multiplica as UVs pela circunferência e pela altura, para os quadrados terem 4 u e as listras 2,9 u, iguais aos da pista.
- **Árvores:** tronco de 5 lados com copa de icosaedros (redonda) ou dois cones (pinheiro), com `flatShading`.
- **Espuma:** um `RingGeometry` com o mesmo número de lados do platô, na altura da água. O raio é o do cone naquela altura: `raio · (1,15 + (0,92 − 1,15) · fração)`.
- **Sem emenda:** nenhum platô cruza a borda do trecho (`x ± 1,15 × raio` fica dentro de `[0, width]`), então as cópias nunca se sobrepõem.

Os platôs usam `MeshStandardMaterial` da pista, iluminados pelas mesmas luzes. A névoa da cena (`THREE.Fog`, cor do horizonte, de 110 a 430 u) desbota os distantes e também o fim da pista na câmera oblíqua. Céu, nuvens, montanhas e água têm `fog: false`, porque já trazem seu próprio desbotamento.

## Água (`WaterPlane`)

### Malha

Uma grade em XZ com colunas a cada 3 u (`WaterPlane.CELL`) e linhas que se espaçam conforme a distância (`t^1,7`): densa perto da pista, onde as ondas aparecem, e esparsa no horizonte. Com 1400 × 760 u, são cerca de 42 mil vértices. Os triângulos são montados virados para cima (+Y). Com a ordem invertida, a face ficaria virada para baixo e a GPU a descartaria (back-face culling).

A malha acompanha a câmera em X **em passos de uma célula**. Se andasse continuamente, os vértices deslizariam por baixo das ondas e a superfície pareceria "nadar".

### Vertex shader: ondas

```glsl
float wave(vec2 p) {                          // p = posição no mundo (x, z)
  return 0.28 * sin(p.x * 0.21 + time * 1.3)
       + 0.18 * sin(p.y * 0.37 - time * 1.1 + p.x * 0.07)
       + 0.10 * sin((p.x + p.y) * 0.53 + time * 2.0);
}
world.y += wave(world.xz) * (1.0 - smoothstep(60.0, waveFade, abs(world.z)));
```

A soma de três senos com frequências e direções diferentes evita um padrão repetitivo. As ondas são calculadas na **posição do mundo**, não na da malha, por isso o padrão fica parado no lugar enquanto a malha anda. Longe da pista a amplitude vai a zero, porque facetas menores que um pixel só gerariam cintilação.

### Fragment shader: facetas, cor e reflexos

1. **Normal da faceta pelas derivadas:**
   ```glsl
   vec3 normal = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
   ```
   `dFdx`/`dFdy` dão a variação da posição entre pixels vizinhos. Dentro de um triângulo essa variação é constante, então o produto vetorial é a normal **do triângulo**. Cada faceta recebe um tom só, sem precisar duplicar vértices.
2. **Cor por distância:** azul mais escuro perto da pista (`waterNear`), clareando com `pow(distância, 0,6)` até a cor do céu abaixo do horizonte (`skyBottom`). Assim a água se funde com o céu.
3. **Sombreamento:** `cor *= 0,74 + 0,42 · max(normal · luz, 0)`.
4. **Reflexos (glints):** ruído de valor 2D (`noise`, com `hash` por célula e interpolação suave) multiplicado por uma segunda oitava deslocada no tempo. As coordenadas são esticadas em X (`x · 0,05` contra `z · 0,85`), o que gera traços horizontais. Um `step(0,43, …)` dá bordas duras, no estilo dos reflexos em pixel art. O padrão deriva com `time` e enfraquece com a distância.

### Espuma

Duas faixas brancas semitransparentes (`opacity 0,85`, `depthWrite: false`) ao longo das laterais da pista (z = ±5,45), filhas da malha da água para acompanhá-la, e os anéis na base de cada platô. Ficam 0,18–0,2 u acima do nível da água, o que dá a sensação de "lamber" a margem quando as ondas sobem.

## Penhasco do início e terra profunda

- **`StartCliffModel`:** um bloco de terra xadrez com tampa e aba de grama, encostado no início do primeiro chunk ativo. Tem 7 u acima da pista; o pulo do Sonic chega a cerca de 4 u (5,5 u contando o corpo). As UVs são recalculadas a partir da posição no mundo a cada reposicionamento, para o xadrez continuar alinhado com o da pista. `TerrainModel` o move quando os chunks são reciclados. Em `Level`, o limite esquerdo do Sonic é a face do penhasco mais metade da largura dele.
- **`Chunk.soilDepth = 60`:** a terra de cada chunk desce até bem abaixo da água, então a câmera oblíqua vê paredões de xadrez em vez de vazio sob a pista.

## Cores

Medimos as cores na tela contra as cores de origem e o jogo saía desbotado por três motivos. As correções:

1. **Luzes na escala do three atual.** Desde o r155, uma luz de intensidade 1 entrega cerca de 1/π da cor difusa. O ambiente branco 0,5 com sol 2,5 deixava tudo mais escuro e barrento que a textura. Agora `SceneLighting` usa uma `HemisphereLight` (céu `#e3f2ff` por cima, grama `#86a84e` por baixo, intensidade 1,25) e o sol `#fff3dc` com intensidade 2,9. As faces iluminadas ficam perto da cor da textura, e as sombras ganham tom de céu e de grama em vez de cinza.
2. **Sem preenchimento azul puro.** A antiga luz `#0066ff` × 1,5 somava azul a tudo: os verdes e marrons acinzentavam e o Sonic puxava para o roxo. Um teste garante que nenhuma luz é um tom saturado de um só canal.
3. **Paleta mais viva.** `TERRAIN_COLORS` em `GreenHillChunkModel.js` traz grama `#349040`/`#53b64d`, terra `#ad642d`/`#dd9a51` e a aba `#36923e`: mais saturadas que a paleta original, mas um pouco abaixo do primeiro ajuste, para não ficarem gritantes.

**Azul do Sonic.** A textura do modelo é um azul-marinho escuro (`#15248b`). `boostSonicBlue()`, em `SonicModel.js`, injeta no shader do material `sonic_gm_body`, logo após a leitura da textura (`#include <map_fragment>`):

```glsl
float blueness = smoothstep(0.3, 0.6, (base.b - max(base.r, base.g)) / max(base.b, 1e-4));
vec3 sonicBlue = alvo * (base.b / 0.258);   // alvo = #1a52f0; 0,258 = azul linear mediano da textura
diffuseColor.rgb = mix(base, sonicBlue, blueness);
```

`blueness` vale 1 onde o azul domina e 0 em pele, olhos, sapatos e luvas, que ficam intactos. Multiplicar o alvo pela razão `base.b / 0,258` preserva o sombreamento pintado na textura. No primeiro ajuste (alvo `#1e5ae6`), o matiz medido do Sonic passou de 236° (roxeado) para 220° (azul). O alvo atual, `#1a52f0`, é um azul mais intenso, e a máscara começa um pouco antes (0,3 em vez de 0,35), para pegar também os azuis mais escuros da textura.

## Como ajustar

| Quero mudar… | Onde |
| --- | --- |
| Cores do céu, da água, da espuma e dos reflexos | `PALETTE` em `Backdrop.js` |
| Quantidade, posição e tamanho de platôs, montanhas e nuvens | construtor de `Backdrop` (parâmetros de cada camada) |
| Forma e velocidade das ondas | função `wave()` em `WATER_VERTEX` |
| Quantidade de reflexos | o limiar em `step(0.43, …)` em `WATER_FRAGMENT` (maior = menos reflexos) |
| Contraste das facetas da água | `0.74 + 0.42 * …` em `WATER_FRAGMENT` |
| Distância da névoa | `scene.fog` no construtor de `Backdrop` |
| Altura e tamanho do penhasco | `CLIFF` em `StartCliffModel.js` |
| Intensidade e cor das luzes | `LIGHTING` em `SceneLighting.js` |
| Cores da grama e da terra | `TERRAIN_COLORS` em `GreenHillChunkModel.js` |
| Tom do azul do Sonic | `SONIC_BLUE` em `SonicModel.js` |

Sementes diferentes (`seed`) geram outro arranjo com o mesmo estilo.

## Testes

`tests/backdrop.test.js` e `tests/chunk.test.js` verificam:

- semente determinística;
- emenda perfeita das cordilheiras e cobertura de cópias em volta da câmera;
- uma cor por triângulo nas facetas assadas;
- nuvens sempre dentro do vão em volta da câmera;
- platôs dentro do trecho e usando os materiais da pista;
- anéis de espuma planos na linha d'água;
- água animando, andando em células inteiras, com faces para cima e espuma nas laterais;
- penhasco acompanhando o primeiro chunk e mais alto que o pulo;
- terra descendo abaixo da água.

Shaders não rodam no Node. A aparência foi conferida no navegador com as duas câmeras, em 16:9.
