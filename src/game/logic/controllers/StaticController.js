import { Controller } from "./Controller";

export class StaticController extends Controller {
  constructor(entity) {
    super(entity);
  }

  updateEntity(dt) {
    this.entity.update(dt);
  }
}