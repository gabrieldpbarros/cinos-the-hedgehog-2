import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Chunk, bridgeSagAt } from '../../logic/terrain/Chunk.js';
import { WATER_Y } from '../../constants.js';

// Ponte de corda sobre a água: troncos horizontais atravessam a pista e cordas
// na altura do tabuleiro os mantêm unidos. Um único tronco é omitido em cada
// ponto de salto, deixando um vão estreito por onde o peixe passa sem recortar
// a madeira. As cordas continuam cobrindo o vão sob os pés do Sonic.
export const FISH_SPAWN_X = [8, 20, 32];
export const FISH_SPAWN_Z = 0.1;

const LOG_SPACING = 0.8;
const LOG_RADIUS = 0.40;
const SINGLE_LOG_GAP = 0.1;
const LOG_COLORS = [0x8b5a2b, 0x9c6634, 0x7f5126];

// A ponte e mais estreita que o chunk de terra, como no original.
const BRIDGE_DEPTH = 7;
const ROPE_Z = [-3.2, 0, 3.2];
const ROPE_RADIUS = 0.045;
const ROPE_COLOR = 0xa88954;

// Postes de amarração nas pontas, ligados às cordas do tabuleiro.
const POST_OFFSET = 0.6;
const POST_RADIUS = 0.2;
const POST_HEIGHT = 2.2;
const POST_COLOR = 0x8b5a2b;
const BAND_COLOR = 0xffc23d;
const ANCHOR_INSET = 5;

let bridgeMaterial;
function getBridgeMaterial() {
  bridgeMaterial ??= new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    flatShading: true,
  });
  return bridgeMaterial;
}

function paint(geometry, color) {
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

function ropeBetween(a, b, radius, color) {
  const direction = new THREE.Vector3().subVectors(b, a);
  const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 6);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0), direction.clone().normalize(),
  ));
  const middle = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  geometry.translate(middle.x, middle.y, middle.z);
  return paint(geometry, color);
}

function ropeGeometry(z, height, length) {
  const points = [];
  for (let x = 0; x <= length; x++) {
    points.push(new THREE.Vector3(x, height - bridgeSagAt(x, length) + 0.01, z));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, length, ROPE_RADIUS, 4, false);
}

export class BridgeChunkModel {
  constructor(chunk) {
    this.chunk = chunk;
    this.initialX = chunk.initialX;
    this.materials = [getBridgeMaterial()];
    this.model = null;
  }

  getChunkModel() {
    if (this.model) return this.model;

    const length = Chunk.length;
    const width = BRIDGE_DEPTH;
    const height = this.chunk.baseY;
    const parts = [];

    let logIndex = 0;
    for (let x = 0; x < length; x += LOG_SPACING) {
      if (FISH_SPAWN_X.some((spawn) => Math.abs(x - spawn) < SINGLE_LOG_GAP)) continue;

      const log = new THREE.CylinderGeometry(LOG_RADIUS, LOG_RADIUS, width - 0.4, 8);
      log.rotateX(Math.PI / 2);
      log.translate(x, height - bridgeSagAt(x, length) - LOG_RADIUS, 0);
      parts.push(paint(log, LOG_COLORS[logIndex % LOG_COLORS.length]));
      logIndex += 1;
    }

    for (const z of ROPE_Z) {
      parts.push(paint(ropeGeometry(z, height, length), ROPE_COLOR));
    }

    // Postes nas duas bordas das pontas e cordas que os ligam ao tabuleiro.
    for (const x of [POST_OFFSET, length - POST_OFFSET]) {
      for (const z of ROPE_Z.filter((value) => value !== 0)) {
        const postZ = Math.sign(z) * (width / 2 - 0.3);
        // O poste desce até a água para sustentar também o chunk de ponte
        // seguinte quando dois chunks se encontram.
        const postTop = height - 0.3 + POST_HEIGHT;
        const postBottom = height + WATER_Y - 0.5;
        const post = new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, postTop - postBottom, 8);
        post.translate(x, (postTop + postBottom) / 2, postZ);
        parts.push(paint(post, POST_COLOR));

        for (const bandY of [height + 0.4, height + 1.4]) {
          const band = new THREE.CylinderGeometry(POST_RADIUS + 0.03, POST_RADIUS + 0.03, 0.12, 8);
          band.translate(x, bandY, postZ);
          parts.push(paint(band, BAND_COLOR));
        }

        const innerX = x < length / 2 ? x + ANCHOR_INSET : x - ANCHOR_INSET;
        parts.push(ropeBetween(
          new THREE.Vector3(x, height - 0.3 + POST_HEIGHT, postZ),
          new THREE.Vector3(innerX, height - bridgeSagAt(innerX, length) + 0.05, z),
          ROPE_RADIUS,
          ROPE_COLOR,
        ));
      }
    }

    const geometry = mergeGeometries(parts, false);
    geometry.computeVertexNormals();
    for (const part of parts) part.dispose();

    this.model = new THREE.Mesh(geometry, getBridgeMaterial());
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
