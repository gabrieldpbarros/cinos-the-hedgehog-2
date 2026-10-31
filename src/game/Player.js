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
    this.velocityX = 0;
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
    if (!chunks || chunks.length === 0) return 0;
    const first = chunks[0];
    const last = chunks[chunks.length - 1];
    if (x < first.initialX) return first.getHeightAtX(first.initialX);
    if (x >= last.initialX + Chunk.length) return last.getHeightAtX(last.initialX + Chunk.length);
    const chunk = chunks.find((c) => x >= c.initialX && x < c.initialX + Chunk.length);
    return chunk ? chunk.getHeightAtX(x) : 0;
  }

  update(dt, input, chunks) {
    const move = input.getMovement();

    // Speed buildup / friction / braking (sliding stop)
    if (move.x !== 0) {
      const dir = Math.sign(move.x);
      const reversing = this.velocityX !== 0 && Math.sign(this.velocityX) !== dir;
      if (reversing) {
        // brake faster when pressing opposite direction
        this.velocityX += dir * CONFIG.braking * dt;
        if (Math.sign(this.velocityX) !== dir) this.velocityX = 0;
      } else {
        this.velocityX += dir * CONFIG.acceleration * dt;
      }
      this.velocityX = Math.max(-CONFIG.maxSpeed, Math.min(CONFIG.maxSpeed, this.velocityX));
    } else {
      // friction slows the player down gradually
      if (this.velocityX > 0) {
        this.velocityX = Math.max(0, this.velocityX - CONFIG.friction * dt);
      } else if (this.velocityX < 0) {
        this.velocityX = Math.min(0, this.velocityX + CONFIG.friction * dt);
      }
    }

    this.x += this.velocityX * dt;

    // Keep player inside the generated track (left boundary)
    if (chunks && chunks.length > 0) {
      const minX = chunks[0].initialX;
      if (this.x < minX) {
        this.x = minX;
        this.velocityX = 0;
      }
    }

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
    return { x: this.x, y: this.y, z: this.z, onGround: this.onGround, velocityX: this.velocityX };
  }
}
