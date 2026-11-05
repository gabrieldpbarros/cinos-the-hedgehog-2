import * as THREE from 'three';
import { ChunkModel } from './ChunkModel.js';

function pattern(colors, checker = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      context.fillStyle = colors[checker ? (row + col) % 2 : col];
      context.fillRect(col * 32, row * 32, 32, 32);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

export function createGround(chunks) {
  const materials = [
    new THREE.MeshStandardMaterial({ map: pattern(['#a56832', '#d49a56'], true), side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ map: pattern(['#3a7d44', '#58a84f']), side: THREE.DoubleSide }),
  ];
  const ground = new THREE.Group();

  for (let chunk of chunks) {
    const chunkModel = new ChunkModel(
      chunk,
      materials
    );
    ground.add(chunkModel.getChunkModel());
  }

  return ground;
}

export function updateGround(ground) {

}

export function getVetorNormal(ground, x, y) {

}
