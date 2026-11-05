import { Chunk } from "./logic/terrain/Chunk.js";
import { chunkStrategies } from "./logic/terrain/chunkStrategies.js";

export class Level {
  static CHUNK_TYPES = {
    "flat":      chunkStrategies.flat,
    "ramp_up":   chunkStrategies.rampUp,
    "ramp_down": chunkStrategies.rampDown,
  }

  constructor(finishX = null) { // a definir criterio de vitoria
    this.finishX = finishX;
  }

  buildLevel() {
    this.startPosX = 0;
    this.chunks    = this.createInitialChunks();
    this.startPosY = this.chunks[0].getHeightAtX(this.startPosX);

    this.player = null // adicionar controlador de jogador
  }

  createInitialChunks() {
    const chunks = [];
  
    const getRandomIndex = (ceil) => {
      return Math.floor(Math.random() * ceil);
    }
  
    let surfaceStart = this.startPosX - 10;
    let baseY        = 0;
    for (let i = 0; i < 5; i++) {
      const startX = (this.startPosX - 10) + i * Chunk.length;
      const randomChunkType = () => {
        const keysArray = Object.keys(Level.CHUNK_TYPES);
        const numKeys   = keysArray.length;
  
        return keysArray[getRandomIndex(numKeys)];
      }
  
      const chunk = new Chunk(
        startX,
        Level.CHUNK_TYPES[randomChunkType()],
        baseY,
        surfaceStart,
      );
      chunks.push(chunk);
      baseY        = chunk.endY;
      surfaceStart = chunk.surfaceEnd;
    }
  
    return chunks;
  }
}