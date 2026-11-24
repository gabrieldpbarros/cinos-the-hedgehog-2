import { Level } from "./Level.js";
import { SceneView } from "./rendering/SceneView.js";
import { AudioManager } from "./audio/AudioManager.js";
import { CONFIG, SCORE } from "./constants.js";
import { gradeForScore } from "./logic/Score.js";

export class Game {
  constructor(canvas, input) {
    this.canvas    = canvas;
    this.state     = 'menu'; // menu | playing | paused | win | lose
    this.mainInput = input;
    this.elapsedTime = 0;
    this.audio = new AudioManager();
  }

  async startGame() {
    this.level  = new Level(this.mainInput, CONFIG.levelDistance, { audio: this.audio });
    await this.level.buildLevel();
    this.scene = new SceneView(this.canvas);
    this.level.sonic.update(0);
    for (const enemy of this.level.enemies) enemy.update(0);
    for (const obstacle of this.level.obstacles) obstacle.update(0);
    this.scene.drawChunks(this.level.terrain.chunks);
    for (const entity of this.level.entities) this.scene.drawEntity(entity);
    this.syncScene();
    this.state  = 'playing';
    this.audio?.startMusic();
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

    if (defeated) {
      this.state = 'lose';
      this.audio?.play('lose');
      this.audio?.stopMusic();
    }

    if (this.state === 'playing' &&
        this.level.sonic.logic.getPosition().x >= this.level.finishX) {
      this.state = 'win';
      this.audio?.play('win');
      this.audio?.stopMusic();
    }
    this.syncScene(dt);
  }

  getElapsedTime() {
    return this.elapsedTime;
  }

  getScore() {
    return this.level?.score?.points ?? 0;
  }

  getResults() {
    const rings = this.level?.ringsCollected ?? 0;
    const time = this.elapsedTime;
    const ringsPerMinute = time > 0 ? rings / (time / 60) : 0;
    const score = this.level?.score;
    // Sem score (partidas de teste), os anéis ainda dão a pontuação base.
    const points = score
      ? (this.state === 'win' ? score.finish(time) : score.points)
      : rings * SCORE.ring;
    const grade = gradeForScore(points);

    return {
      rings,
      time,
      grade,
      ringsPerMinute,
      score: points,
      timeBonus: score?.timeBonus ?? 0,
    };
  }

  getDistance() {
    if (!this.level?.sonic) return 0;
    return this.level.sonic.logic.getPosition().x - this.level.startPosX;
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.audio?.play('pause');
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.audio?.play('resume');
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
