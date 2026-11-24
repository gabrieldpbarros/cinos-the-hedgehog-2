import { CONFIG, FISH } from "../../constants.js";
import { EntityLogic } from "./EntityLogic.js";

// Peixe que salta da agua abaixo da ponte para cima dela, como um Chopper.
// Nao usa gravidade do terreno: o movimento vertical e ciclico.
export class Fish extends EntityLogic {
  constructor(initialX, initialY, initialZ = 0) {
    super(initialX, initialY, initialZ, 'enemy', false);
    this.bottomY = initialY;
    this.jumpSpeed = FISH.jumpSpeed;
    this.gravity = CONFIG.gravity;
    this.setHitbox(0.8, 0.6, 0.8);
  }

  update(dt) {
    this.previousPosition = {
      x: this.position.x,
      y: this.position.y,
      z: this.position.z,
    };

    if (this.position.y <= this.bottomY + 1e-6 && this.speed.y <= 0) {
      this.speed.y = this.jumpSpeed;
    }

    this.speed.y += this.gravity * dt;
    this.position.y += this.speed.y * dt;

    if (this.position.y < this.bottomY) {
      this.position.y = this.bottomY;
      this.speed.y = 0;
    }
  }
}
