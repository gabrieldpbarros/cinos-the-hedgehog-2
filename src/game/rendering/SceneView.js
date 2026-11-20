import * as THREE from 'three';
import { TerrainModel } from './terrain/TerrainModel.js';
import { getTerrainMaterials } from './terrain/GreenHillChunkModel.js';
import { SceneLighting } from './SceneLighting.js';
import { Backdrop } from './background/Backdrop.js';

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

    // Céu, água, colinas e nuvens procedurais (low poly)
    this.backdrop = new Backdrop(this.scene, getTerrainMaterials());
    this.terrainY = 0;

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

  drawFinishLine(x, groundY) {
    const gate = new THREE.Group();
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0xe53935 });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x171717 });
    const lightMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

    // Pórticos e faixa quadriculada posicionada no X da chegada.
    for (const z of [-3.5, 3.5]) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 4.5, 0.3),
        postMaterial
      );
      post.position.set(x, groundY + 2.25, z);
      gate.add(post);
    }

    for (let row = 0; row < 12; row++) {
      for (let column = 0; column < 2; column++) {
        const square = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.38, 0.38),
          (row + column) % 2 === 0 ? lightMaterial : darkMaterial
        );
        square.position.set(
          x,
          groundY + 4.37 - row * 0.38,
          (column - 0.5) * 0.4
        );
        gate.add(square);
      }
    }

    this.scene.add(gate);
    this.finishLine = gate;
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

  removeEntity(entity) {
    entity.getModel3D().getObject3D().removeFromParent();
    entity.model.dispose?.();
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

  sync(playerPosition, terrainY, dt = 0) {
    const { x } = playerPosition;
    this.cameras.side.position.set(x, terrainY + 4.5, 12);
    this.cameras.side.lookAt(x, terrainY + 1, 0);
    this.cameras.oneQuarter.position.set(x - 8, terrainY + 6, 8);
    this.cameras.oneQuarter.lookAt(x, terrainY + 1, 0);

    this.lighting.followTerrain(x, terrainY);
    this.terrainY = terrainY;
    this.backdrop.advance(dt);
  }

  render() {
    this.backdrop.follow(this.activeCamera, this.terrainY);
    this.renderer.render(this.scene, this.activeCamera);
  }
}
