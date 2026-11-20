import { Level } from "./Level.js";
import { SceneView } from "./rendering/SceneView.js";
import { CONFIG } from "./constants.js";

export class Game {
  constructor(canvas, input) {
    this.canvas    = canvas;
    this.state     = 'menu'; // menu | playing | paused | win | lose
    this.mainInput = input;
    this.elapsedTime = 0;
  }

  async startGame() {
    this.level  = new Level(this.mainInput, CONFIG.levelDistance);
    await this.level.buildLevel();
    this.scene = new SceneView(this.canvas);
    this.level.sonic.update(0);
    for (const enemy of this.level.enemies) enemy.update(0);
    for (const obstacle of this.level.obstacles) obstacle.update(0);
    this.scene.drawChunks(this.level.terrain.chunks);
    for (const entity of this.level.entities) this.scene.drawEntity(entity);
    this.syncScene();
    this.state  = 'playing';
  }

  syncScene(dt = 0) {
    const position = this.level.sonic.logic.getPosition();
    const terrainY = this.level.terrain.getHeightAt(position.x) ?? position.y;
    this.scene.sync(position, terrainY, dt);
    this.scene.render();
  }

  update(dt) {
    if (this.state !== 'playing') return;
    this.elapsedTime += dt;
    const { chunks, removed, added = [], defeated = false } = this.level.update(dt);
    this.scene.updateChunks(chunks);
    for (const entity of removed) this.scene.removeEntity(entity);
    for (const entity of added) this.scene.drawEntity(entity);
    const finishHeight = this.level.terrain.getHeightAt(this.level.finishX);
    if (!this.finishLineDrawn && finishHeight !== null) {
      this.scene.drawFinishLine(this.level.finishX, finishHeight);
      this.finishLineDrawn = true;
    }

    if (defeated) this.state = 'lose';

    if (this.state === 'playing' &&
        this.level.sonic.logic.getPosition().x >= this.level.finishX) {
      this.state = 'win';
    }
    this.syncScene(dt);
  }

  getElapsedTime() {
    return this.elapsedTime;
  }

  getResults() {
    const rings = this.level?.ringsCollected ?? 0;
    const time = this.elapsedTime;
    const ringsPerMinute = time > 0 ? rings / (time / 60) : 0;
    let grade = 'F';
    if (ringsPerMinute >= 10) grade = 'A';
    else if (ringsPerMinute >= 8) grade = 'B';
    else if (ringsPerMinute >= 6) grade = 'C';
    else if (ringsPerMinute >= 4) grade = 'D';
    else if (ringsPerMinute >= 2) grade = 'E';

    return { rings, time, grade, ringsPerMinute };
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
