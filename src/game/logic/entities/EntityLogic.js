import { CONFIG } from "../../constants.js";

export class EntityLogic {
  constructor(initialX, initialY, initialZ, type, gravityAffects, groundAt = null) {
    this.position       = { x: initialX, y: initialY, z: initialZ }; // ponto material
    this.type           = type;
    this.gravityAffects = gravityAffects;
    this.groundAt       = groundAt;
    this.inEventRegion  = new Set();
    this.speed          = { x: 0, y: 0, z: 0 };

    if (gravityAffects) 
      this.onGround = true;
    else
      this.onGround = false;

    this.currentActions = new Set();
    this.jumpSpeed      = CONFIG.jumpVelocity;
  }

  getPosition() {
    return this.position;
  }

  setPosition(x, y, z) {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
  }

  setEventRegionMargin(marginX, marginY, marginZ) {
    this.eventRegionMargin = { x: marginX, y: marginY, z: marginZ };
  }

  getSpeed() {
    return this.speed;
  }

  setSpeed(x, y, z) {
    this.speed.x = x;
    this.speed.y = y;
    this.speed.z = z;
  }

  setHitbox(length, heigth, depth) {
    this.hitboxDim = { length, heigth, depth };
    this.setEventRegionMargin(2, 2 ,2);
  }

  setJumpSpeed(jumpSpeed) {
    this.jumpSpeed = jumpSpeed;
  }
    
  insertOnEventRegion(entity) {
    this.inEventRegion.add(entity);
  }
    
  removeFromEventRegion(entity) {
    this.inEventRegion.delete(entity);
  }
  
  // regiao de evento define se colisao entre as entidades esta ativa
  checkEventRegion(otherEntity) {
    const own           = this.hitboxDim;
    const other         = otherEntity.hitboxDim;
    const margin        = this.eventRegionMargin;
    const isInXInterval = Math.abs(this.position.x - otherEntity.position.x) <= (own.length + other.length) / 2 + margin.x;
    const isInYInterval = Math.abs(this.position.y - otherEntity.position.y) <= (own.heigth + other.heigth) / 2 + margin.y;
    const isInZInterval = Math.abs(this.position.z - otherEntity.position.z) <= (own.depth  + other.depth)  / 2 + margin.z;

    return isInXInterval && isInYInterval && isInZInterval;
  }

  checkCollision(otherEntity) {
    const own           = this.hitboxDim;
    const other         = otherEntity.hitboxDim;
    const isInXInterval = Math.abs(this.position.x - otherEntity.position.x) <= (own.length + other.length) / 2;
    const isInYInterval = Math.abs(this.position.y - otherEntity.position.y) <= (own.heigth + other.heigth) / 2;
    const isInZInterval = Math.abs(this.position.z - otherEntity.position.z) <= (own.depth  + other.depth)  / 2;

    return isInXInterval && isInYInterval && isInZInterval;
  }

  jump() {
    if (!this.onGround) return;
    this.onGround = false;
    this.speed.y = this.jumpSpeed;
  }

  moveHorizontal(dt) {
    this.position.x += this.speed.x * dt;
  }

  moveVertical(dt) {
    if (!this.gravityAffects) {
      this.position.y += this.speed.y * dt;
    } else {
      const surface = this.groundAt?.(this.position.x) ?? null;

      if (this.onGround && surface !== null) {
        this.position.y = surface.height + this.hitboxDim.heigth / 2;
        this.speed.y = -this.speed.x * surface.normal.x / surface.normal.y;
      } else {
        this.onGround = false;
        this.position.y += this.speed.y * dt;
        this.speed.y += CONFIG.gravity * dt;

        if (surface !== null && this.speed.y <= 0 &&
            this.position.y <= surface.height + this.hitboxDim.heigth / 2) {
          this.position.y = surface.height + this.hitboxDim.heigth / 2;
          this.speed.y = 0;
          this.onGround = true;
        }
      }
    }
  }

  moveDepth(dt) {
    this.position.z += this.speed.z * dt;
  }

  clearActions() {
    this.currentActions.clear();
  }

  do(action) {
    this.currentActions.add(action);
  }

  stop(action) {
    this.currentActions.delete(action);
  }

  updateHorizontalSpeed() {}

  update(dt) {
    if (this.currentActions.has("JUMP")) this.jump();
    this.updateHorizontalSpeed(dt);

    this.moveHorizontal(dt);
    this.moveVertical(dt);
    this.moveDepth(dt);
  }
}
