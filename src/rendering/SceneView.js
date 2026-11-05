import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { pattern } from './ground.js';
import { ChunkModel } from './ChunkModel.js';

export class SceneView {
  constructor(canvas) {
    this.canvas = canvas;

    this.scene = new THREE.Scene();

    this.cameras = {
      side: new THREE.PerspectiveCamera(60, 1, 0.1, 1000),
      threeQuarter: new THREE.PerspectiveCamera(60, 1, 0.1, 1000),
    };
    this.cameras.side.position.set(0, 5, 12);
    this.cameras.threeQuarter.position.set(8, 6, 8); // editar para 1/4

    this.activeCamera = this.cameras.side;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;;
    
    // // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // Luz principal: quente, da frente/direita (projeta sombra)
    this.sun = new THREE.DirectionalLight(0xfff0d0, 2.5);
    this.sun.position.set(6, 10, 6);
    this.sun.castShadow = true;

    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -15;
    sc.right = 15;
    sc.top = 15;
    sc.bottom = -15;
    sc.near = 1;
    sc.far = 40;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.02;

    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    // Preenchimento: levemente azulada, da frente/esquerda
    this.fillLight = new THREE.DirectionalLight(0x0066ff, 1.5);
    this.fillLight.position.set(-6, 5, 10);
    this.scene.add(this.fillLight);
    this.scene.add(this.fillLight.target);

    // sun.visible = false;
    // this.fillLight.visible = false;

    // Skybox
    this.skybox_loader = new THREE.TextureLoader();
    this.skybox_texture = this.skybox_loader.load(
      `${import.meta.env.BASE_URL}assets/temp_skybox.png`,
      () => {
        this.skybox_texture.mapping = THREE.EquirectangularReflectionMapping;
        this.skybox_texture.colorSpace = THREE.SRGBColorSpace;
        this.scene.background = this.skybox_texture;
        // this.scene.environment = this.skybox_texture; 
        // this.scene.environmentIntensity = 1.0;
      }
    );
    

    // ============================== TEMPORARIO ==============================
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

    this.enemyModel.castShadow = true;
    this.enemyModel.receiveShadow = true;

    this.enemyHB.add(this.enemyModel);
    this.enemyHB.position.set(10, 0.5, 0);
    this.scene.add(this.enemyHB);
    // ========================================================================

    this.resize(window.innerWidth, window.innerHeight);
  }

  drawChunks(chunks) {
    // Ground
    this.chunkMaterials = [
      new THREE.MeshStandardMaterial({ map: pattern(['#a56832', '#d49a56'], true), side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ map: pattern(['#3a7d44', '#58a84f']), side: THREE.DoubleSide }),
    ];
    this.ground = new THREE.Group();
    this.chunkModels = [];
    for (const chunk of chunks) this.appendChunk(chunk);
    this.scene.add(this.ground);
  }

  appendChunk(chunk) {
    if (!this.chunkMaterials) {
      this.chunkMaterials = [
        new THREE.MeshStandardMaterial({ map: pattern(['#a56832', '#d49a56'], true), side: THREE.DoubleSide }),
        new THREE.MeshStandardMaterial({ map: pattern(['#3a7d44', '#58a84f']), side: THREE.DoubleSide }),
      ];
    }
    if (!this.ground) {
      this.ground = new THREE.Group();
      this.chunkModels = [];
      this.scene.add(this.ground);
    }
    const chunkModel = new ChunkModel(chunk, this.chunkMaterials);
    this.ground.add(chunkModel.getChunkModel());
    this.chunkModels.push(chunkModel);
  }

  removeFirstChunk() {
    const chunkModel = this.chunkModels.shift();
    chunkModel?.destroyChunk();
  }

  drawPlayer(player) {
    // Player mesh (model + hitbox)
    this.playerHB = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.8, 0.6),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0
      })
    );
    this.playerHB.position.set(player.x, player.y, player.z);
    //this.playerhb_box = new THREE.BoxHelper(this.playerHB);

    

    // Carrega o modelo do Sonic (assíncrono)
    if (!this.loader) this.loader = new GLTFLoader();
    this.loader.load(
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

        sonic.traverse((obj) => {
          if (obj.isMesh) {
            obj.material.metalness = 0.05;
            obj.material.roughness = 0.6;
            obj.castShadow = true;
            obj.receiveShadow = true;
          }
        });

        this.playerHB.add(sonic);
      },
      undefined,
      (err) => console.error('Erro ao carregar o Sonic:', err)
    );
    this.scene.add(this.playerHB);
    //this.scene.add(this.playerhb_box);
  }

  resetScene(chunks, player) {
    if (this.ground) {
      this.ground.removeFromParent();
      this.ground = null;
      this.chunkModels = [];
    }
    if (this.playerHB) {
      this.playerHB.removeFromParent();
      this.playerHB = null;
    }
    this.drawChunks(chunks);
    this.drawPlayer(player);
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
    const terrainY = gameSnapshot.terrainY ?? 0;
    this.playerHB.position.set(p.x, p.y, p.z);
    //this.playerhb_box.update();
    this.fillLight.position.set(p.x - 5, 4, 12);
    this.fillLight.target.position.set(p.x, 1, 0);

    if (gameSnapshot.obstacle && this.enemyHB) {
      this.enemyHB.position.set(gameSnapshot.obstacle.x, gameSnapshot.obstacle.y, gameSnapshot.obstacle.z);
    }

    // Keep side camera following player on X and terrain height (not jumps)
    this.cameras.side.position.set(p.x, terrainY + 4.5, 12);
    this.cameras.side.lookAt(p.x, terrainY + 1, 0);

    // Keep 3/4 camera following too
<<<<<<< HEAD
    this.cameras.threeQuarter.position.set(p.x + 8, terrainY + 5.5, 8);
    this.cameras.threeQuarter.lookAt(p.x, terrainY + 1, 0);
=======
    this.cameras.threeQuarter.position.x = p.x + 8;
    this.cameras.threeQuarter.lookAt(p.x, 1, 0);

    this.sun.position.set(p.x + 6, 10, 6);
    this.sun.target.position.set(p.x, 0, 0);
>>>>>>> bbe25757136ce535f9b082531a7ba166e0a91546
  }

  render() {
    this.renderer.render(this.scene, this.activeCamera);
  }
}