import { Player } from './Player.js';
import { Chunk } from './Chunk.js';
import { chunkStrategies } from './strategies/chunkStrategies.js';
import { SceneView } from '../rendering/SceneView.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = 'menu'; // menu | playing | paused | win | lose

    this.CHUNK_TYPES = {
      "flat": chunkStrategies.flat,
      "ramp_up": chunkStrategies.rampUp,
    }
  }

  startGame() {
    this.startPosX = 0;
    this.chunks = this.createInitialChunks();

    this.startPosY = this.chunks[0].getHeightAtX(this.startPosX);
    this.player = new Player(this.startPosX, this.startPosY);

    this.drawScene();
    this.state = 'playing';
  }

  update(dt, input) {
    if (this.state !== 'playing') return;
    this.recycleChunks();
    this.player.update(dt, input, this.chunks);
    this.drawScene();
  }

  getDistance() {
    if (!this.player || this.startPosX === undefined) return 0;
    return this.player.x - this.startPosX;
  }

  getSnapshot() {
    return {
      state: this.state,
      player: this.player.getSnapshot(),
      terrainY: this.player ? this.player.groundHeightAt(this.player.x, this.chunks) : 0,
    };
  }

  switchCamera() {
    if (this.scene) this.scene.switchCamera();
  }

  resizeWindow(width, height) {
    if (this.scene) this.scene.resize(width, height);
  }

  createInitialChunks() {
    const chunks = [];

    const getRandomIndex = (ceil) => {
      return Math.floor(Math.random() * ceil);
    }

    let surfaceStart = this.startPosX - 10;
    let baseY = 0;
    for (let i = 0; i < 5; i++) {
      const startX = (this.startPosX - 10) + i * Chunk.length;
      const randomChunkType = () => {
        const keysArray = Object.keys(this.CHUNK_TYPES);
        const numKeys = keysArray.length;

        return keysArray[getRandomIndex(numKeys)];
      }

      const chunk = new Chunk(
        startX,
        this.CHUNK_TYPES[randomChunkType()],
        baseY,
        surfaceStart,
      );
      chunks.push(chunk);
      baseY = chunk.endY;
      surfaceStart = chunk.surfaceEnd;
    }

    return chunks;
  }

  createAndLinkScene() {
    this.scene = new SceneView(this.canvas);
    this.scene.drawChunks(this.chunks);
    this.scene.drawPlayer(this.player);
  }

  recycleChunks() {
    if (!this.scene || !this.chunks || this.chunks.length === 0) return;

    const getRandomIndex = (ceil) => Math.floor(Math.random() * ceil);
    const chunkKeys = Object.keys(this.CHUNK_TYPES);

    // Drop chunks that are well behind the player and spawn new ones ahead
    while (this.chunks.length > 0 && this.player.x > this.chunks[0].initialX + Chunk.length * 3) {
      this.chunks.shift();
      this.scene.removeFirstChunk();

      const last = this.chunks[this.chunks.length - 1];
      if (!last) break;

      const typeKey = chunkKeys[getRandomIndex(chunkKeys.length)];
      const newChunk = new Chunk(
        last.initialX + Chunk.length,
        this.CHUNK_TYPES[typeKey],
        last.endY,
        last.surfaceEnd,
      );
      this.chunks.push(newChunk);
      this.scene.appendChunk(newChunk);
    }
  }

  drawScene() {
    if (!this.scene) this.createAndLinkScene();
    this.scene.sync(this.getSnapshot());
    this.scene.render();
  }
}
