// Queda da ponte de corda no meio do vão. A superfície de colisão segue a
// mesma curva do desenho, para o Sonic não parecer suspenso sobre os troncos.
export const BRIDGE_SAG = 0.75;

export function bridgeSagAt(x, length = 40) {
  return BRIDGE_SAG * Math.sin((Math.PI * x) / length);
}

export const chunkStrategies = {
  flat: {
    type: 'flat',
    heightAt: (_x, baseY) => baseY,
    normalAt: () => ({ x: 0, y: 1, z: 0 })
  },
  rampUp: {
    type: 'ramp_up',
    heightAt: (_x, baseY, theta) => (_x * Math.tan(theta)) + baseY,
    normalAt: (_x, theta) => ({ x: -Math.sin(theta), y: Math.cos(theta), z: 0 })
  },
  rampDown: {
    type: 'ramp_down',
    heightAt: (_x, baseY, theta) => baseY - _x * Math.tan(theta),
    normalAt: (_x, theta) => ({ x: Math.sin(theta), y: Math.cos(theta), z: 0 })
  },
  bridge: {
    type: 'bridge',
    heightAt: (_x, baseY) => baseY - bridgeSagAt(_x),
    normalAt: () => ({ x: 0, y: 1, z: 0 })
  }
};

export class Chunk {
  static length    = 40;   // X 
  static depth     = 10;   // Z
  static soilDepth = 60;   // Y (Ytop - Ybottom = soilDepth)
  static theta     = 0.1;

  constructor(
    initialX,
    chunkType,
    baseY,
    surfaceStart = initialX,
    theta        = Chunk.theta,
  ) {
    this.makeChunk(initialX, chunkType, baseY, surfaceStart, theta);
  }

  makeChunk(
    initialX,
    chunkType,
    baseY,
    surfaceStart = initialX,
    theta        = Chunk.theta,
  ) {
    this.initialX     = initialX;     // posicao global do inicio do chunk
    this.chunkType    = chunkType;    // tipo do chunk (reto, rampa, curva, ...)
    this.chunkTypeName = chunkType?.type ?? 'flat';
    this.baseY        = baseY;        // altura da superficie no inicio do chunk
    this.theta        = theta;
    this.surfaceStart = surfaceStart; // comprimento da superficie

    if (typeof chunkType?.heightAt !== 'function') {
      throw new TypeError('Chunk type must define heightAt(x, baseY, theta)');
    }

    this.endY       = this.getHeightAtX(initialX + Chunk.length);
    const rise      = this.endY - baseY;
    this.surfaceEnd = surfaceStart + Math.hypot(Chunk.length, rise);
  }

  getHeightAtX(x) {
    return this.chunkType.heightAt(x - this.initialX, this.baseY, this.theta);
  }

  getNormalVector(x) {
    return this.chunkType.normalAt(x - this.initialX, this.theta);
  }
}
