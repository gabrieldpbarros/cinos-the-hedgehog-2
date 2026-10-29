import * as THREE from 'three';

export class Chunk {
  static length = 40;    // X
  static depth = 10;     // Z
  static soilDepth = 3;  // Y (0 a -soilDepth)

  constructor(
    initialX,
    chunkType,
    materials,
    surfaceStart = initialX
  ) {
    this.initialX = initialX;         // posicao global do inicio do chunk
    this.type = chunkType;            // tipo do chunk (reto, rampa, curva, ...)
    this.materials = materials;       // terra e grama, respectivamente
    this.surfaceStart = surfaceStart; // comprimento da superficie
    this.model = null;                // modelo final (Mesh)

    if (typeof chunkType?.heightAt !== 'function') {
      throw new TypeError('Chunk type must define heightAt(x, length)');
    }

    const rise = chunkType.heightAt(Chunk.length, Chunk.length) - chunkType.heightAt(0, Chunk.length);
    this.surfaceEnd = surfaceStart + Math.hypot(Chunk.length, rise);
  }

  getChunkModel() {
    if (this.model)
      return this.model;

    const length = Chunk.length;
    const halfDepth = Chunk.depth / 2; // personagem se posiciona no meio de Z
    const bottom = -Chunk.soilDepth;
    const leftHeight = this.type.heightAt(0, length);
    const rightHeight = this.type.heightAt(length, length);

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
        [[0, bottom, z], [length, bottom, z], [length, rightHeight, z], [0, leftHeight, z]],
        [soilSide(0, bottom), soilSide(length, bottom), soilSide(length, rightHeight), soilSide(0, leftHeight)],
        0
      );
    }

    // DIANTEIRA E TRASEIRA (+X e -X)
    for (const [x, y] of [[0, leftHeight], [length, rightHeight]]) {
      face(
        [[x, bottom, -halfDepth], [x, bottom, halfDepth], [x, y, halfDepth], [x, y, -halfDepth]],
        [soilEnd(-halfDepth, bottom), soilEnd(halfDepth, bottom), soilEnd(halfDepth, y), soilEnd(-halfDepth, y)],
        0
      );
    }

    // SUPERIOR (+Y)
    face(
      [[0, leftHeight, -halfDepth], [length, rightHeight, -halfDepth], [length, rightHeight, halfDepth], [0, leftHeight, halfDepth]],
      [top(this.surfaceStart, -halfDepth), top(this.surfaceEnd, -halfDepth),
        top(this.surfaceEnd, halfDepth), top(this.surfaceStart, halfDepth)],
      1
    );

    // INFERIOR (-Y)
    face(
      [[0, bottom, -halfDepth], [length, bottom, -halfDepth],
        [length, bottom, halfDepth], [0, bottom, halfDepth]],
      [soilSide(0, -halfDepth), soilSide(length, -halfDepth),
        soilSide(length, halfDepth), soilSide(0, halfDepth)],
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
