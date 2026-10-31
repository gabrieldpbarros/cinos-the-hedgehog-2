export class Input {
  constructor() {
    this.keys = new Set();
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
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === 'Space') {
      this.jumpPressed = true;
    } else {
      this.keys.add(e.code);
    }
  }

  _onKeyUp(e) {
    this.keys.delete(e.code);
    if (e.code === 'Space') this.jumpPressed = false;
  }

  isDown(code) {
    return this.keys.has(code);
  }

  getMovement() {
    // 2D platformer: horizontal movement only (X axis)
    let x = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    return { x, z: 0 };
  }

  consumeJump() {
    const wasPressed = this.jumpPressed;
    this.jumpPressed = false;
    return wasPressed;
  }
}
