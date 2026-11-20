import * as THREE from 'three';
import { EntityModel } from './EntityModel.js';

export function createObstacleModel() {
  const group = new THREE.Group();

  const baseMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.5, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x333842, roughness: 0.7 }),
  );
  baseMesh.position.y = -0.25;
  group.add(baseMesh);

  const spikeGeometry = new THREE.ConeGeometry(0.18, 0.6, 8);
  const spikeMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9383a,
    metalness: 0.4,
    roughness: 0.3,
  });
  for (const offsetX of [-0.35, 0, 0.35]) {
    const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
    spike.position.set(offsetX, 0.3, 0);
    group.add(spike);
  }

  const model = new EntityModel(group);
  const geometries = new Set();
  const materials = new Set();
  group.traverse((object) => {
    if (!object.isMesh) return;
    geometries.add(object.geometry);
    for (const material of [].concat(object.material)) materials.add(material);
  });
  model.dispose = () => {
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    model.hitboxHelper?.geometry.dispose();
    model.hitboxHelper?.material.dispose();
  };
  return model;
}
