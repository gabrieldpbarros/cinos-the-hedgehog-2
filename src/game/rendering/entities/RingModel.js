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

  setHitboxVisible(visible) {
    super.setHitboxVisible(visible && !this.collected);
  }

  update(dt, logic) {
    this.model.rotation.y += dt * Math.PI * 2;
    if (logic?.active !== false) return;
    if (!this.sparkle) {
      this.collected = true;
      this.model.visible = false;
      this.setHitboxVisible(false);
      this.sparkle = new THREE.Group();
      this.sparkleGeometry = new THREE.OctahedronGeometry(0.12);
      this.sparkleMaterial = new THREE.MeshBasicMaterial({
        color: 0xfff29a, transparent: true, depthWrite: false,
      });
      for (let i = 0; i < 4; i++) {
        const spark = new THREE.Mesh(this.sparkleGeometry, this.sparkleMaterial);
        this.sparkle.add(spark);
      }
      this.root.add(this.sparkle);
    }
    const step = Math.min(3, Math.floor(logic.collectedAge / (RING.sparkleDuration / 4)));
    this.sparkleMaterial.opacity = [1, 0.8, 0.5, 0.2][step];
    this.sparkle.children.forEach((spark, i) => {
      const angle = i * Math.PI / 2 + Math.PI / 4;
      spark.position.set(Math.cos(angle) * (step + 1) * 0.14, Math.sin(angle) * (step + 1) * 0.14, 0);
      spark.scale.setScalar(1 - step * 0.18);
    });
  }

  dispose() {
    this.sparkle?.removeFromParent();
    this.sparkleGeometry?.dispose();
    this.sparkleMaterial?.dispose();
    this.hitboxHelper?.geometry.dispose();
    this.hitboxHelper?.material.dispose();
  }
}
