import { Level } from "./Level.js";
import { SceneView } from "./rendering/SceneView.js";

export class Game {
  constructor(canvas, input) {
    this.canvas    = canvas;
    this.state     = 'menu'; // menu | playing | paused | win | lose
    this.mainInput = input;
  }

  getInputHandler() {
    return this.mainInput;
  }

  async startGame() {
    this.level  = new Level(this.mainInput); // depois fazemos um tratamento de modo de jogo
    await this.level.buildLevel();
    this.scene = new SceneView(this.canvas);
    this.level.sonic.update(0);
    this.level.buzzBomber.update(0);
    this.scene.drawChunks(this.level.terrain.chunks);
    this.scene.drawEntity(this.level.sonic);
    this.scene.drawEntity(this.level.buzzBomber);
    this.syncScene();
    this.state  = 'playing';
  }

  syncScene() {
    const position = this.level.sonic.logic.getPosition();
    const terrainY = this.level.terrain.getHeightAt(position.x) ?? position.y;
    this.scene.sync(position, terrainY);
    this.scene.render();
  }

  update(dt) {
    if (this.state !== 'playing') return;
    this.level.player.updateEntity(dt);
    this.level.enemy1.updateEntity(dt);
    this.scene.sync(this.level.sonic.logic.getPosition());
    this.scene.render();
  }

  switchCamera() {
    this.scene?.switchCamera();
  }

  resizeWindow(width, height) {
    this.scene?.resize(width, height);
  }
}
