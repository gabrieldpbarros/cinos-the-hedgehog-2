export class Entity {
  constructor(logic, model) {
    this.logic = logic;
    this.model = model;
  }

  handleAction(action, state) {
    
  }

  update(dt) {
    this.logic.update(dt);
    const logicPosition = this.logic.getPosition();
    this.model.setPosition(
      logicPosition.x,
      logicPosition.y,
      logicPosition.z
    );
    this.model.update(dt);
  }

  getModel3D() {
    return this.model;
  }
}