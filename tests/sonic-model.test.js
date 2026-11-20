import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import { SonicModel, gaitWeights } from '../src/game/rendering/entities/SonicModel.js';
import poseClips from '../src/game/rendering/entities/sonicPoseClips.js';

const makeClips = () => ['Idle', 'Walk', 'Jog', 'Run', 'Spin', 'Brake', 'Crouch', 'LookUp'].map(
  (name) => new THREE.AnimationClip(name, 1, []),
);

// Lógica falsa com a mesma interface que o SonicModel consulta em Sonic.
function makeLogic(actions = [], speedX = 0) {
  return {
    onGround: true,
    speed: { x: speedX, y: 0 },
    currentActions: new Set(actions),
    braking: false,
    getSpeed() { return this.speed; },
    isSpinning() { return !this.onGround || this.currentActions.has('JUMP'); },
    isBraking() { return this.braking; },
    isCrouching() { return this.onGround && this.currentActions.has('CROUCH') && Math.abs(this.speed.x) < 0.01; },
    isLookingUp() {
      return this.onGround && this.currentActions.has('LOOK_UP') && !this.currentActions.has('CROUCH') &&
        Math.abs(this.speed.x) < 0.01;
    },
  };
}

test('Sonic animation follows jump and absolute horizontal speed', () => {
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial()));
  const clips = makeClips();
  const model = new SonicModel(scene, clips);
  const logic = makeLogic();
  const currentClip = () => model.activeAction.getClip().name;
  const baseY = model.model.position.y;

  model.update(0.05, logic);
  assert.equal(currentClip(), 'Idle');
  const weight = (name) => model.actions.get(name).getEffectiveWeight();

  // Top speed: Run only, legs matched to the ground (3.5 u/s at 1x).
  logic.speed.x = -20;
  for (let i = 0; i < 4; i++) model.update(0.05, logic);
  assert.equal(currentClip(), 'Run');
  assert.ok(Math.abs(weight('Run') - 1) < 1e-9);
  assert.ok(Math.abs(model.activeAction.timeScale - 20 / 3.5) < 1e-9);

  // Walking: rate = speed / foot speed (5 u/s at 1x), so the planted foot does not slide.
  logic.speed.x = 3;
  for (let i = 0; i < 4; i++) model.update(0.05, logic);
  assert.equal(currentClip(), 'Walk');
  assert.ok(Math.abs(model.activeAction.timeScale - 3 / 5) < 1e-9);

  // Between 5 and 9 u/s Walk and Jog play together, in the same normalized phase.
  logic.speed.x = 7;
  model.update(0.05, logic);
  assert.ok(Math.abs(weight('Walk') - 0.5) < 1e-9);
  assert.ok(Math.abs(weight('Jog') - 0.5) < 1e-9);
  const phase = (name) => model.actions.get(name).time / model.clips.get(name).duration;
  assert.ok(Math.abs(phase('Walk') - phase('Jog')) < 1e-9);
  assert.equal(model.actions.get('Walk').timeScale, model.actions.get('Jog').timeScale);

  logic.speed.x = 25;
  logic.currentActions.add('BOOST');
  model.update(0.05, logic);
  assert.equal(currentClip(), 'Run');
  logic.braking = true;
  model.update(0.05, logic);
  assert.equal(currentClip(), 'Brake');
  assert.equal(model.activeAction.timeScale, 1);
  logic.speed.x = 3;
  model.update(1.1, logic);
  assert.equal(currentClip(), 'Brake');
  assert.equal(model.activeAction.isRunning(), true);
  logic.braking = false;
  model.update(0.05, logic);
  assert.equal(currentClip(), 'Walk');
  logic.speed.x = 25;
  logic.onGround = false;
  logic.speed.y = 12;
  model.update(0.05, logic);
  assert.equal(currentClip(), 'Spin');
  assert.ok(model.model.position.y > baseY);
  assert.equal(model.activeAction.timeScale, 2);
  logic.onGround = true;
  logic.speed.x = 0;
  logic.speed.y = 0;
  logic.currentActions.add('JUMP');
  model.update(0.05, logic);
  assert.equal(currentClip(), 'Spin');
  assert.equal(model.activeAction.timeScale, 1);
  logic.currentActions.delete('JUMP');
  model.update(0.2, logic);
  assert.equal(currentClip(), 'Idle');
  model.update(0.2, logic);
  assert.ok(Math.abs(model.model.position.y - baseY) < 1e-9);
});

test('gait weights blend smoothly from walk to jog to run and always sum to 1', () => {
  let previous = gaitWeights(0);
  assert.deepEqual(previous, { Walk: 1, Jog: 0, Run: 0 });
  for (let speed = 0.25; speed <= 22; speed += 0.25) {
    const weights = gaitWeights(speed);
    assert.ok(Math.abs(weights.Walk + weights.Jog + weights.Run - 1) < 1e-9);
    for (const name of ['Walk', 'Jog', 'Run']) {
      assert.ok(Math.abs(weights[name] - previous[name]) < 0.1, `${name} changes gradually at ${speed}`);
    }
    previous = weights;
  }
  assert.deepEqual(gaitWeights(11), { Walk: 0, Jog: 1, Run: 0 });
  assert.equal(gaitWeights(20).Run, 1);
});

test('state changes crossfade without ever dropping to the rest pose', () => {
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial()));
  const model = new SonicModel(scene, makeClips());
  const logic = makeLogic();
  const total = () => [...model.actions.values()].reduce((sum, a) => sum + a.getEffectiveWeight(), 0);

  model.update(0.05, logic);
  for (const [speedX, braking] of [[4, false], [12, true], [12, false], [0, false], [6, false]]) {
    logic.speed.x = speedX;
    logic.braking = braking;
    model.update(0.04, logic);
    assert.ok(Math.abs(total() - 1) < 1e-9, `weights sum to 1 after ${speedX} u/s`);
  }
});

test('crouch and look up play their baked pose clips only while stopped', () => {
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial()));
  const model = new SonicModel(scene, makeClips());
  const logic = makeLogic(['CROUCH']);
  const baseScale = model.model.scale.clone();
  const currentClip = () => model.activeAction.getClip().name;

  model.update(0.05, logic);
  assert.equal(currentClip(), 'Crouch');
  assert.ok(model.model.scale.equals(baseScale));

  logic.currentActions.add('LOOK_UP');
  model.update(0.05, logic);
  assert.equal(currentClip(), 'Crouch', 'crouch wins when both are held');
  logic.currentActions.delete('CROUCH');
  model.update(0.05, logic);
  assert.equal(currentClip(), 'LookUp');

  logic.speed.x = 5;
  model.update(0.05, logic);
  assert.equal(currentClip(), 'Walk', 'still braking: no pose yet');
});

test('baked pose clips lower the hips for Crouch and tilt the head back for LookUp', () => {
  const clips = poseClips.map((data) => THREE.AnimationClip.parse(data));
  assert.deepEqual(clips.map((clip) => clip.name), ['Crouch', 'LookUp']);
  const [crouch, lookUp] = clips;
  assert.notEqual(crouch.uuid, lookUp.uuid);

  const gltf = JSON.parse(readFileSync(new URL(
    '../public/model-imports/sonic_lost_world_sonic_model_animator_fan/scene.gltf', import.meta.url,
  ), 'utf8'));
  const restHipsY = gltf.nodes.find((node) => node.name === 'hips_98').translation[1];
  const hipsY = (clip) => clip.tracks.find((track) => track.name === 'hips_98.position')?.values[1] ?? restHipsY;
  assert.ok(hipsY(crouch) < restHipsY * 0.8);
  assert.ok(Math.abs(hipsY(lookUp) - restHipsY) < restHipsY * 0.05);
  for (const clip of clips) {
    assert.ok(clip.tracks.some((track) => track.name === 'head_94.quaternion'), `${clip.name} poses the head`);
    assert.ok(clip.tracks.some((track) => track.name === 'handL_32.quaternion'), `${clip.name} poses the hands`);
  }
});

test('Sonic turns with horizontal movement without shifting its visual center', () => {
  const scene = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial());
  mesh.position.set(0.2, 0, 0.3);
  scene.add(mesh);
  const clips = makeClips();
  const model = new SonicModel(scene, clips);
  const { centerPos } = model.getObjectDim();
  model.setVisualOffset(-centerPos.x, -centerPos.y, -centerPos.z);
  const logic = makeLogic([], -2);
  const center = () => new THREE.Box3().setFromObject(model.getObject3D()).getCenter(new THREE.Vector3());
  const originalCenter = center();

  model.update(0.05, logic);
  assert.equal(model.model.rotation.y, -Math.PI / 2);
  assert.ok(center().distanceTo(originalCenter) < 1e-6);

  logic.speed.x = 0;
  model.update(0.05, logic);
  assert.equal(model.model.rotation.y, -Math.PI / 2);

  logic.speed.x = 2;
  model.update(0.05, logic);
  assert.equal(model.model.rotation.y, Math.PI / 2);
  assert.ok(center().distanceTo(originalCenter) < 1e-6);
});

test('only the blue fur of the Sonic body material is remapped to a brighter blue', async () => {
  const { boostSonicBlue, SONIC_BLUE } = await import('../src/game/rendering/entities/SonicModel.js');
  const material = new THREE.MeshStandardMaterial({ name: SONIC_BLUE.material });
  boostSonicBlue(material);
  const shader = { fragmentShader: 'void main() {\n#include <map_fragment>\n}' };
  material.onBeforeCompile(shader);
  assert.ok(shader.fragmentShader.includes('#include <map_fragment>'), 'keeps the texture lookup');
  assert.ok(shader.fragmentShader.indexOf('blueness') > shader.fragmentShader.indexOf('#include <map_fragment>'));

  // Same math as the shader, on the measured texture navy and on Sonic's peach skin.
  const remap = (rgb) => {
    const [r, g, b] = rgb;
    const t = Math.min(1, Math.max(0, ((b - Math.max(r, g)) / Math.max(b, 1e-4) - 0.3) / 0.3));
    const blueness = t * t * (3 - 2 * t);
    const target = SONIC_BLUE.target;
    const scale = b / SONIC_BLUE.textureBlue;
    return [r + (target.r * scale - r) * blueness, g + (target.g * scale - g) * blueness, b + (target.b * scale - b) * blueness];
  };
  const navy = new THREE.Color('#15248b');
  const boosted = new THREE.Color(...remap([navy.r, navy.g, navy.b]));
  const hsl = {};
  boosted.getHSL(hsl, THREE.SRGBColorSpace);
  assert.ok(hsl.h > 0.58 && hsl.h < 0.63, 'true blue, not purple');
  assert.ok(boosted.b > navy.b * 2.5, 'much brighter blue');
  const skin = new THREE.Color('#f0c090');
  assert.deepEqual(remap([skin.r, skin.g, skin.b]), [skin.r, skin.g, skin.b]);
});
