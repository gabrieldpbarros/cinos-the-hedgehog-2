import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EntityModel } from "./EntityModel.js";

export async function createSonicModel() {
  const loader = new GLTFLoader();
  const { scene } = await loader.loadAsync(
    `${import.meta.env.BASE_URL}model-imports/sonic-hd/scene.gltf`
  );

  return new SonicModel(scene);
}

class SonicModel extends EntityModel {
  constructor(model = null) {
    super(model);

    // Escala o modelo
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    model.scale.setScalar(1.5 / size.y);

    // Recalcula a caixa já escalada e apoia os pés na base do cubo
    box.setFromObject(model);
    model.position.y = -box.min.y - 0.5;
    model.rotation.y = Math.PI / 2;

    model.traverse((object) => {
      if (!object.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        material.metalness = 0.05;
        material.roughness = 0.6;
      }
    });
  }
}
