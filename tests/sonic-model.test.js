import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { SonicModel } from '../src/game/rendering/entities/SonicModel.js';

test('Sonic animation follows jump and absolute horizontal speed', () => {
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial()));
  const clips = ['Idle', 'Walk', 'Jog', 'Run', 'Spin', 'Brake'].map(
    (name) => new THREE.AnimationClip(name, 1, []),
  );
  const model = new SonicModel(scene, clips);
  const logic = {
    onGround: true,
    speed: { x: 0, y: 0 },
    currentActions: new Set(),
    braking: false,
    getSpeed() { return this.speed; },
    isSpinning() { return !this.onGround || this.currentActions.has('JUMP'); },
    isBraking() { return this.braking; },
  };
  const currentClip = () => model.activeAction.getClip().name;
  const baseY = model.model.position.y;

  model.update(0.05, logic);
  assert.equal(currentClip(), 'Idle');
  logic.speed.x = -20;
  model.update(0.05, logic);
  assert.equal(currentClip(), 'Jog');
  assert.equal(model.activeAction.timeScale, 2.3);
  logic.speed.x = -10;
  model.update(0.05, logic);
  assert.equal(currentClip(), 'Walk');
  assert.equal(model.activeAction.timeScale, 1.4);
  const walkAction = model.activeAction;
  logic.speed.x = 19.99;
  model.update(0.05, logic);
  assert.equal(model.activeAction, walkAction);
  const walkRate = model.activeAction.timeScale;
  logic.speed.x = 20;
  model.update(0.05, logic);
  assert.equal(currentClip(), 'Jog');
  assert.ok(Math.abs(model.activeAction.timeScale - walkRate) < 0.01);
  logic.speed.x = 25;
  logic.currentActions.add('BOOST');
  model.update(0.05, logic);
  assert.equal(currentClip(), 'Jog');
  assert.equal(model.activeAction.timeScale, 2.75);
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

test('Sonic turns with horizontal movement without shifting its visual center', () => {
  const scene = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial());
  mesh.position.set(0.2, 0, 0.3);
  scene.add(mesh);
  const clips = ['Idle', 'Walk', 'Jog', 'Run', 'Spin', 'Brake'].map(
    (name) => new THREE.AnimationClip(name, 1, []),
  );
  const model = new SonicModel(scene, clips);
  const { centerPos } = model.getObjectDim();
  model.setVisualOffset(-centerPos.x, -centerPos.y, -centerPos.z);
  const logic = {
    onGround: true,
    speed: { x: -2, y: 0 },
    currentActions: new Set(),
    getSpeed() { return this.speed; },
    isSpinning() { return !this.onGround || this.currentActions.has('JUMP'); },
    isBraking() { return false; },
  };
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
