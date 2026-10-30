import { CONFIG } from './constants.js';

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

  goForward(dt) {
    // Player speed
    this.speed = CONFIG.forwardSpeed; // constante por enquanto

    // Auto-forward movement along X
    this.x += this.speed * dt;
  }

  jump() {
    this.velocityY = CONFIG.jumpVelocity;
    this.onGround = false;
  }

  fall(dt) {
    this.y += this.velocityY * dt;
    this.velocityY += CONFIG.gravity * dt;
  }

  update(dt, input) {
    this.goForward(dt);

    // Jump
    if (input.consumeJump() && this.onGround)
      this.jump();

    // Gravity
    if (!this.onGround) 
      this.fall(dt);

    // Ground collision
    if (this.y <= CONFIG.groundOffset) {
      this.y = CONFIG.groundOffset;
      this.velocityY = 0;
      this.onGround = true;
    }
  }

  // What rendering needs (plain data)
  getSnapshot() {
    return { x: this.x, y: this.y, z: this.z, onGround: this.onGround };
  }
}
