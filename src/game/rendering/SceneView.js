import * as THREE from 'three';
import { createGround } from './terrain/ground.js';

export class SceneView {
  constructor(canvas) {
    this.canvas = canvas;

    this.scene = new THREE.Scene();

    this.cameras = {
      side: new THREE.PerspectiveCamera(60, 1, 0.1, 1000),
      oneQuarter: new THREE.PerspectiveCamera(60, 1, 0.1, 1000),
    };
    this.cameras.side.position.set(0, 5, 12);
    this.cameras.oneQuarter.position.set(-9, 6, 8); // editar para 1/4

    this.activeCamera = this.cameras.side;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(5, 10, 5);
    this.scene.add(sun);

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
    this.scene.add(createGround(chunks));
  }

  drawEntity(entity) {
    this.scene.add(entity.getModel3D().getObject3D());
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

  sync(playerPosition) {
    const { x } = playerPosition;
    this.cameras.side.position.x = x;
    this.cameras.side.lookAt(x, 1, 0);
    this.cameras.oneQuarter.position.x = x - 9;
    this.cameras.oneQuarter.lookAt(x, 1, 0);
  }

  render() {
    this.renderer.render(this.scene, this.activeCamera);
  }
}
