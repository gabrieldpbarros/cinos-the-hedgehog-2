import { EntityLogic } from "./EntityLogic.js";

// Espinhos fixos no chão. Não têm gravidade; o Level os apoia na superfície.
export class Obstacle extends EntityLogic {
  constructor(initialX, initialY, initialZ = 0) {
    super(initialX, initialY, initialZ, 'obstacle', false);
  }
}
