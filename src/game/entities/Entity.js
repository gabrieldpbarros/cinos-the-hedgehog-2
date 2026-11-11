export class Entity {
  constructor(logic, model) {
    this.logic = logic;
    this.model = model;

    // cria hitbox de acordo com modelo da entidade
    const { length, height, depth, centerPos } = this.model.getObjectDim();
    this.logic.setHitbox(length, height, depth);
    this.model.setHitboxSize(length, height, depth);
    this.model.setVisualOffset(-centerPos.x, -centerPos.y, -centerPos.z);

    // alinha posicao do modelo com logica interna
    this.alignLogicAndModel();
  }

  alignLogicAndModel() {
    const { x, y, z } = this.logic.getPosition();
    this.model.setPosition(x, y, z);
  }

  setOnGround(groundY) {
    const currentPos = this.logic.getPosition();
    this.logic.setPosition(
      currentPos.x,
      groundY + this.logic.hitboxDim.heigth / 2,
      currentPos.z
    );
    this.alignLogicAndModel();
  }

  toggleHitboxVisual() {
    if (!this.hitboxVisible) this.hitboxVisible = true;
    else this.hitboxVisible = false;
    this.model.setHitboxVisible(this.hitboxVisible);
  }

  handleAction(action, state) {
    if (state) this.logic.do(action);
    else this.logic.stop(action);
  }

  update(dt) {
    this.logic.update(dt);
    this.alignLogicAndModel();
    this.model.update(dt);
  }

  getModel3D() {
    return this.model;
  }
}
