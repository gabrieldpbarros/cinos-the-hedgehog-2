export class EntityLogic {
  constructor(initialX, initialY, initialZ, type, gravityAffects) {
    this.position       = { x: initialX, y: initialY, z: initialZ }; // ponto material
    this.type           = type;
    this.gravityAffects = gravityAffects;
    this.inEventRegion  = new Set();

    if (gravityAffects) 
      this.onGround = true;
    else
      this.onGround = false;

    this.jumpSpeed = 0;
  }

  getPosition() {
    return this.position;
  }

  setEventRegionMargin(marginX, marginY, marginZ) {
    this.eventRegionMargin = { x: marginX, y: marginY, z: marginZ };
  }

  setSpeed(x, y, z) {
    this.speedX = x;
    this.speedY = y;
    this.speedZ = z;
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

  async moveHorizontal(dt) {
    this.position.x += this.speedX * dt;
  }

  async moveVertical(dt) {
    if (!this.gravityAffects)
      this.position.y += this.speedY * dt;
    else {
      // jump
      if (this.onGround) {
        this.onGround = false;
        this.speedY   = this.jumpSpeed;
      }
      // fall
      else {
        // inserir verificação se está tocando no chão antes das próximas linhas
        this.position.y += this.speedY * dt;
        this.speedY     += -10 * dt // substituir -10 por velocidade de queda (gravidade)
      }
    }
  }

  async moveDepth(dt) {
    this.position.z += this.speedZ * dt;
  }

  update(dt) {
    
  }
}
