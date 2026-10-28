import { Player } from './Player.js';

export class Game {
  constructor() {
    this.player = new Player();
    this.state = 'playing'; // menu | playing | paused | win | lose
  }

  update(dt, input) {
    if (this.state !== 'playing') return;
    this.player.update(dt, input);
  }

  getSnapshot() {
    return {
      state: this.state,
      player: this.player.getSnapshot(),
    };
  }
}
