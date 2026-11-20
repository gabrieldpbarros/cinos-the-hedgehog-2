import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import { SonicModel } from '../src/game/rendering/entities/SonicModel.js';
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
  logic.speed.x = -20;
  model.update(0.05, logic);
  assert.equal(currentClip(), 'Jog');
  const rate = (speed) => Math.min(3.5, 0.5 + Math.abs(speed) * 0.09);
  assert.ok(Math.abs(model.activeAction.timeScale - rate(20)) < 1e-9);
  logic.speed.x = -3;
  model.update(0.05, logic);
  assert.equal(currentClip(), 'Walk');
  assert.ok(Math.abs(model.activeAction.timeScale - rate(3)) < 1e-9);
  const walkAction = model.activeAction;
  logic.speed.x = 3;
  model.update(0.05, logic);
  assert.equal(model.activeAction, walkAction);
  logic.speed.x = 8;
  model.update(0.05, logic);
  assert.equal(currentClip(), 'Jog');
  assert.ok(Math.abs(model.activeAction.timeScale - rate(8)) < 1e-9);
  logic.speed.x = 19.99;
  model.update(0.05, logic);
  const jogRate = model.activeAction.timeScale;
  logic.speed.x = 20;
  model.update(0.05, logic);
  assert.equal(currentClip(), 'Jog');
  assert.ok(Math.abs(model.activeAction.timeScale - jogRate) < 0.01);
  logic.speed.x = 25;
  logic.currentActions.add('BOOST');
  model.update(0.05, logic);
  assert.equal(currentClip(), 'Jog');
  assert.ok(Math.abs(model.activeAction.timeScale - rate(25)) < 1e-9);
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
