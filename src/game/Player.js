import { CONFIG } from './constants.js';

export class Player {
  constructor() {
    this.x = 0;
    this.y = CONFIG.groundY;
    this.z = 0;
    this.velocityY = 0;
    this.onGround = true;
  }

  update(dt, input) {
    // Auto-forward movement along X
    this.x += CONFIG.forwardSpeed * dt;

    // Jump
    if (input.consumeJump() && this.onGround) {
      this.velocityY = CONFIG.jumpVelocity;
      this.onGround = false;
    }

    // Gravity
    this.velocityY += CONFIG.gravity * dt;
    this.y += this.velocityY * dt;

    // Ground collision
    if (this.y <= CONFIG.groundY) {
      this.y = CONFIG.groundY;
      this.velocityY = 0;
      this.onGround = true;
    }
  }

  // What rendering needs (plain data)
  getSnapshot() {
    return { x: this.x, y: this.y, z: this.z, onGround: this.onGround };
  }
}
