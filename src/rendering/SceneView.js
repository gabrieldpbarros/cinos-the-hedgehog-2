import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createGround } from './ground.js';

export class SceneView {
  constructor(canvas) {
    this.canvas = canvas;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    this.cameras = {
      side: new THREE.PerspectiveCamera(60, 1, 0.1, 1000),
      threeQuarter: new THREE.PerspectiveCamera(60, 1, 0.1, 1000),
    };
    this.cameras.side.position.set(0, 5, 12);
    this.cameras.threeQuarter.position.set(8, 6, 8);

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

    // Ground
    this.scene.add(createGround());

    // Player mesh (model + hitbox)
    this.playerHB = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.8, 0.6),
      new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        transparent: true,
        opacity: 0
      })
    );
    // Carrega o modelo do Sonic (assíncrono)
    this.loadSonic();
    //this.playerhb_box = new THREE.BoxHelper(this.playerHB);
    this.scene.add(this.playerHB);
    //this.scene.add(this.playerhb_box);

    // Enemy mesh (model + hitbox)
    this.enemyHB = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.1, 1.1),
      new THREE.MeshStandardMaterial({
        color: 0xffffff, 
        transparent: true,
        opacity: 0
      })
    )
    this.enemyModel = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        color: 0xff4500
      })
    );
    this.enemyHB.add(this.enemyModel);
    this.enemyHB.position.set(10, 0.5, 0);
    this.scene.add(this.enemyHB);

    this.resize(window.innerWidth, window.innerHeight);
  }

  loadSonic() {
    new GLTFLoader().load(
      `${import.meta.env.BASE_URL}model-imports/sonic-hd/scene.gltf`,
      (gltf) => {
        const sonic = gltf.scene;

        // Escala o modelo para ~1 unidade de altura (igual ao cubo)
        const box = new THREE.Box3().setFromObject(sonic);
        const size = box.getSize(new THREE.Vector3());
        sonic.scale.setScalar(1.5 / size.y);

        // Recalcula a caixa já escalada e apoia os pés na base do cubo
        box.setFromObject(sonic);
        sonic.position.y = -box.min.y - 0.5;
        sonic.rotation.y = Math.PI / 2;

        // Esconde o cubo e pendura o Sonic nele (herda a posição do sync)
        this.playerHB.add(sonic);
      },
      undefined,
      (err) => console.error('Erro ao carregar o Sonic:', err)
    );
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
        ? this.cameras.threeQuarter
        : this.cameras.side;
  }

  sync(gameSnapshot) {
    const p = gameSnapshot.player;
    this.playerHB.position.set(p.x, p.y, p.z);
    //this.playerhb_box.update();

    // Keep side camera following player on X
    this.cameras.side.position.x = p.x;
    this.cameras.side.lookAt(p.x, 1, 0);

    // Keep 3/4 camera following too
    this.cameras.threeQuarter.position.x = p.x + 8;
    this.cameras.threeQuarter.lookAt(p.x, 1, 0);
  }

  render() {
    this.renderer.render(this.scene, this.activeCamera);
  }
}