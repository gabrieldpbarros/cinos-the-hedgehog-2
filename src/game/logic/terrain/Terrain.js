import { Chunk, chunkStrategies } from "./Chunk.js";

export class Terrain {
  static CHUNK_TYPES = {
    "flat":      chunkStrategies.flat,
    "ramp_up":   chunkStrategies.rampUp,
    "ramp_down": chunkStrategies.rampDown,
    "bridge":    chunkStrategies.bridge,
  }
  static INITIAL_CHUNKS = 8;
  // Mantém três chunks atrás do jogador para permitir voltar na fase.
  static RECYCLE_INDEX = 4;

  constructor(startPosX) {
    this.startPosX = startPosX;
    this.chunks = this.createInitialChunks();
  }

  createInitialChunks() {
    const chunks = [];
  
    const getRandomIndex = (ceil) => {
      return Math.floor(Math.random() * ceil);
    }
  
    let surfaceStart = this.startPosX - 10;
    let baseY        = 0;
    for (let i = 0; i < Terrain.INITIAL_CHUNKS; i++) {
      const startX = (this.startPosX - 10) + i * Chunk.length;
      const randomChunkType = () => {
        const keysArray = Object.keys(Terrain.CHUNK_TYPES);
        const numKeys   = keysArray.length;
  
        return keysArray[getRandomIndex(numKeys)];
      }
  
      const chunk = new Chunk(
        startX,
        Terrain.CHUNK_TYPES[randomChunkType()],
        baseY,
        surfaceStart,
      );
      chunks.push(chunk);
      baseY        = chunk.endY;
      surfaceStart = chunk.surfaceEnd;
    }
  
    return chunks;
  }

  _appendNewChunk() {
    const lastChunk  = this.chunks.at(-1);
    let startX       = lastChunk.initialX + Chunk.length;
    let baseY        = lastChunk.endY;
    let surfaceStart = lastChunk.surfaceEnd;

    const randomChunkType = () => this._randomChunkType(baseY);

    const chunk = new Chunk(
      startX,
      Terrain.CHUNK_TYPES[randomChunkType()],
      baseY,
      surfaceStart,
    );

    this.chunks.push(chunk);
    return chunk;
  }

  _destroyFirstChunk() {
    this.chunks.shift();
  }

  _randomChunkType(baseY) {
    let candidates = Object.keys(Terrain.CHUNK_TYPES);
    if (baseY > 4) {
      candidates = candidates.filter((key) => key === 'flat' || key === 'ramp_down' || key === 'bridge');
    } else if (baseY < -4) {
      candidates = candidates.filter((key) => key === 'flat' || key === 'ramp_up' || key === 'bridge');
    }
    if (candidates.length === 0) candidates = Object.keys(Terrain.CHUNK_TYPES);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  getHeightAt(x) {
    for (let chunk of this.chunks) {
      let initialX = chunk.initialX;

      if (x >= initialX && x <= initialX + Chunk.length)
        return chunk.getHeightAtX(x);
    }

    return null;
  }

  getNormalVectorAt(x) {
    for (let chunk of this.chunks) {
      let initialX = chunk.initialX;

      if (x >= initialX && x <= initialX + Chunk.length)
        return chunk.getNormalVector(x);
    }
  }

  update(x) {
    const added = [];
    while (x >= this.chunks[Terrain.RECYCLE_INDEX].initialX) {
      added.push(this._appendNewChunk());
      this._destroyFirstChunk();
    }
    return added;
  }
}
