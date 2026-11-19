import { EntityLogic } from './EntityLogic.js';

// 16 px do GDD correspondem ao diâmetro de 0,8 unidade do modelo.
export const RING = {
  pixelsToUnits: 0.05,
  diameter: 0.8,
  hitbox: 0.6,
  depth: 0.8,
};

export class Ring extends EntityLogic {
  constructor(x, y, id, chunkX) {
    super(x, y, 0, 'ring', false);
    this.id = id;
    this.chunkX = chunkX;
    this.active = true;
    this.setHitbox(RING.hitbox, RING.hitbox, RING.depth);
  }
}
