import * as THREE from 'three';
import { Chunk } from '../../logic/terrain/Chunk.js';

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

export class GreenHillChunkModel {
  constructor(chunk) {
    this.chunk = chunk;
    this.initialX = chunk.initialX;
    this.materials = [ // terra e grama, respectivamente
      new THREE.MeshStandardMaterial({ map: pattern(['#a56832', '#d49a56'], true), side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ map: pattern(['#3a7d44', '#58a84f']), side: THREE.DoubleSide }),
    ];  
    this.model = null; // modelo final (Mesh)
  }

  getChunkModel() {
    if (this.model)
      return this.model;

    const length = Chunk.length;
    const halfDepth = Chunk.depth / 2; // personagem se posiciona no meio de Z
    const leftHeight = this.chunk.getHeightAtX(this.initialX);
    const rightHeight = this.chunk.endY;
    const leftBottom = leftHeight - Chunk.soilDepth;
    const rightBottom = rightHeight - Chunk.soilDepth;

    // construção semelhante à do WebGL2
    const positions = [];  // X (0 a 40), Y (0 a -soilDepth), Z (-halfDepth, halfDepth) da geometria
    const uvs = [];        // coordenadas UV de cada face
    const indices = [];    // vertices do triangulo
    const geometry = new THREE.BufferGeometry();

    const face = (corners, texCoords, materialIndex) => {
      const start = positions.length / 3;
      for (let i = 0; i < 4; i++) {
        positions.push(...corners[i]);
        uvs.push(...texCoords[i]);
      }
      indices.push(start, start + 1, start + 2, 
                   start, start + 2, start + 3);
      geometry.addGroup(indices.length - 6, 6, materialIndex);
    };

    const soilSide = (x, y) => [(this.initialX + x) / 4, y / 4];
    const soilEnd = (z, y) => [z / 4, y / 4];
    const top = (distance, z) => [distance / 2.9, z / 4];

    // =================================================================================================================
    // CALCULO DOS PONTOS DAS FACES DA GEOMETRIA

    // LATERAIS (+Z e -Z)
    for (const z of [-halfDepth, halfDepth]) {
      face(
        //Inferior esq,   Inferior direito,       Superior direito,      Superior esquerdo
        [[0, leftBottom, z], [length, rightBottom, z], [length, rightHeight, z], [0, leftHeight, z]],
        [soilSide(0, leftBottom), soilSide(length, rightBottom), soilSide(length, rightHeight), soilSide(0, leftHeight)],
        0
      );
    }

    // DIANTEIRA E TRASEIRA (+X e -X)
    for (const [x, topY, bottomY] of [[0, leftHeight, leftBottom], [length, rightHeight, rightBottom]]) {
      face(
        [[x, bottomY, -halfDepth], [x, bottomY, halfDepth], [x, topY, halfDepth], [x, topY, -halfDepth]],
        [soilEnd(-halfDepth, bottomY), soilEnd(halfDepth, bottomY), soilEnd(halfDepth, topY), soilEnd(-halfDepth, topY)],
        0
      );
    }

    // SUPERIOR (+Y)
    face(
      [[0, leftHeight, -halfDepth], [length, rightHeight, -halfDepth], [length, rightHeight, halfDepth], [0, leftHeight, halfDepth]],
      [top(this.chunk.surfaceStart, -halfDepth), top(this.chunk.surfaceEnd, -halfDepth), top(this.chunk.surfaceEnd, halfDepth), top(this.chunk.surfaceStart, halfDepth)],
      1
    );

    // INFERIOR (-Y)
    face(
      [[0, leftBottom, -halfDepth], [length, rightBottom, -halfDepth], [length, rightBottom, halfDepth], [0, leftBottom, halfDepth]],
      [soilSide(0, -halfDepth), soilSide(length, -halfDepth), soilSide(length, halfDepth), soilSide(0, halfDepth)],
      0
    );
    // =================================================================================================================

    // Construcao da geometria
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    this.model = new THREE.Mesh(geometry, this.materials);
    this.model.position.x = this.initialX;
    return this.model;
  }

  destroyChunk() {
    if (!this.model) return;
    this.model.removeFromParent();
    this.model.geometry.dispose();
    this.model = null;
  }
}
