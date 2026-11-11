import * as THREE from 'three';

export class SceneLighting {
  constructor(scene) {
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    this.sun = new THREE.DirectionalLight(0xfff0d0, 2.5);
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

    this.fillLight = new THREE.DirectionalLight(0x0066ff, 1.5);
    scene.add(this.fillLight, this.fillLight.target);
  }

  followTerrain(x, terrainY) {
    this.sun.position.set(x + 6, terrainY + 10, 6);
    this.sun.target.position.set(x, terrainY, 0);
    this.fillLight.position.set(x - 5, terrainY + 4, 12);
    this.fillLight.target.position.set(x, terrainY + 1, 0);
  }
}
