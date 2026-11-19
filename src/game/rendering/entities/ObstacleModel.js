import * as THREE from 'three';
import { EntityModel } from './EntityModel.js';

export function createObstacleModel() {
  const group = new THREE.Group();

  const baseGeo = new THREE.BoxGeometry(1.2, 0.5, 1.2);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x333842, roughness: 0.7 });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = -0.25;
  group.add(baseMesh);

  const spikeGeo = new THREE.ConeGeometry(0.18, 0.6, 8);
  const spikeMat = new THREE.MeshStandardMaterial({ color: 0xd9383a, metalness: 0.4, roughness: 0.3 });

  const offsetsX = [-0.35, 0, 0.35];
  for (const offsetX of offsetsX) {
    const spike = new THREE.Mesh(spikeGeo, spikeMat);
    spike.position.set(offsetX, 0.3, 0);
    group.add(spike);
  }

  return new EntityModel(group);
}
