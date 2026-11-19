import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { EntityModel } from "./EntityModel.js";

let buzzBomberLoad;

function loadBuzzBomberAsset() {
  buzzBomberLoad ??= new GLTFLoader()
    .loadAsync(`${import.meta.env.BASE_URL}model-imports/buzzbomber-sonic-generations-ripped/source/buzzbomber.glb`)
    .catch((error) => {
      buzzBomberLoad = undefined;
      throw error;
    });
  return buzzBomberLoad;
}

export async function createBuzzBomberModel() {
  const { scene, animations } = await loadBuzzBomberAsset();
  return new BuzzBomberModel(clone(scene), animations);
}

class BuzzBomberModel extends EntityModel {
  constructor(model = null, animations) {
    super(model);
    this.animations = animations;

    // REVISAR POSICIONAMENTO
    // Escala o modelo
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    model.scale.setScalar(1.4 / size.y);

    // Recalcula a caixa já escalada e apoia os pés na base do cubo
    box.setFromObject(model);
    model.position.y = -box.min.y + 2;
    // model.position.z = 0;
    model.rotation.x = 3 * Math.PI / 2;

    // Define mixer de animação
    this.mixer = new THREE.AnimationMixer(model);
    const idle = this.animations.find(
      (clip) => clip.name === 'BuzzBomber_animation_looping_idle'
    );
    if (!idle) throw new Error("Animação idle do BuzzBomber não encontrada.");

    this.mixer.clipAction(idle).play();
  }

  update(dt) {
    super.update(dt);
    this.mixer.update(dt);
  }
}
