import * as THREE from 'three';
import { GreenHillChunkModel } from './GreenHillChunkModel.js';

export class TerrainModel {
  constructor(model_type) {
    this.model_type = model_type;
    this.ground = new THREE.Group();
  }

  _createChunkModel(chunk) {
    if (this.model_type == "green_hill") return new GreenHillChunkModel(chunk);
  }

  createGround(chunks) {  
    for (let chunk of chunks) {
      const chunkModel = this._createChunkModel(chunk);
      this.ground.add(chunkModel.getChunkModel());
    }
  }
  
  updateGround(ground) {
  
  }

  getGround() {
    return this.ground;
  }
  
  getVetorNormal(ground, x, y) {
  
  }
}

