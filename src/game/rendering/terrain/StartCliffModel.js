import * as THREE from 'three';
import { Chunk } from '../../logic/terrain/Chunk.js';

// Penhasco no limite esquerdo da pista: o "muro invisível" (minX do Sonic) passa a ter
// corpo. Mais alto que o pulo do Sonic (~4 u), com o mesmo xadrez e grama da pista.
export const CLIFF = {
  height: 7,    // acima da pista; o topo do Sonic no pulo fica em ~5,5
  length: 60,   // para a esquerda
  backDepth: 8, // além do fundo da pista, para não abrir fresta atrás
  lip: 0.45,    // aba de grama que sobra na frente e no topo
  lipHeight: 0.9,
};

// Cada face recebe UV a partir da posição no mundo, como as laterais dos chunks:
// quadrados de 4 u na terra e faixas de 2,9 u na grama.
function worldUVs(geometry, offsetX, offsetY, topScale) {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) + offsetX;
    const y = position.getY(i) + offsetY;
    const z = position.getZ(i);
    if (Math.abs(normal.getY(i)) > 0.5) uv.setXY(i, x / topScale, z / 4);
    else if (Math.abs(normal.getX(i)) > 0.5) uv.setXY(i, z / 4, y / 4);
    else uv.setXY(i, x / 4, y / 4);
  }
  uv.needsUpdate = true;
}

// Caixa entre dois cantos; grupos do BoxGeometry: +x, -x, +y, -y, +z, -z.
function box(min, max) {
  const size = new THREE.Vector3().subVectors(max, min);
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  geometry.translate((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
  return geometry;
}

export class StartCliffModel {
  constructor({ soil, grass, grassEdge }) {
    const halfDepth = Chunk.depth / 2;
    const top = CLIFF.height;
    this.body = new THREE.Mesh(
      box(
        new THREE.Vector3(-CLIFF.length, top - Chunk.soilDepth - CLIFF.height, -halfDepth - CLIFF.backDepth),
        new THREE.Vector3(0, top, halfDepth),
      ),
      [soil, soil, grass, soil, soil, soil],
    );
    this.lip = new THREE.Mesh(
      box(
        new THREE.Vector3(-CLIFF.length, top - CLIFF.lipHeight, -halfDepth - CLIFF.backDepth),
        new THREE.Vector3(CLIFF.lip, top + 0.08, halfDepth + CLIFF.lip),
      ),
      [grassEdge, grassEdge, grass, grassEdge, grassEdge, grassEdge],
    );
    this.group = new THREE.Group();
    this.group.add(this.body, this.lip);
    for (const mesh of this.group.children) {
      mesh.receiveShadow = true;
      mesh.castShadow = true;
    }
    this.placedAt = null;
  }

  /** Encosta o penhasco no início do chunk (a face fica em x = chunk.initialX). */
  placeAt(chunk) {
    if (this.placedAt === chunk.initialX) return;
    this.placedAt = chunk.initialX;
    const height = chunk.getHeightAtX(chunk.initialX);
    this.group.position.set(chunk.initialX, height, 0);
    worldUVs(this.body.geometry, chunk.initialX, height, 2.9);
    worldUVs(this.lip.geometry, chunk.initialX, height, 2.9);
  }

  getModel() {
    return this.group;
  }
}
