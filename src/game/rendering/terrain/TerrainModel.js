import * as THREE from 'three';
import { GreenHillChunkModel } from './GreenHillChunkModel.js';

export class TerrainModel {
  constructor(model_type) {
    this.model_type = model_type;
    this.ground = new THREE.Group();
    this.chunkModels = [];
  }

  _createChunkModel(chunk) {
    if (this.model_type == "green_hill") return new GreenHillChunkModel(chunk);
  }

  createGround(chunks) {  
    for (let chunk of chunks) {
      const chunkModel = this._createChunkModel(chunk);
      this.ground.add(chunkModel.getChunkModel());
      this.chunkModels.push(chunkModel);
    }
  }
  
  updateGround(chunks) {
    for (const chunk of chunks) {
      const chunkModel = this._createChunkModel(chunk);
      this.ground.add(chunkModel.getChunkModel());
      this.chunkModels.push(chunkModel);
      this.chunkModels.shift().destroyChunk();
    }
  }

  getGround() {
    return this.ground;
  }
}
