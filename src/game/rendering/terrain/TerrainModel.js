import * as THREE from 'three';
import { GreenHillChunkModel, getTerrainMaterials } from './GreenHillChunkModel.js';
import { StartCliffModel } from './StartCliffModel.js';

export class TerrainModel {
  constructor(model_type) {
    this.model_type = model_type;
    this.ground = new THREE.Group();
    this.chunkModels = [];
    // Penhasco no limite esquerdo: acompanha o primeiro chunk ativo (o minX do Sonic).
    this.startCliff = new StartCliffModel(getTerrainMaterials());
    this.ground.add(this.startCliff.getModel());
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
    this.startCliff.placeAt(this.chunkModels[0].chunk);
  }
  
  updateGround(chunks) {
    for (const chunk of chunks) {
      const chunkModel = this._createChunkModel(chunk);
      this.ground.add(chunkModel.getChunkModel());
      this.chunkModels.push(chunkModel);
      this.chunkModels.shift().destroyChunk();
    }
    this.startCliff.placeAt(this.chunkModels[0].chunk);
  }

  getGround() {
    return this.ground;
  }
}
