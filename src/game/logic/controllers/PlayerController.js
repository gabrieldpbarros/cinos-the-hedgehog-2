import { Controller } from "./Controller";

export class PlayerController extends Controller {
  static AVAILABLE_INPUTS = new Map([
    ["KeyA", "MOVE_LEFT"],
    ["KeyD", "MOVE_RIGHT"],
    ["Space", "JUMP"],
    ["ShiftLeft", "BOOST"],
    ["ControlLeft", "CROUCH"],
  ]);

  constructor(entity, inputListener) {
    super(entity);
    this.inputListener = inputListener;
  }

  updateEntity(dt) {
    for (let input of PlayerController.AVAILABLE_INPUTS.keys()) 
      this.entity.handleAction(
        PlayerController.AVAILABLE_INPUTS.get(input),
        this.inputListener.isDown(input)
      );
    
    this.entity.update(dt);
  }
}