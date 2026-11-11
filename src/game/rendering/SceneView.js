import * as THREE from 'three';
import { TerrainModel } from './terrain/TerrainModel.js';
import { SceneLighting } from './SceneLighting.js';

export class SceneView {
  constructor(canvas) {
    this.canvas = canvas;

    this.scene = new THREE.Scene();

    this.cameras = {
      side: new THREE.PerspectiveCamera(60, 1, 0.1, 1000),
      oneQuarter: new THREE.PerspectiveCamera(60, 1, 0.1, 1000),
    };
    this.cameras.side.position.set(0, 3, 12);
    this.cameras.oneQuarter.position.set(-9, 4, 8); // editar para 1/4

    this.activeCamera = this.cameras.side;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.lighting = new SceneLighting(this.scene);

    // Skybox
    this.skybox_loader = new THREE.TextureLoader();
    this.skybox_texture = this.skybox_loader.load(
      `${import.meta.env.BASE_URL}assets/temp_skybox.png`,
      () => {
        this.skybox_texture.mapping = THREE.EquirectangularReflectionMapping;
        this.skybox_texture.colorSpace = THREE.SRGBColorSpace;
        this.scene.background = this.skybox_texture;
      }
    );

    this.resize(window.innerWidth, window.innerHeight);
  }

  drawChunks(chunks) {
    // Ground
    this.terrainModel = new TerrainModel("green_hill");
    this.terrainModel.createGround(chunks);
    this.scene.add(this.terrainModel.getGround());
  }

  updateChunks(chunks) {
    this.terrainModel.updateGround(chunks);
  }

  drawEntity(entity) {
    const model = entity.getModel3D().getObject3D();
    model.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    this.scene.add(model);
  }

  resize(w, h) {
    Object.values(this.cameras).forEach((cam) => {
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    });
    this.renderer.setSize(w, h);
  }

  switchCamera() {
    this.activeCamera =
      this.activeCamera === this.cameras.side
        ? this.cameras.oneQuarter
        : this.cameras.side;
  }

  sync(playerPosition, terrainY) {
    const { x } = playerPosition;
    this.cameras.side.position.set(x, terrainY + 4.5, 12);
    this.cameras.side.lookAt(x, terrainY + 1, 0);
    this.cameras.oneQuarter.position.set(x - 8, terrainY + 6, 8);
    this.cameras.oneQuarter.lookAt(x, terrainY + 1, 0);

    this.lighting.followTerrain(x, terrainY);
  }

  render() {
    this.renderer.render(this.scene, this.activeCamera);
  }
}
