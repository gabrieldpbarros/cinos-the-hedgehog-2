export class Input {
  constructor() {
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this.pressedKeys = new Set();
  }

  _onKeyDown(e) {
    this.pressedKeys.add(e.code);
  }

  _onKeyUp(e) {
    this.pressedKeys.delete(e.code);
  }

  attach(target = window) {
    target.addEventListener('keydown', this._onKeyDown);
    target.addEventListener('keyup', this._onKeyUp)
  }

  dettach(target = window) {
    target.removeEventListener('keydown', this._onKeyDown);
    target.removeEventListener('keyup', this._onKeyUp);
  }

  isDown(code) {
    return this.pressedKeys.has(code);
  }

  clean() {
    this.pressedKeys.clear();
  }
}