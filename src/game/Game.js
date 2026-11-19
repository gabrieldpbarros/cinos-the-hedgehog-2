import { Level } from "./Level.js";
import { SceneView } from "./rendering/SceneView.js";

export class Game {
  constructor(canvas, input) {
    this.canvas    = canvas;
    this.state     = 'menu'; // menu | playing | paused | win | lose
    this.mainInput = input;
  }

  async startGame() {
    this.level  = new Level(this.mainInput); // depois fazemos um tratamento de modo de jogo
    await this.level.buildLevel();
    this.scene = new SceneView(this.canvas);
    this.level.sonic.update(0);
    for (const enemy of this.level.enemies) enemy.update(0);
    this.scene.drawChunks(this.level.terrain.chunks);
    this.scene.drawEntity(this.level.sonic);
    for (const enemy of this.level.enemies) this.scene.drawEntity(enemy);
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
    const { chunks, removed } = this.level.update(dt);
    this.scene.updateChunks(chunks);
    for (const enemy of removed) this.scene.removeEntity(enemy);
    for (const enemy of this.level.enemies) {
      if (this.level.sonic.logic.checkCollision(enemy.logic)) {
        this.state = 'lose';
        break;
      }
    }
    this.syncScene();
  }

  getDistance() {
    if (!this.level?.sonic) return 0;
    return this.level.sonic.logic.getPosition().x - this.level.startPosX;
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
    } else if (this.state === 'paused') {
      this.state = 'playing';
    }
  }

  switchCamera() {
    this.scene?.switchCamera();
    if (this.state !== 'playing') this.scene?.render();
  }

  resizeWindow(width, height) {
    this.scene?.resize(width, height);
    if (this.state !== 'playing') this.scene?.render();
  }
}
