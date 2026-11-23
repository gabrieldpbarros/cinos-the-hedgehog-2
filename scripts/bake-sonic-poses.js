// Gera os clipes de pose do Sonic ("Crouch", "LookUp") a partir do esqueleto do GLB.
// O GLB não traz essas animações; este script resolve cada pose uma vez (IK em
// scripts/sonic-poses/SonicPoseSolver.js) e grava keyframes que o jogo toca no
// AnimationMixer como qualquer outra animação. Uso: npm run bake:poses
import { readFile, writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { POSES, SonicPoseSolver } from './sonic-poses/SonicPoseSolver.js';

const MODEL_DIR = new URL('../public/model-imports/sonic_lost_world_sonic_model_animator_fan/', import.meta.url);
const OUTPUT = new URL('../src/game/rendering/entities/sonicPoseClips.js', import.meta.url);
const EPSILON = 1e-5;

// O FileLoader do three (usado para o .bin embutido) emite ProgressEvent, que só existe no navegador.
globalThis.ProgressEvent ??= class extends Event {
  constructor(type, init = {}) {
    super(type);
    Object.assign(this, init);
  }
};

async function loadSkeleton() {
  // Só o esqueleto e as animações interessam: sem texturas, com o .bin embutido.
  const json = JSON.parse(await readFile(new URL('scene.gltf', MODEL_DIR), 'utf8'));
  delete json.images;
  delete json.textures;
  delete json.samplers;
  for (const material of json.materials ?? []) {
    for (const key of Object.keys(material)) if (key.endsWith('Texture')) delete material[key];
    const pbr = material.pbrMetallicRoughness ?? {};
    for (const key of Object.keys(pbr)) if (key.endsWith('Texture')) delete pbr[key];
  }
  for (const buffer of json.buffers) {
    const bytes = await readFile(new URL(buffer.uri, MODEL_DIR));
    buffer.uri = `data:application/octet-stream;base64,${bytes.toString('base64')}`;
  }
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(JSON.stringify(json), '', resolve, reject);
  });
}

const snapshot = (bones) => bones.map((bone) => ({
  position: bone.position.clone(),
  quaternion: bone.quaternion.clone(),
  scale: bone.scale.clone(),
}));

function restoreSnapshot(bones, state) {
  bones.forEach((bone, i) => {
    bone.position.copy(state[i].position);
    bone.quaternion.copy(state[i].quaternion);
    bone.scale.copy(state[i].scale);
  });
}

const same = (a, b) => (a.isQuaternion ? a.angleTo(b) < EPSILON : a.distanceTo(b) < EPSILON);
const round = (value) => Number(value.toPrecision(6));

// Uma trilha de um keyframe por propriedade que difere do repouso. Dura 1 s porque o
// mixer repete o clipe e duração 0 quebraria o loop.
function buildClip(name, bones, rest, pose) {
  const types = {
    position: THREE.VectorKeyframeTrack,
    quaternion: THREE.QuaternionKeyframeTrack,
    scale: THREE.VectorKeyframeTrack,
  };
  const tracks = [];
  bones.forEach((bone, i) => {
    for (const [property, Track] of Object.entries(types)) {
      if (same(pose[i][property], rest[i][property])) continue;
      tracks.push(new Track(`${bone.name}.${property}`, [0], pose[i][property].toArray().map(round)));
    }
  });
  return new THREE.AnimationClip(name, 1, tracks);
}

const gltf = await loadSkeleton();
const model = gltf.scene;
const bones = [];
model.traverse((object) => { if (object.isBone) bones.push(object); });
const rest = snapshot(bones);

// As poses partem do primeiro quadro do Idle (ombros, braços e dedos já animados).
const idle = gltf.animations.find((clip) => clip.name === 'Idle');
const mixer = new THREE.AnimationMixer(model);
mixer.clipAction(idle).play();
mixer.update(0);
mixer.stopAllAction();
const idleFrame = snapshot(bones);

const solver = new SonicPoseSolver(model);
const clips = Object.entries(POSES).map(([name, pose]) => {
  restoreSnapshot(bones, idleFrame);
  solver.solve(pose);
  // O uuid fica no arquivo: o AnimationMixer guarda as ações por uuid do clipe.
  return THREE.AnimationClip.toJSON(buildClip(name, bones, rest, snapshot(bones)));
});

const body = clips.map((clip) => {
  const tracks = clip.tracks.map((track) => `      ${JSON.stringify(track)}`).join(',\n');
  return `  {\n    "name": ${JSON.stringify(clip.name)},\n    "duration": ${clip.duration},\n` +
    `    "blendMode": ${clip.blendMode},\n    "uuid": ${JSON.stringify(clip.uuid)},\n` +
    `    "tracks": [\n${tracks}\n    ]\n  }`;
}).join(',\n');
await writeFile(OUTPUT, '// Gerado por scripts/bake-sonic-poses.js (npm run bake:poses). Não editar à mão.\n' +
  `export default [\n${body},\n];\n`);
console.log(`Clipes gravados em ${OUTPUT.pathname}: ${clips.map((c) => `${c.name} (${c.tracks.length} trilhas)`).join(', ')}`);
