import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EntityModel } from './EntityModel.js';

// Base e espinhos compartilham uma única geometria e um único material. Antes cada
// obstáculo criava quatro meshes (e quatro chamadas de desenho); agora é um mesh só.
let sharedObstacle;

function paint(geometry, color) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  const vertexCount = flat.attributes.position.count;
  const colors = new Float32Array(vertexCount * 3);
  const tint = new THREE.Color(color);
  for (let i = 0; i < vertexCount; i++) {
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return flat;
}

function getSharedObstacle() {
  sharedObstacle ??= (() => {
    const base = new THREE.BoxGeometry(1.2, 0.5, 1.2);
    base.translate(0, -0.25, 0);
    const parts = [paint(base, 0x333842)];

    for (const offsetX of [-0.35, 0, 0.35]) {
      const spike = new THREE.ConeGeometry(0.18, 0.6, 8);
      spike.translate(offsetX, 0.3, 0);
      parts.push(paint(spike, 0xd9383a));
      spike.dispose();
    }

    const geometry = mergeGeometries(parts, false);
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.2,
      roughness: 0.45,
    });
    for (const part of parts) part.dispose();
    base.dispose();
    return { geometry, material };
  })();
  return sharedObstacle;
}

export function createObstacleModel() {
  const { geometry, material } = getSharedObstacle();
  const model = new EntityModel(new THREE.Mesh(geometry, material));
  // Geometria e material são compartilhados por todos os obstáculos: não podem ser
  // descartados ao remover um deles. Só a caixa de depuração é exclusiva da instância.
  model.dispose = () => {
    model.hitboxHelper?.geometry.dispose();
    model.hitboxHelper?.material.dispose();
    model.hitboxHelper = null;
  };
  return model;
}
