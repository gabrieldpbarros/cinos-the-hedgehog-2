import { CONFIG } from './constants.js';
import { Chunk } from './Chunk.js';

export class Player {
  constructor(
    startPosX,
    startPosY,
  ) {
    this.x = startPosX;
    this.y = startPosY + CONFIG.groundOffset;
    this.z = 0;
    this.velocityY = 0;
    this.onGround = true;
  }

  jump() {
    this.velocityY = CONFIG.jumpVelocity;
    this.onGround = false;
  }

  fall(dt) {
    this.y += this.velocityY * dt;
    this.velocityY += CONFIG.gravity * dt;
  }

  groundHeightAt(x, chunks) {
    const chunk = chunks?.find((c) => x >= c.initialX && x < c.initialX + Chunk.length);
    if (chunk) return chunk.getHeightAtX(x);
    // Fallback to the last known chunk so the player never drops through the world
    const last = chunks?.[chunks.length - 1];
    return last ? last.getHeightAtX(last.initialX + Chunk.length) : 0;
  }

  update(dt, input, chunks) {
    const move = input.getMovement();
    const speed = CONFIG.forwardSpeed;
    this.x += move.x * speed * dt;
    this.z += move.z * speed * dt;

    // Jump
    if (input.consumeJump() && this.onGround)
      this.jump();

    // Gravity
    if (!this.onGround)
      this.fall(dt);

    // Ground collision / terrain following
    const groundY = this.groundHeightAt(this.x, chunks);
    const minY = groundY + CONFIG.groundOffset;
    if (this.y <= minY) {
      this.y = minY;
      this.velocityY = 0;
      this.onGround = true;
    } else if (this.onGround) {
      // Keep the player glued to sloped ground while moving
      this.y = minY;
    }
  }

  // What rendering needs (plain data)
  getSnapshot() {
    return { x: this.x, y: this.y, z: this.z, onGround: this.onGround };
  }
}
