export class Input {
  constructor() {
    this.jumpPressed = false;
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
  }

  attach(target = window) {
    target.addEventListener('keydown', this._onKeyDown);
    target.addEventListener('keyup', this._onKeyUp)
  }

  dettach(target = window) {
    target.removeEventListener('keydown', this._onKeyDown);
    target.removeEventListener('keyup', this._onKeyUp);
  }

  _onKeyDown(e) {
      if (e.code === 'Space') {
        e.preventDefault();
        this.jumpPressed = true;
      }
    }

  _onKeyUp(e) {
    if (e.code === 'Space') this.jumpPressed = false;
  }

  consumeJump() {
    const wasPressed = this.jumpPressed;
    this.jumpPressed = false;
    return wasPressed;
  }
}
