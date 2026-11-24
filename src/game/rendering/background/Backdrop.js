import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WATER_Y } from '../../constants.js';

// Fundo procedural low poly: céu em gradiente, nuvens, montanhas e colinas distantes, água
// e duas fileiras de platôs com o mesmo xadrez e grama da pista, com árvores low poly.
// Céu, nuvens, montanhas e água usam MeshBasicMaterial com a iluminação "assada" nas cores
// dos vértices; os platôs usam os materiais iluminados da pista e a névoa da cena os
// desbota com a distância. Tudo fica a distâncias reais atrás da pista (Z negativo), e a
// câmera em perspectiva gera o paralaxe sozinha.

export const PALETTE = {
  skyTop: '#2f6fd6',
  horizon: '#bfe8ff',
  skyBottom: '#8fd2f2',
  waterNear: '#2c86d4',
  waterGlint: '#e8f8ff',
  foam: '#f4fbff',
  cloud: '#ffffff',
  cloudShade: '#b7c9e8',
};

// Direção da luz usada para sombrear as facetas (de cima, à frente e da direita).
const LIGHT = new THREE.Vector3(0.45, 0.8, 0.55).normalize();

// Gerador pseudoaleatório com semente: o cenário é o mesmo a cada partida.
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pinta cada triângulo com uma cor só (low poly): cor base sombreada pela normal da face,
 * um pouco mais escura embaixo e misturada com o horizonte conforme a névoa (haze).
 */
export function bakeFacets(geometry, { color, shade = 0.35, haze = 0, minY = 0, maxY = 1 }) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.computeVertexNormals();
  const positions = flat.attributes.position;
  const normals = flat.attributes.normal;
  const colors = new Float32Array(positions.count * 3);
  const base = new THREE.Color(color);
  const horizon = new THREE.Color(PALETTE.horizon);
  const normal = new THREE.Vector3();
  const tint = new THREE.Color();
  for (let i = 0; i < positions.count; i += 3) {
    normal.fromBufferAttribute(normals, i);
    const light = 1 - shade + shade * Math.max(0, normal.dot(LIGHT));
    const height = (positions.getY(i) + positions.getY(i + 1) + positions.getY(i + 2)) / 3;
    const depth = 0.85 + 0.15 * THREE.MathUtils.clamp((height - minY) / (maxY - minY || 1), 0, 1);
    tint.copy(base).multiplyScalar(light * depth).lerp(horizon, haze);
    for (let k = 0; k < 3; k++) tint.toArray(colors, (i + k) * 3);
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return flat;
}

const TILE_OFFSETS = [-1, 0, 1, 2, 3];

const vertexColorMaterial = () => new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });

// Esfera invertida com gradiente vertical, sempre centrada na câmera.
export class SkyDome {
  constructor(radius = 450) {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          top: { value: new THREE.Color(PALETTE.skyTop) },
          horizon: { value: new THREE.Color(PALETTE.horizon) },
          bottom: { value: new THREE.Color(PALETTE.skyBottom) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDirection;
          void main() {
            vDirection = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 top;
          uniform vec3 horizon;
          uniform vec3 bottom;
          varying vec3 vDirection;
          void main() {
            float h = vDirection.y;
            vec3 color = h > 0.0
              ? mix(horizon, top, pow(smoothstep(0.0, 1.0, h), 0.55))
              : mix(horizon, bottom, smoothstep(0.0, 0.25, -h));
            gl_FragColor = vec4(color, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    );
    this.mesh.renderOrder = -1;
    this.mesh.frustumCulled = false;
  }

  follow(camera) {
    this.mesh.position.copy(camera.position);
  }
}

const WATER_VERTEX = /* glsl */ `
  uniform float time;
  uniform float waveFade;
  varying vec3 vWorld;
  // Ondas em coordenadas do mundo: o padrão não anda junto com a câmera.
  float wave(vec2 p) {
    return 0.28 * sin(p.x * 0.21 + time * 1.3)
      + 0.18 * sin(p.y * 0.37 - time * 1.1 + p.x * 0.07)
      + 0.10 * sin((p.x + p.y) * 0.53 + time * 2.0);
  }
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    // Longe da pista as ondas somem: lá as facetas ficariam menores que um pixel.
    world.y += wave(world.xz) * (1.0 - smoothstep(60.0, waveFade, abs(world.z)));
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }`;

const WATER_FRAGMENT = /* glsl */ `
  uniform float time;
  uniform vec3 nearColor;
  uniform vec3 farColor;
  uniform vec3 glintColor;
  uniform vec3 lightDirection;
  uniform float fadeStart;
  uniform float fadeEnd;
  varying vec3 vWorld;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  void main() {
    // Normal da faceta a partir das derivadas: cada triângulo fica com uma cor (low poly).
    vec3 normal = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    if (normal.y < 0.0) normal = -normal;
    float distance = clamp((abs(vWorld.z) - fadeStart) / (fadeEnd - fadeStart), 0.0, 1.0);
    vec3 color = mix(nearColor, farColor, pow(distance, 0.6));
    color *= 0.74 + 0.42 * max(dot(normal, lightDirection), 0.0);
    // Reflexos horizontais que cintilam e derivam devagar, como na água dos jogos de 16 bits.
    // Bordas duras e traços bem esticados em X, como os reflexos dos jogos de pixel.
    vec2 p = vec2(vWorld.x * 0.05 + time * 0.25, vWorld.z * 0.85);
    float glint = noise(p) * noise(p * vec2(1.9, 1.4) + vec2(7.3, -time * 0.4));
    color = mix(color, glintColor, step(0.43, glint) * 0.85 * (1.0 - distance * 0.7));
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }`;

// Espuma: faixa branca levemente transparente logo acima da linha d'água.
// Compartilhada por toda a cena; a geometria é quem varia.
let sharedFoamMaterial;
export function getFoamMaterial() {
  sharedFoamMaterial ??= new THREE.MeshBasicMaterial({
    color: PALETTE.foam, transparent: true, opacity: 0.85, depthWrite: false, fog: false,
  });
  return sharedFoamMaterial;
}

/**
 * Água low poly: malha com ondas animadas, facetas sombreadas, reflexos que cintilam e
 * espuma nas laterais da pista. Clareia até a cor do céu no horizonte. `near` negativo
 * estende a água para a frente da pista (visível na câmera oblíqua).
 */
export class WaterPlane {
  static CELL = 3; // espaçamento das colunas; a malha anda de célula em célula

  constructor({ y, near, far, width = 1400, rows = 90 }) {
    const columns = Math.round(width / WaterPlane.CELL);
    // Linhas mais juntas perto da pista e mais espaçadas no horizonte.
    const zs = [];
    for (let i = 0; i <= rows; i++) {
      const t = i / rows;
      zs.push(-(near + (far - near) * t ** 1.7));
    }
    const positions = [];
    const indices = [];
    for (const z of zs) {
      for (let c = 0; c <= columns; c++) positions.push(-width / 2 + c * WaterPlane.CELL, 0, z);
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const a = r * (columns + 1) + c;
        const b = a + columns + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b); // virados para cima (+Y)
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    this.uniforms = {
      time: { value: 0 },
      waveFade: { value: 260 },
      nearColor: { value: new THREE.Color(PALETTE.waterNear) },
      farColor: { value: new THREE.Color(PALETTE.skyBottom) },
      glintColor: { value: new THREE.Color(PALETTE.waterGlint) },
      lightDirection: { value: LIGHT.clone() },
      fadeStart: { value: 6 },
      fadeEnd: { value: far },
    };
    this.mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: WATER_VERTEX,
      fragmentShader: WATER_FRAGMENT,
    }));
    this.mesh.frustumCulled = false;

    // Espuma onde a terra da pista (z = ±metade da profundidade) encontra a água.
    const foamGeometry = new THREE.PlaneGeometry(width, 1.1);
    foamGeometry.rotateX(-Math.PI / 2);
    for (const z of [5.45, -5.45]) {
      const foam = new THREE.Mesh(foamGeometry, getFoamMaterial());
      foam.position.set(0, 0.18, z);
      this.mesh.add(foam);
    }
    this.baseY = y;
    this.group = this.mesh;
  }

  advance(dt) {
    this.uniforms.time.value += dt;
  }

  follow(camera, terrainY) {
    // Anda em passos de uma célula para os vértices não "nadarem" sob as ondas.
    const x = Math.round(camera.position.x / WaterPlane.CELL) * WaterPlane.CELL;
    this.mesh.position.set(x, this.baseY + terrainY, 0);
  }
}

/**
 * Faixa de colinas/montanhas facetadas que se repete sem emenda a cada `width` unidades.
 * Cópias da mesma geometria acompanham a câmera em X: uma atrás e três à frente, porque a
 * câmera oblíqua olha bem adiante na pista.
 */
export class RidgeLayer {
  constructor({ seed, z, baseY, width, columns, minHeight, maxHeight, depth, color, haze, followY }) {
    const random = seededRandom(seed);
    const step = width / columns;
    const heights = [];
    const lean = [];
    for (let i = 0; i < columns; i++) {
      // Picos e vales alternados para a silhueta não ficar uniforme.
      const peak = i % 2 === 0 ? 0.65 + 0.35 * random() : 0.25 + 0.35 * random();
      heights.push(minHeight + (maxHeight - minHeight) * peak);
      lean.push((random() - 0.5) * step * 0.6);
    }
    this.heights = heights;
    this.width = width;
    this.z = z;
    this.baseY = baseY;
    this.followY = followY;

    // Três fileiras por coluna: base (frente), meio (deslocado) e crista (fundo).
    const positions = [];
    const column = (i) => {
      const k = i % columns;
      const x = i * step;
      const h = heights[k];
      return {
        base: [x, 0, depth / 2],
        middle: [x + lean[k], h * 0.5, depth * (0.05 + 0.2 * Math.abs(lean[k]) / step)],
        top: [x, h, -depth / 2],
      };
    };
    const triangle = (a, b, c) => positions.push(...a, ...b, ...c);
    for (let i = 0; i < columns; i++) {
      const left = column(i);
      const right = column(i + 1);
      triangle(left.base, right.base, right.middle);
      triangle(left.base, right.middle, left.middle);
      triangle(left.middle, right.middle, right.top);
      triangle(left.middle, right.top, left.top);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const shaded = bakeFacets(geometry, { color, haze, minY: 0, maxY: maxHeight });

    const material = vertexColorMaterial();
    this.group = new THREE.Group();
    this.tiles = TILE_OFFSETS.map(() => new THREE.Mesh(shaded, material));
    this.group.add(...this.tiles);
  }

  /** Altura da crista em x (repete a cada `width`), para testes e posicionamento. */
  heightAt(x) {
    const step = this.width / this.heights.length;
    const i = Math.floor((((x % this.width) + this.width) % this.width) / step);
    return this.heights[i];
  }

  follow(camera, terrainY) {
    const current = Math.floor(camera.position.x / this.width);
    this.tiles.forEach((tile, k) => tile.position.set((current + TILE_OFFSETS[k]) * this.width, 0, 0));
    this.group.position.set(0, this.baseY + terrainY * this.followY, this.z);
  }
}

// Nuvens low poly (icosaedros achatados) que derivam devagar e reaparecem do outro lado.
export class CloudLayer {
  constructor({ seed, count, z, minY, maxY, span, speed }) {
    const random = seededRandom(seed);
    this.span = span;
    this.speed = speed;
    this.group = new THREE.Group();
    this.group.position.z = z;
    this.offsets = [];
    const material = vertexColorMaterial();
    for (let i = 0; i < count; i++) {
      const puffs = [];
      const puffCount = 3 + Math.floor(random() * 3);
      for (let p = 0; p < puffCount; p++) {
        const radius = 5 + random() * 6;
        const puff = new THREE.IcosahedronGeometry(radius, 0);
        puff.translate((p - (puffCount - 1) / 2) * 7 + random() * 3, random() * 3, random() * 4);
        puffs.push(puff);
      }
      // IcosahedronGeometry já vem sem índice: dá para juntar direto.
      const geometry = mergeGeometries(puffs);
      geometry.scale(1, 0.62, 1);
      const cloud = new THREE.Mesh(
        bakeFacets(geometry, { color: PALETTE.cloud, shade: 0.28, haze: 0.08, minY: -6, maxY: 6 }),
        material,
      );
      cloud.position.y = minY + (maxY - minY) * random();
      this.offsets.push(random() * span);
      this.group.add(cloud);
    }
    this.drift = 0;
  }

  advance(dt) {
    this.drift += this.speed * dt;
  }

  follow(camera, terrainY) {
    const left = camera.position.x - this.span / 2;
    this.group.children.forEach((cloud, i) => {
      const offset = (((this.offsets[i] + this.drift - left) % this.span) + this.span) % this.span;
      cloud.position.x = left + offset;
    });
    this.group.position.y = terrainY;
  }
}

const lerp = ([min, max], t) => min + (max - min) * t;

// UV do cilindro em unidades do mundo: xadrez de 4 u na lateral e faixas de 2,9 u no topo.
function cylinderWorldUVs(geometry, radius, height) {
  const uv = geometry.attributes.uv;
  const index = geometry.index;
  const [side, ...caps] = geometry.groups;
  const scaled = new Set();
  const scale = (group, su, sv) => {
    for (let i = group.start; i < group.start + group.count; i++) {
      const vertex = index.getX(i);
      if (scaled.has(vertex)) continue;
      scaled.add(vertex);
      uv.setXY(vertex, uv.getX(vertex) * su, uv.getY(vertex) * sv);
    }
  };
  scale(side, (2 * Math.PI * radius) / 4, height / 4);
  for (const cap of caps) scale(cap, (2 * radius) / 2.9, (2 * radius) / 4);
}

/** Materiais simples (sem textura) para quando não há os da pista, como nos testes. */
export function plainTerrainMaterials() {
  return {
    soil: new THREE.MeshStandardMaterial({ color: '#c97a3a' }),
    grass: new THREE.MeshStandardMaterial({ color: '#3fae43' }),
    grassEdge: new THREE.MeshStandardMaterial({ color: '#2c9638' }),
  };
}

function treeMaterials() {
  return {
    trunk: new THREE.MeshStandardMaterial({ color: '#7a4a26', flatShading: true }),
    leaves: new THREE.MeshStandardMaterial({ color: '#2f8f3a', flatShading: true }),
    leavesLight: new THREE.MeshStandardMaterial({ color: '#56b04a', flatShading: true }),
  };
}

// Árvore low poly: copa redonda (icosaedros) ou pinheiro (dois cones), em tronco curto.
function buildTree(random, materials, size) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * size, 0.32 * size, 2 * size, 5), materials.trunk);
  trunk.position.y = size;
  tree.add(trunk);
  if (random() < 0.55) {
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35 * size, 0), materials.leaves);
    crown.scale.y = 1.15;
    crown.position.y = 2.7 * size;
    const top = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8 * size, 0), materials.leavesLight);
    top.position.set(0.35 * size, 3.6 * size, 0.2 * size);
    tree.add(crown, top);
  } else {
    for (const [radius, y, material] of [[1.3, 2.6, materials.leaves], [0.95, 3.8, materials.leavesLight]]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(radius * size, 2.2 * size, 6), material);
      cone.position.y = y * size;
      tree.add(cone);
    }
  }
  tree.rotation.y = random() * Math.PI * 2;
  return tree;
}

// Platô: corpo de terra xadrez levemente cônico e uma aba de grama que sobra no topo.
function buildMesa(random, materials, trees, { radius, top, baseY, waterY, treeChance, treeSize }) {
  const segments = 6 + Math.floor(random() * 4);
  const height = top - baseY;
  const body = new THREE.CylinderGeometry(radius * 0.92, radius * 1.15, height, segments, 1);
  cylinderWorldUVs(body, radius, height);
  body.translate(0, baseY + height / 2, 0);
  const rim = new THREE.CylinderGeometry(radius, radius * 0.93, 1.1, segments, 1);
  cylinderWorldUVs(rim, radius, 1.1);
  rim.translate(0, top - 0.5, 0);

  const mesa = new THREE.Group();
  mesa.add(
    new THREE.Mesh(body, [materials.soil, materials.grass, materials.soil]),
    new THREE.Mesh(rim, [materials.grassEdge, materials.grass, materials.grassEdge]),
  );
  // Anel de espuma onde a água encontra o corpo do platô (raio do cone nessa altura).
  const atWater = (waterY - baseY) / height;
  const shore = radius * (1.15 + (0.92 - 1.15) * atWater);
  const foam = new THREE.RingGeometry(shore * 0.97, shore + 0.9 + radius * 0.04, segments, 1);
  foam.rotateX(-Math.PI / 2);
  foam.rotateY(-Math.PI / 2); // alinha os vértices do anel com os do cilindro
  foam.translate(0, waterY + 0.2, 0);
  mesa.add(new THREE.Mesh(foam, getFoamMaterial()));
  const treeCount = random() < treeChance ? 1 + Math.floor(random() * Math.min(3, radius / 3)) : 0;
  for (let i = 0; i < treeCount; i++) {
    const tree = buildTree(random, trees, treeSize * (0.8 + 0.4 * random()));
    const angle = random() * Math.PI * 2;
    const distance = radius * 0.55 * random();
    tree.position.set(Math.cos(angle) * distance, top + 0.05, Math.sin(angle) * distance);
    mesa.add(tree);
  }
  mesa.rotation.y = random() * Math.PI * 2;
  return mesa;
}

// Copia um grupo de triângulos da geometria para uma geometria não indexada. Assim todas
// as peças de um tile podem ser unidas por material, sem depender do layout de índices.
function geometryForGroup(geometry, group = null) {
  const index = geometry.index;
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  const start = group ? group.start : 0;
  const count = group ? group.count : (index ? index.count : position.count);
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);

  for (let i = 0; i < count; i++) {
    const vertex = index ? index.getX(start + i) : start + i;
    positions[i * 3] = position.getX(vertex);
    positions[i * 3 + 1] = position.getY(vertex);
    positions[i * 3 + 2] = position.getZ(vertex);
    if (normal) {
      normals[i * 3] = normal.getX(vertex);
      normals[i * 3 + 1] = normal.getY(vertex);
      normals[i * 3 + 2] = normal.getZ(vertex);
    }
    if (uv) {
      uvs[i * 2] = uv.getX(vertex);
      uvs[i * 2 + 1] = uv.getY(vertex);
    }
  }

  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  result.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  result.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  if (!normal) result.computeVertexNormals();
  return result;
}

// Um Mesh pode usar um array de materiais (o corpo e a borda dos platôs usam). Este
// separador devolve uma geometria por material para a fusão conseguir agrupar tudo.
function splitByMaterial(mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const groups = mesh.geometry.groups;
  const parts = [];
  if (Array.isArray(mesh.material) && groups.length > 0) {
    for (const group of groups) {
      const material = materials[group.materialIndex] ?? materials[0];
      if (material) parts.push({ geometry: geometryForGroup(mesh.geometry, group), material });
    }
  } else {
    parts.push({ geometry: geometryForGroup(mesh.geometry), material: materials[0] });
  }
  return parts;
}

/**
 * Funde todas as malhas de um grupo por material. O fundo procedural tem centenas de
 * mesas, árvores e anéis de espuma; sem isso cada peça vira uma chamada de desenho.
 * As geometrias originais são descartadas depois da fusão.
 */
function mergeStaticGroup(group) {
  group.updateMatrixWorld(true);
  const toLocal = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const byMaterial = new Map();
  const originals = new Set();

  group.traverse((object) => {
    if (!object.isMesh) return;
    object.updateWorldMatrix(true, false);
    const local = new THREE.Matrix4().multiplyMatrices(toLocal, object.matrixWorld);
    for (const part of splitByMaterial(object)) {
      part.geometry.applyMatrix4(local);
      if (!byMaterial.has(part.material)) byMaterial.set(part.material, []);
      byMaterial.get(part.material).push(part.geometry);
      originals.add(object.geometry);
    }
  });

  group.clear();
  for (const [material, geometries] of byMaterial) {
    const merged = mergeGeometries(geometries, false);
    if (merged) {
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      group.add(mesh);
      for (const geometry of geometries) geometry.dispose();
    } else {
      // Caso alguma geometria seja incompatível, mantém o visual em vez de sumir.
      for (const geometry of geometries) group.add(new THREE.Mesh(geometry, material));
    }
  }
  for (const geometry of originals) geometry.dispose();
  return group;
}

/**
 * Fileira de platôs que repete sem emenda a cada `width` unidades (nenhum platô cruza a
 * borda do trecho). Usa os materiais da pista, então combina com o chão em que o Sonic corre.
 */
export class MesaLayer {
  constructor({ seed, width, zRange, topRange, radiusRange, gapRange, baseY, waterY,
    treeChance, treeSize, materials, trees }) {
    const random = seededRandom(seed);
    this.width = width;
    this.mesas = [];
    this.foamMaterial = getFoamMaterial();
    const tile = new THREE.Group();
    let x = 0;
    for (;;) {
      const radius = lerp(radiusRange, random());
      x += lerp(gapRange, random()) + radius * 1.15;
      if (x + radius * 1.15 > width) break;
      const mesa = buildMesa(random, materials, trees, {
        radius, top: lerp(topRange, random()), baseY, waterY, treeChance, treeSize,
      });
      mesa.position.set(x, 0, lerp(zRange, random()));
      this.mesas.push({ x, radius });
      tile.add(mesa);
      x += radius * 1.15;
    }
    mergeStaticGroup(tile);
    this.group = new THREE.Group();
    this.tiles = TILE_OFFSETS.map((_, k) => (k === 0 ? tile : tile.clone()));
    this.group.add(...this.tiles);
  }

  follow(camera, terrainY) {
    const current = Math.floor(camera.position.x / this.width);
    this.tiles.forEach((tile, k) => tile.position.set((current + TILE_OFFSETS[k]) * this.width, 0, 0));
    // Mesma altura da água: a espuma fica sempre na linha d'água.
    this.group.position.y = terrainY;
  }
}

/** Junta céu, nuvens, montanhas, água e platôs; SceneView chama advance() e follow() a cada quadro. */
export class Backdrop {
  constructor(scene, materials = plainTerrainMaterials()) {
    const trees = treeMaterials();
    this.sky = new SkyDome();
    this.layers = [
      new WaterPlane({ y: WATER_Y, near: -120, far: 640 }),
      // Cordilheira mais alta e variada no horizonte.
      new RidgeLayer({
        seed: 3, z: -330, baseY: -14, width: 420, columns: 20, minHeight: 32, maxHeight: 78,
        depth: 50, color: '#7d9ad8', haze: 0.5, followY: 0.98,
      }),
      new RidgeLayer({
        seed: 7, z: -275, baseY: -14, width: 320, columns: 24, minHeight: 14, maxHeight: 32,
        depth: 28, color: '#4fa66a', haze: 0.38, followY: 0.96,
      }),
      // Ilhas grandes ao longe, desbotadas pela névoa.
      new MesaLayer({
        seed: 23, width: 520, zRange: [-195, -245], topRange: [6, 34], radiusRange: [16, 30],
        gapRange: [10, 55], baseY: -45, waterY: WATER_Y, treeChance: 0.6, treeSize: 3.4, materials, trees,
      }),
      new MesaLayer({
        seed: 13, width: 320, zRange: [-95, -135], topRange: [2, 22], radiusRange: [9, 17],
        gapRange: [6, 30], baseY: -45, waterY: WATER_Y, treeChance: 0.7, treeSize: 2.1, materials, trees,
      }),
      new MesaLayer({
        seed: 17, width: 260, zRange: [-24, -62], topRange: [-3, 9], radiusRange: [4, 10],
        gapRange: [8, 26], baseY: -45, waterY: WATER_Y, treeChance: 0.8, treeSize: 1.2, materials, trees,
      }),
      new CloudLayer({ seed: 5, count: 10, z: -345, minY: 55, maxY: 100, span: 1000, speed: 2 }),
    ];
    this.group = new THREE.Group();
    this.group.add(this.sky.mesh, ...this.layers.map((layer) => layer.group ?? layer.mesh));
    scene.add(this.group);
    scene.background = new THREE.Color(PALETTE.horizon);
    // Desbota a pista e os platôs distantes para a cor do horizonte (perspectiva aérea).
    scene.fog = new THREE.Fog(PALETTE.horizon, 110, 430);
  }

  advance(dt) {
    for (const layer of this.layers) layer.advance?.(dt);
  }

  follow(camera, terrainY) {
    this.sky.follow(camera);
    for (const layer of this.layers) layer.follow(camera, terrainY);
  }
}
