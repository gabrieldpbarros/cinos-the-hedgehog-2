import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EntityModel } from './EntityModel.js';
import { RING } from '../../logic/entities/Ring.js';

export async function loadRingTemplate() {
  const { scene } = await new GLTFLoader().loadAsync(
    `${import.meta.env.BASE_URL}model-imports/sonic_ring/scene.gltf`,
  );
  return scene;
}

export class RingModel extends EntityModel {
  constructor(template) {
    // Geometria e materiais compartilhados; transformações independentes.
    const visual = new THREE.Group();
    const copy = template.clone(true);
    const box = new THREE.Box3().setFromObject(copy);
    const size = box.getSize(new THREE.Vector3());
    const scale = RING.diameter / Math.max(size.x, size.y);
    copy.scale.multiplyScalar(scale);
    box.setFromObject(copy);
    copy.position.sub(box.getCenter(new THREE.Vector3()));
    visual.add(copy);
    super(visual);
  }

  update(dt) {
    this.model.rotation.y += dt * Math.PI * 2;
  }
}
