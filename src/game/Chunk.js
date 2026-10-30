export class Chunk {
  static length = 40;    // X 
  static depth = 10;     // Z
  static soilDepth = 3;  // Y (0 a -soilDepth)
  static theta = 0.05;

  constructor(
    initialX,
    chunkType,
    baseY,
    surfaceStart = initialX,
    theta = Chunk.theta,
  ) {
    this.makeChunk(initialX, chunkType, baseY, surfaceStart, theta);
  }

  makeChunk(
    initialX,
    chunkType,
    baseY,
    surfaceStart = initialX,
    theta = Chunk.theta,
  ) {
    this.initialX = initialX;         // posicao global do inicio do chunk
    this.chunkType = chunkType;       // tipo do chunk (reto, rampa, curva, ...)
    this.baseY = baseY;               // altura da superficie no inicio do chunk
    this.theta = theta;
    this.surfaceStart = surfaceStart; // comprimento da superficie

    if (typeof chunkType?.heightAt !== 'function') {
      throw new TypeError('Chunk type must define heightAt(x, baseY, theta)');
    }

    this.endY = this.getHeightAtX(initialX + Chunk.length);
    const rise = this.endY - baseY;
    this.surfaceEnd = surfaceStart + Math.hypot(Chunk.length, rise);
  }

  getHeightAtX(x) {
    return this.chunkType.heightAt(x - this.initialX, this.baseY, this.theta);
  }

  getNormalVector(x) {
    
  }
}
