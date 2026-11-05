import { Level } from "./Level.js";
import { SceneView } from "./rendering/SceneView.js";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.state  = 'menu'; // menu | playing | paused | win | lose
  }

  async startGame() {
    this.level  = new Level(); // depois fazemos um tratamento de modo de jogo
    this.level.buildLevel();
    this.drawScene();
    this.state  = 'playing';
  }

  update(dt, input) {
    if (this.state !== 'playing') return;
    this.player.update(dt, input);
    this.drawScene();
  }

  switchCamera() {
    this.scene.switchCamera();
  }

  resizeWindow(width, heigth) {
    this.scene.resize(width, heigth);
  }

  getSnapshot() {
    return {
      state:  this.state,
      player: this.player.getSnapshot(),
    };
  }

  createAndLinkScene() {
    this.scene = new SceneView(this.canvas);
    this.scene.drawChunks(this.level.chunks);
    this.scene.drawPlayer(this.player);
  }

  drawScene() {
    if (!this.scene) this.createAndLinkScene();
    this.scene.sync(this.getSnapshot());
    this.scene.render();
  }
}
