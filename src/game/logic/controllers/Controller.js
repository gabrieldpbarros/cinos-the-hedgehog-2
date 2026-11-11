export class Controller {
  constructor(entity) {
    this.setControlledEntity(entity);
  }

  setControlledEntity(entity) {
    this.entity = entity;
  }
}
