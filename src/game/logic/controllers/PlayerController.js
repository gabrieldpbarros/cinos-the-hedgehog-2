import { Controller } from "./Controller.js";

export class PlayerController extends Controller {
  static AVAILABLE_INPUTS = new Map([
    ["MOVE_LEFT", ["KeyA", "ArrowLeft"]],
    ["MOVE_RIGHT", ["KeyD", "ArrowRight"]],
    ["JUMP", ["Space"]],
    ["BOOST", ["ShiftLeft", "ShiftRight"]],
    ["CROUCH", ["ControlLeft", "ControlRight"]],
  ]);

  constructor(entity, inputListener) {
    super(entity);
    this.inputListener = inputListener;
  }

  updateEntity(dt) {
    for (const [action, keys] of PlayerController.AVAILABLE_INPUTS)
      this.entity.handleAction(action, keys.some((key) => this.inputListener.isDown(key)));
    
    this.entity.update(dt);
  }
}
