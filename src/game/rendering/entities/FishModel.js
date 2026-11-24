import * as THREE from 'three';
import { EntityModel } from './EntityModel.js';

let sharedFishTemplate;

// O verde-azulado tropical destaca o peixe da ponte marrom.
const BODY_COLOR = 0x1fb9b5;
const STRIPE_COLOR = 0xfff0d6;
const FIN_COLOR = 0x4ed6d0;
const FIN_TIP_COLOR = 0x128a87;
const EYE_WHITE = 0xfff6e8;
const PUPIL_COLOR = 0x201510;

const RADIAL_SEGMENTS = 8;

// Seções transversais da cauda (x negativo) ao focinho (x positivo).
// Dois anéis adjacentes marcados como faixa formam uma faixa creme limpa,
// porque cada face mantém uma única cor chapada.
const BODY_RINGS = [
  { x: -0.78, ry: 0.06, rz: 0.06 },
  { x: -0.60, ry: 0.25, rz: 0.19 },
  { x: -0.55, ry: 0.28, rz: 0.21, stripe: true },
  { x: -0.45, ry: 0.34, rz: 0.26, stripe: true },
  { x: -0.28, ry: 0.40, rz: 0.30 },
  { x: -0.04, ry: 0.46, rz: 0.34 },
  { x:  0.02, ry: 0.46, rz: 0.34, stripe: true },
  { x:  0.12, ry: 0.43, rz: 0.32, stripe: true },
  { x:  0.40, ry: 0.35, rz: 0.27 },
  { x:  0.60, ry: 0.22, rz: 0.18 },
  { x:  0.80, ry: 0.05, rz: 0.05 },
];

function ringPoint(ring, segment) {
  const theta = (segment / RADIAL_SEGMENTS) * Math.PI * 2;
  return [ring.x, Math.cos(theta) * ring.ry, Math.sin(theta) * ring.rz];
}

function createBodyGeometry() {
  const positions = [];
  const colors = [];
  const body = new THREE.Color(BODY_COLOR);
  const stripe = new THREE.Color(STRIPE_COLOR);

  const pushTriangle = (a, b, c, color) => {
    positions.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) colors.push(color.r, color.g, color.b);
  };

  for (let i = 0; i < BODY_RINGS.length - 1; i++) {
    const ring = BODY_RINGS[i];
    const next = BODY_RINGS[i + 1];
    const color = ring.stripe && next.stripe ? stripe : body;

    for (let j = 0; j < RADIAL_SEGMENTS; j++) {
      const a = ringPoint(ring, j);
      const b = ringPoint(ring, (j + 1) % RADIAL_SEGMENTS);
      const c = ringPoint(next, j);
      const d = ringPoint(next, (j + 1) % RADIAL_SEGMENTS);
      pushTriangle(a, b, d, color);
      pushTriangle(a, d, c, color);
    }
  }

  // Fecha as pequenas aberturas na raiz da cauda e no focinho.
  const first = BODY_RINGS[0];
  const last = BODY_RINGS[BODY_RINGS.length - 1];
  for (let j = 0; j < RADIAL_SEGMENTS; j++) {
    pushTriangle([first.x, 0, 0], ringPoint(first, (j + 1) % RADIAL_SEGMENTS), ringPoint(first, j), body);
    pushTriangle([last.x, 0, 0], ringPoint(last, j), ringPoint(last, (j + 1) % RADIAL_SEGMENTS), body);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

// Extruda um contorno 2D plano em uma nadadeira fina e facetada.
function createFinGeometry(outline, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) shape.lineTo(outline[i][0], outline[i][1]);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function addEye(group, side) {
  const sclera = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 8, 6),
    new THREE.MeshStandardMaterial({ color: EYE_WHITE, roughness: 0.6, flatShading: true }),
  );
  sclera.position.set(0.56, 0.12, side * 0.16);
  group.add(sclera);

  const pupil = new THREE.Mesh(
    new THREE.SphereGeometry(0.038, 6, 5),
    new THREE.MeshStandardMaterial({ color: PUPIL_COLOR, roughness: 0.3, flatShading: true }),
  );
  pupil.position.set(0.59, 0.12, side * 0.215);
  group.add(pupil);
}

function createFishTemplate() {
  if (sharedFishTemplate) return sharedFishTemplate;

  const group = new THREE.Group();

  const bodyMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.55,
    flatShading: true,
  });
  const finMaterial = new THREE.MeshStandardMaterial({
    color: FIN_COLOR,
    roughness: 0.6,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const finTipMaterial = new THREE.MeshStandardMaterial({
    color: FIN_TIP_COLOR,
    roughness: 0.6,
    flatShading: true,
    side: THREE.DoubleSide,
  });

  group.add(new THREE.Mesh(createBodyGeometry(), bodyMaterial));

  // Cauda: o pivô fica na raiz estreita para a nadadeira balançar naturalmente.
  const tail = new THREE.Group();
  tail.name = 'tail';
  tail.position.set(-0.74, 0, 0);
  const tailFin = new THREE.Mesh(createFinGeometry([
    [ 0.06,  0.10],
    [-0.16,  0.13],
    [-0.50,  0.40],
    [-0.34,  0.00],
    [-0.50, -0.40],
    [-0.16, -0.13],
    [ 0.06, -0.10],
  ], 0.05), finMaterial);
  tail.add(tailFin);
  group.add(tail);

  const dorsal = new THREE.Mesh(createFinGeometry([
    [ 0.20, 0.00],
    [ 0.02, 0.30],
    [-0.16, 0.28],
    [-0.30, 0.00],
  ], 0.05), finMaterial);
  dorsal.position.set(0.0, 0.42, 0);
  group.add(dorsal);

  const pelvic = new THREE.Mesh(createFinGeometry([
    [ 0.04, 0.00],
    [-0.10, 0.02],
    [-0.08, 0.16],
  ], 0.04), finTipMaterial);
  pelvic.position.set(-0.10, -0.42, 0);
  pelvic.rotation.x = Math.PI;
  group.add(pelvic);

  for (const side of [1, -1]) {
    addEye(group, side);
  }

  sharedFishTemplate = group;
  return group;
}

export class FishModel extends EntityModel {
  constructor() {
    const template = createFishTemplate();
    const clone = template.clone(true);
    clone.scale.setScalar(0.65);
    clone.rotation.z = Math.PI / 2;
    super(clone);
    this.tail = clone.getObjectByName('tail');
    this.swimPhase = Math.random() * Math.PI * 2;
  }

  update(dt) {
    super.update(dt);
    this.swimPhase += dt * 10;
    if (this.tail) {
      this.tail.rotation.y = Math.sin(this.swimPhase) * 0.45;
    }
  }

  // Geometria e materiais do template são compartilhados; só a caixa de depuração
  // é exclusiva de cada peixe e precisa ser liberada ao remover a entidade.
  dispose() {
    this.hitboxHelper?.geometry.dispose();
    this.hitboxHelper?.material.dispose();
    this.hitboxHelper = null;
  }
}

export function createFishModel() {
  return new FishModel();
}
