import { EntityLogic } from './EntityLogic.js';

// 16 px do GDD correspondem ao diâmetro de 0,8 unidade do modelo.
export const RING = {
  pixelsToUnits: 0.05,
  diameter: 0.8,
  hitbox: 0.6,
  depth: 0.8,
  sparkleDuration: 0.24,
  scatterLimit: 32,
  scatterSpeed: 4 * 60 * 0.05, // 4 px/frame, a 60 Hz, na escala do modelo
  gravity: -0.09375 * 60 * 60 * 0.05,
  recollectDelay: 64 / 60,
  lifetime: 256 / 60,
  slowDuration: 64 / 60,
};

export class Ring extends EntityLogic {
  constructor(x, y, id, chunkX) {
    super(x, y, 0, 'ring', false);
    this.id = id;
    this.chunkX = chunkX;
    this.active = true;
    this.setHitbox(RING.hitbox, RING.hitbox, RING.depth);
  }

  collect() {
    if (!this.active) return false;
    this.active = false;
    this.hitboxActive = false;
    this.collectedAge = 0;
    return true;
  }

  scatter(vx, vy, terrain) {
    this.scattered = true;
    this.age = 0;
    this.hitboxActive = false;
    this.terrain = terrain;
    this.setSpeed(vx, vy, 0);
  }

  get rotationScale() {
    if (!this.scattered) return 1;
    return Math.min(1, Math.max(0, (RING.lifetime - this.age) / RING.slowDuration));
  }

  update(dt) {
    if (!this.active) {
      this.collectedAge += dt;
      return;
    }
    if (!this.scattered) return;
    this.age += dt;
    // Expiração precede habilitação da hitbox e qualquer teste de coleta.
    if (this.age >= RING.lifetime - 1e-9) {
      this.expired = true;
      this.hitboxActive = false;
      return;
    }
    this.hitboxActive = this.age >= RING.recollectDelay - 1e-9;
    this.position.x += this.speed.x * dt;
    this.position.y += this.speed.y * dt + RING.gravity * dt * dt / 2;
    this.speed.y += RING.gravity * dt;
    const groundY = this.terrain.getHeightAt(this.position.x);
    if (groundY !== null && this.speed.y <= 0 &&
        this.position.y - this.hitboxDim.heigth / 2 <= groundY) {
      this.position.y = groundY + this.hitboxDim.heigth / 2;
      this.speed.y = -this.speed.y * 0.75;
      // Impulsos menores que a gravidade de um frame deixam de oscilar.
      if (this.speed.y < Math.abs(RING.gravity) * Math.max(dt, 1 / 60)) this.speed.y = 0;
    }
  }

  get finished() {
    return this.expired || (!this.active && this.collectedAge >= RING.sparkleDuration - 1e-9);
  }
}
