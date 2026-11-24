# Ponte de madeira e peixe saltador

## Visao geral

O jogo agora possui um tipo de chunk chamado `bridge`. Ele representa uma ponte de madeira sobre a agua e pode conter peixes que saltam de baixo para cima, passando por pequenos alcapoes na pista.

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
- A ponte e formada por:
  - tabuleiro solido de madeira, com uma faixa central continua onde o Sonic corre;
  - pequenos alcapoes nos pontos definidos por `FISH_HOLE_X`, por onde os peixes saltam;
  - vigas abaixo do tabuleiro, entre os alcapoes;
  - guarda-corpos com duas travessas e postes igualmente espaçados nas bordas;
  - pilares que descem ate a linha d'agua.
- As cores das tabuas usam `vertexColors`, com tons de madeira. O material compartilhado usa `flatShading` e nao reutiliza a textura da grama.
- `WATER_Y` fica em `src/game/constants.js` e e usado tanto pelo fundo quanto pelos pilares.
- As constantes `FISH_HOLE_X` e `FISH_HOLE_Z` definem onde os peixes aparecem e onde existem os alcapoes.
- O modelo remove a geometria ao ser destruido, como os outros chunks; o material e compartilhado.

## Peixe saltador

### Logica

- A classe `Fish` fica em `src/game/logic/entities/Fish.js`.
- O peixe e um inimigo com gravidade propria e movimento vertical ciclico.
- `FISH.jumpSpeed` e `FISH.spawnDepth` ficam em `src/game/constants.js`, junto com os outros ajustes.
- Ele comeca `FISH.spawnDepth` unidades abaixo da ponte e salta ate passar acima dela.
- O `Level` cria peixes apenas em chunks do tipo `bridge`.
- Os peixes sao gerados nos offsets definidos por `FISH_HOLE_X` e na faixa `FISH_HOLE_Z`.
- Cada peixe e tratado como hazard: pode ser derrotado ao pular ou girar sobre ele, e causa dano ao toque.
- O hitbox e local ao peixe, coerente com a posicao dele no espaco; nao ha dano em um plano inteiro.
- Peixes atras do primeiro chunk ativo sao removidos, como os outros hazards.

### Visual

- O modelo fica em `src/game/rendering/entities/FishModel.js`.
- O peixe e low poly facetado: corpo com secoes transversais e duas faixas creme, cauda bifurcada com pivô, nadadeira dorsal e nadadeira pelvica, olhos com esclera e pupila.
- A cor verde-azulada tropical contrasta com a madeira marrom da ponte.
- O modelo e escalado para 0.65 e fica na vertical, para indicar o salto de baixo para cima.
- A cauda anima durante o salto.
- O modelo e clonado a partir de um template compartilhado. O `dispose()` libera apenas a caixa de depuracao, que e exclusiva de cada instancia.

## Geracao no Level

- `Level` mantem `bridgeFishLayouts` para saber quais chunks de ponte ja geraram peixes.
- `spawnBridgeFish()` processa chunks ativos e evita duplicacao.
- `fillBridgeFish()` cria peixes, define controlador estatico e adiciona a listas de entidades.
- A geracao e chamada em `buildLevel` e em `update`, de forma assincrona, sem bloquear o quadro.
- O `Level` tambem remove peixes atras do limite esquerdo, junto com os outros hazards.

## Testes

- `tests/chunk.test.js` valida reciclagem, quantidade de chunks e compartilhamento de materiais por tipo. A comparacao agrupa por `chunkTypeName` e aceita listas de tamanhos diferentes, porque a ponte so usa madeira.
- `tests/fish-bridge.test.js` valida o arco do salto, os alcapoes alinhados com os peixes, os pilares ate a agua e o peixe cabendo no alcapao.
- Os comandos usam Bun: `bun test`, `bunx eslint` e `bun run build`.
