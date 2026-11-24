import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Chunk } from '../../logic/terrain/Chunk.js';
import { WATER_Y } from '../../constants.js';

// Os peixes saltam por pequenos alçapões na faixa do Sonic. Manter estas
// constantes aqui garante que o gerador e o tabuleiro concordem sobre os buracos.
export const FISH_HOLE_X = [8, 20, 32];
export const FISH_HOLE_Z = 0.1;
const HOLE_LENGTH = 1.2;
const HOLE_WIDTH = 0.64;

let woodMaterial;
function getWoodMaterial() {
  woodMaterial ??= new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.8,
    flatShading: true,
  });
  return woodMaterial;
}

const DECK_THICKNESS = 0.32;
const BEAM_HEIGHT = 0.45;
const BEAM_X = [4, 16, 28, 38];

const HOLE_Z_MIN = FISH_HOLE_Z - HOLE_WIDTH / 2;
const HOLE_Z_MAX = FISH_HOLE_Z + HOLE_WIDTH / 2;

const BOARD_BANDS = [
  { from: -5, to: -3.4, color: 0xa96b3b },
  { from: -3.4, to: -2.0, color: 0xb47542 },
  { from: -2.0, to: -0.65, color: 0xbf824e },
  { from: -0.65, to: HOLE_Z_MIN, color: 0xac7040 },
  { from: HOLE_Z_MAX, to: 0.65, color: 0xac7040 },
  { from: 0.65, to: 2.0, color: 0xbf824e },
  { from: 2.0, to: 3.4, color: 0xb47542 },
  { from: 3.4, to: 5, color: 0xa96b3b },
];
const CENTER_BAND = { from: HOLE_Z_MIN, to: HOLE_Z_MAX, color: 0xc08a52 };

const BEAM_COLOR = 0x714325;
const RAIL_COLOR = 0x8c5730;
const POST_COLOR = 0x7a4926;
const SUPPORT_COLOR = 0x633c21;

function coloredBox(width, height, depth, x, y, z, color) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  geometry.translate(x, y, z);

  const tint = new THREE.Color(color);
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function deckSegments(length) {
  const segments = [];
  let cursor = 0;
  for (const center of FISH_HOLE_X) {
    const start = center - HOLE_LENGTH / 2;
    const end = center + HOLE_LENGTH / 2;
    if (start > cursor) segments.push({ start: cursor, end: start, hole: false });
    segments.push({ start, end, hole: true });
    cursor = end;
  }
  if (cursor < length) segments.push({ start: cursor, end: length, hole: false });
  return segments;
}

export class BridgeChunkModel {
  constructor(chunk) {
    this.chunk = chunk;
    this.initialX = chunk.initialX;
    this.materials = [getWoodMaterial()];
    this.model = null;
  }

  getChunkModel() {
    if (this.model) return this.model;

    const length = Chunk.length;
    const height = this.chunk.baseY;
    const halfDepth = Chunk.depth / 2;
    const parts = [];

    // Tabuleiro sólido em todo lugar, exceto um pequeno alçapão em cada ponto de surgimento do peixe.
    for (const segment of deckSegments(length)) {
      const segmentLength = segment.end - segment.start;
      const x = (segment.start + segment.end) / 2;
      const y = height - DECK_THICKNESS / 2;

      for (const band of BOARD_BANDS) {
        parts.push(coloredBox(
          segmentLength, DECK_THICKNESS, band.to - band.from,
          x, y, (band.from + band.to) / 2, band.color,
        ));
      }
      if (!segment.hole) {
        parts.push(coloredBox(
          segmentLength, DECK_THICKNESS, CENTER_BAND.to - CENTER_BAND.from,
          x, y, (CENTER_BAND.from + CENTER_BAND.to) / 2, CENTER_BAND.color,
        ));
      }
    }

    // Vigas abaixo do tabuleiro, entre os alçapões.
    for (const x of BEAM_X) {
      parts.push(coloredBox(
        0.45, BEAM_HEIGHT, Chunk.depth - 0.4,
        x, height - DECK_THICKNESS - BEAM_HEIGHT / 2, 0, BEAM_COLOR,
      ));
    }

    // Guarda-corpos: duas travessas e postes espaçados igualmente em cada borda externa.
    for (const side of [-1, 1]) {
      const railZ = side * (halfDepth - 0.12);
      for (const railY of [0.5, 1.0]) {
        parts.push(coloredBox(length, 0.12, 0.14, length / 2, height + railY, railZ, RAIL_COLOR));
      }
      for (let x = 0; x <= length; x += 10) {
        parts.push(coloredBox(0.18, 1.1, 0.18, x, height + 0.55, railZ, POST_COLOR));
      }
    }

    // Os pilares descem das vigas até além da linha d'água, para sempre
    // parecerem fincados no rio em vez de pararem no ar.
    const pierTop = height - DECK_THICKNESS - BEAM_HEIGHT;
    const pierBottom = height + WATER_Y - 0.5;
    for (const x of BEAM_X) {
      for (const z of [-3.4, 3.4]) {
        parts.push(coloredBox(
          0.35, pierTop - pierBottom, 0.35,
          x, (pierTop + pierBottom) / 2, z, SUPPORT_COLOR,
        ));
      }
    }

    const geometry = mergeGeometries(parts, false);
    geometry.computeVertexNormals();
    for (const part of parts) part.dispose();

    this.model = new THREE.Mesh(geometry, getWoodMaterial());
    this.model.position.x = this.initialX;
    this.model.receiveShadow = true;
    this.model.castShadow = true;
    return this.model;
  }

  destroyChunk() {
    if (!this.model) return;
    this.model.removeFromParent();
    this.model.geometry.dispose();
    this.model = null;
  }
}
