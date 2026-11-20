import * as THREE from 'three';

// Desde o three r155 uma luz de intensidade 1 entrega ~1/π da cor difusa; estes valores
// deixam as faces iluminadas perto da cor da textura, sem estourar.
export const LIGHTING = {
  skyColor: '#e3f2ff',   // luz do céu, vinda de cima (sombras ganham tom de céu)
  groundColor: '#86a84e', // luz refletida pela grama, vinda de baixo
  hemisphere: 1.25,
  sunColor: '#fff3dc',
  sun: 2.9,
};

export class SceneLighting {
  constructor(scene) {
    // Céu + chão em vez de ambiente branco e preenchimento azul: o azul puro deixava
    // verdes e marrons acinzentados e puxava o Sonic para o roxo.
    this.hemisphere = new THREE.HemisphereLight(LIGHTING.skyColor, LIGHTING.groundColor, LIGHTING.hemisphere);
    scene.add(this.hemisphere);

    this.sun = new THREE.DirectionalLight(LIGHTING.sunColor, LIGHTING.sun);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const shadowCamera = this.sun.shadow.camera;
    shadowCamera.left = -15;
    shadowCamera.right = 15;
    shadowCamera.top = 15;
    shadowCamera.bottom = -15;
    shadowCamera.near = 1;
    shadowCamera.far = 40;
    shadowCamera.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.02;
    scene.add(this.sun, this.sun.target);
  }

  followTerrain(x, terrainY) {
    this.sun.position.set(x + 6, terrainY + 10, 6);
    this.sun.target.position.set(x, terrainY, 0);
  }
}
