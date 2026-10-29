import * as THREE from 'three';
import { Chunk } from './Chunk.js';
import { chunkStrategies } from './strategies.js';

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

export function createGround() {
  const materials = [
    new THREE.MeshStandardMaterial({ map: pattern(['#a56832', '#d49a56'], true), side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ map: pattern(['#3a7d44', '#58a84f']), side: THREE.DoubleSide }),
  ];
  const ground = new THREE.Group();
  let surfaceStart = -100;

  for (let i = 0; i < 5; i++) {
    const startX = -100 + i * Chunk.length;
    const chunk = new Chunk(
      startX, 
      chunkStrategies.flat, 
      materials, 
      surfaceStart
    );
    ground.add(chunk.getChunkModel());
    surfaceStart = chunk.surfaceEnd;
  }

  return ground;
}
