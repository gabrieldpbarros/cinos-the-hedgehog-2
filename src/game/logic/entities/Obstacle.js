import { EntityLogic } from "./EntityLogic.js";

export class Obstacle extends EntityLogic {
  constructor(initialX, initialY, initialZ = 0) {
    super(initialX, initialY, initialZ, 'obstacle', false, null);
  }
}
