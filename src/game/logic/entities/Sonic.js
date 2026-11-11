import { CONFIG } from "../../constants.js";
import { EntityLogic } from "./EntityLogic.js";

export class Sonic extends EntityLogic {
  constructor(...args) {
    super(...args);
    this.brakeStartSpeed = 0;
    this.brakeElapsed = 0;
  }

  updateHorizontalSpeed(dt) {
    const direction = Number(this.currentActions.has("MOVE_RIGHT")) -
      Number(this.currentActions.has("MOVE_LEFT"));
    const speedLimit = this.currentActions.has("CROUCH")
      ? CONFIG.runSpeedLimit / 2
      : CONFIG.runSpeedLimit;

    if (this.speed.x === 0 || direction * this.speed.x > 0) {
      this.brakeStartSpeed = 0;
      this.brakeElapsed = 0;
    }

    if (this.speed.x !== 0 && direction * this.speed.x <= 0) {
      if (this.brakeStartSpeed === 0) this.brakeStartSpeed = this.speed.x;
      // O ar tem a frenagem mais lenta; seu tempo total ainda deve caber no limite.
      const duration = Math.min(
        CONFIG.maxBrakeTime * CONFIG.airBrakeFactor,
        CONFIG.brakeTime * Math.abs(this.brakeStartSpeed) / CONFIG.runSpeedLimit,
      );
      const previousProgress = this.brakeElapsed / duration;
      this.brakeElapsed = Math.min(
        duration,
        this.brakeElapsed + dt * (this.onGround ? 1 : CONFIG.airBrakeFactor),
      );
      if (duration - this.brakeElapsed < 1e-9) this.brakeElapsed = duration;
      const progress = this.brakeElapsed / duration;
      const brakeLoss = Math.abs(this.brakeStartSpeed) *
        (progress * progress - previousProgress * previousProgress);
      this.speed.x = Math.sign(this.speed.x) *
        Math.max(0, Math.abs(this.speed.x) - brakeLoss);
      if (progress === 1) this.speed.x = 0;
    }

    if (direction !== 0 && direction * this.speed.x < speedLimit) {
      const nextSpeed = this.speed.x + direction * CONFIG.runAcceleration * dt;
      this.speed.x = direction > 0
        ? Math.min(nextSpeed, speedLimit)
        : Math.max(nextSpeed, -speedLimit);
    }

    if (this.currentActions.has("CROUCH")) {
      this.speed.x = Math.max(-speedLimit, Math.min(speedLimit, this.speed.x));
    }

    // Em repouso, o atrito estático impede a rampa de iniciar o deslizamento.
    if (this.onGround && (this.speed.x !== 0 || direction !== 0)) {
      const normal = this.groundAt?.(this.position.x)?.normal;
      // Projeta a gravidade na tangente da rampa e usa sua componente horizontal.
      if (normal) this.speed.x -= CONFIG.gravity * normal.x * normal.y * dt;
    }
  }
}
