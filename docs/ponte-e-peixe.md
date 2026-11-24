# Ponte de madeira e peixe saltador

## Visao geral

O jogo agora possui um tipo de chunk chamado `bridge`. Ele representa uma ponte de corda sobre a agua e pode conter peixes que saltam de baixo para cima, passando por trás do tabuleiro como nos jogos 2D originais.

A implementacao segue o mesmo padrao dos outros chunks: estrategia de relevo, registro em `Terrain.CHUNK_TYPES`, modelo visual proprio e geracao de entidades pelo `Level`.

## Chunk de ponte

### Logica

- A estrategia `bridge` fica em `src/game/logic/terrain/Chunk.js`.
- Ela e plana: `heightAt` retorna `baseY` e a normal e vertical.
- O chunk guarda `chunkTypeName = 'bridge'`.
- `Terrain` inclui `"bridge"` em `CHUNK_TYPES`, entao ele pode aparecer na geracao aleatoria.
- Para manter a pista perto do nivel da agua, `Terrain._randomChunkType(baseY)` escolhe rampas com vies:
  - se `baseY > 4`, prioriza `flat`, `ramp_down` e `bridge`;
  - se `baseY < -4`, prioriza `flat`, `ramp_up` e `bridge`;
  - caso contrario, escolhe entre todos os tipos.

### Visual

- O modelo fica em `src/game/rendering/terrain/BridgeChunkModel.js`.
- A ponte e uma passarela de corda sobre a agua: troncos de madeira horizontais e mais grossos, perpendiculares ao caminho, atravessam toda a largura da pista.
- O tabuleiro tem uma curvatura de 0.75 unidades no centro. `chunkStrategies.bridge.heightAt` segue a mesma curva, entao a colisao do Sonic acompanha os troncos e ele nao parece flutuar.
- Cordas na altura do tabuleiro atravessam os troncos e os mantem unidos; nao ha guarda-corpos.
- A ponte e mais estreita que o chunk de terra, com 7 unidades de largura.
- Postes de madeira com faixas douradas nas duas bordas de cada ponta prendem a ponte as margens, com cordas diagonais ate o tabuleiro. Os postes descem ate a linha d'agua, para sustentar tambem quando dois chunks de ponte se conectam.
- Um único tronco é omitido em cada ponto de salto, formando um vão estreito apenas largo o suficiente para o peixe. As cordas seguem cobrindo esse vão, então o Sonic tem algo sob os pés ao passar.
- As cores usam `vertexColors` em tons de madeira e corda, com `flatShading`. O material e compartilhado.
- `WATER_Y` fica em `src/game/constants.js` e define a linha d'agua usada pelo fundo e pelo salto do peixe.
- As constantes `FISH_SPAWN_X` e `FISH_SPAWN_Z` definem onde os peixes aparecem.
- O modelo remove a geometria ao ser destruido, como os outros chunks.

## Peixe saltador

### Logica

- A classe `Fish` fica em `src/game/logic/entities/Fish.js`.
- O peixe e um inimigo com gravidade propria e movimento vertical ciclico.
- `FISH.jumpSpeed` e `FISH.spawnDepth` ficam em `src/game/constants.js`, junto com os outros ajustes.
- Ele comeca logo abaixo da linha d'agua (`WATER_Y`) e salta ate passar acima do tabuleiro.
- O `Level` cria peixes apenas em chunks do tipo `bridge`.
- Os peixes sao gerados nos offsets definidos por `FISH_SPAWN_X` e na faixa `FISH_SPAWN_Z`.
- Cada peixe e tratado como hazard: pode ser derrotado ao pular ou girar sobre ele, e causa dano ao toque.
- O hitbox e local ao peixe, coerente com a posicao dele no espaco; nao ha dano em um plano inteiro.
- Peixes atras do primeiro chunk ativo sao removidos, como os outros hazards.

### Visual

- O modelo fica em `src/game/rendering/entities/FishModel.js`.
- O peixe usa o GLB do Chopper de Sonic Generations, creditado em `index.html` e em `public/model-imports/chopper-sonic-generations-ripped/` (CC BY 4.0).
- O GLB e carregado de forma assincrona com `GLTFLoader`, uma vez, e clonado para cada peixe.
- O modelo e inclinado para ficar na vertical, com a cabeca para cima, e escalado para caber no alcapao.
- O GLB nao traz animacoes; o codigo aplica um leve balanceio para sugerir o movimento da cauda e um morph target que abre a boca devagar, segura e fecha com um estalo, como no Chopper original.
- O peixe foi ampliado e o alcapao do tabuleiro foi alargado para acomodá-lo.
- O `dispose()` libera apenas a caixa de depuracao, exclusiva de cada instancia.

## Geracao no Level

- `Level` mantem `bridgeFishLayouts` para saber quais chunks de ponte ja geraram peixes.
- `spawnBridgeFish()` processa chunks ativos e evita duplicacao.
- `fillBridgeFish()` cria peixes, define controlador estatico e adiciona a listas de entidades.
- A geracao e chamada em `buildLevel` e em `update`, de forma assincrona, sem bloquear o quadro.
- O `Level` tambem remove peixes atras do limite esquerdo, junto com os outros hazards.

## Testes

- `tests/chunk.test.js` valida reciclagem, quantidade de chunks e compartilhamento de materiais por tipo. A comparacao agrupa por `chunkTypeName` e aceita listas de tamanhos diferentes, porque a ponte so usa madeira.
- `tests/fish-bridge.test.js` valida o arco do salto, o tabuleiro contínuo, a curvatura da ponte, os postes ate a agua e as dimensões do peixe.
- Os comandos usam Bun: `bun test`, `bunx eslint` e `bun run build`.
