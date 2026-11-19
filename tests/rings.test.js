import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Level } from '../src/game/Level.js';
import { Terrain } from '../src/game/logic/terrain/Terrain.js';
import { Chunk, chunkStrategies } from '../src/game/logic/terrain/Chunk.js';
import { RingModel } from '../src/game/rendering/entities/RingModel.js';
import { EntityLogic } from '../src/game/logic/entities/EntityLogic.js';
import { RING } from '../src/game/logic/entities/Ring.js';

const assetUrl = new URL('../public/model-imports/sonic_ring/', import.meta.url);
// FileLoader usa este evento de navegador mesmo ao ler um buffer data: no Node.
globalThis.ProgressEvent ??= class extends Event {
  constructor(type, details) { super(type); Object.assign(this, details); }
};
const gltf = JSON.parse(await readFile(new URL('scene.gltf', assetUrl), 'utf8'));
gltf.buffers[0].uri = `data:application/octet-stream;base64,${(await readFile(new URL('scene.bin', assetUrl))).toString('base64')}`;
const { scene: template } = await new GLTFLoader().parseAsync(JSON.stringify(gltf), '');

export function makeLevel(strategy = chunkStrategies.flat) {
  const level = new Level({ isDown: () => false });
  level.startPosX = 0;
  level.finishX = 1000;
  level.entities = [];
  level.ringTemplate = template;
  level.terrain = new Terrain(0);
  level.terrain.chunks = [new Chunk(-10, strategy, 4)];
  level.syncRingChunks();
  return level;
}

test('real ring asset is centered, scaled and cloned without rotating the AABB', () => {
  const a = new RingModel(template);
  const b = new RingModel(template);
  const dim = a.getObjectDim();
  assert.ok(Math.abs(Math.max(dim.length, dim.height) - 0.8) < 1e-6);
  assert.ok(dim.length > 0.7 && dim.height > 0.7 && dim.depth < 0.3);
  assert.ok(dim.centerPos.length() < 1e-6);
  a.setHitboxSize(0.6, 0.6, 0.8);
  a.update(0.25);
  assert.equal(b.model.rotation.y, 0);
  assert.equal(a.root.rotation.y, 0);
  assert.deepEqual(a.hitboxHelper.box.getSize(new THREE.Vector3()).toArray(), [0.6, 0.6, 0.8]);
});

test('ring layout follows all terrain types, precedes enemy, and stays bounded on chunk changes', () => {
  for (const strategy of Object.values(chunkStrategies)) {
    const level = makeLevel(strategy);
    const beforeEnemy = level.rings.filter((r) => r.logic.position.x < 5);
    assert.equal(beforeEnemy.length, 3);
    for (const ring of beforeEnemy) {
      const { x, y } = ring.logic.position;
      assert.ok(Math.abs(y - level.terrain.getHeightAt(x) - 0.7) < 1e-9);
      assert.deepEqual(ring.logic.hitboxDim, { length: 0.6, heigth: 0.6, depth: 0.8 });
    }
    assert.ok(level.rings.some((r) => r.logic.position.y - level.terrain.getHeightAt(r.logic.position.x) > 2));
    assert.equal(level.syncRingChunks().added.length, 0);
    const old = [...level.rings];
    level.terrain.chunks = [new Chunk(30, strategy, 1)];
    const changes = level.syncRingChunks();
    assert.deepEqual(changes.removed, old);
    assert.equal(level.rings.length, 9);
    assert.equal(level.entities.length, 9);
    level.toggleHitboxes();
    level.terrain.chunks.push(new Chunk(70, strategy, 1));
    assert.ok(level.syncRingChunks().added.every((r) => r.hitboxVisible));
  }
});

test('swept collection is immediate and unique, persists on chunk refresh, and resets in a new level', () => {
  const level = makeLevel();
  const sonic = new EntityLogic(4, 4.7, 0, 'player', false);
  sonic.setHitbox(0.2, 0.2, 0.2);
  sonic.previousPosition = { x: 0, y: 4.7, z: 0 };
  level.sonic = { logic: sonic };
  level.collectRings();
  assert.equal(level.ringBalance, 3);
  assert.equal(level.ringsCollected, 3);
  assert.ok(level.rings.slice(0, 3).every((r) => !r.logic.hitboxActive));
  assert.equal(sonic.checkCollision(level.rings[0].logic), false);
  level.collectRings();
  level.syncRingChunks();
  level.collectRings();
  assert.equal(level.ringsCollected, 3);
  assert.equal(level.ringLayouts.get(-10).size, 3);
  assert.equal(makeLevel().ringBalance, 0);
  assert.equal(makeLevel().ringsCollected, 0);
});

test('balance caps at 999 but collection and results still count and consume rings', () => {
  const level = makeLevel();
  level.sonic = { logic: { checkCollision: () => true } };
  level.ringBalance = 998;
  level.collectRings();
  assert.equal(level.ringBalance, 999);
  assert.equal(level.ringsCollected, 9);
  assert.ok(level.rings.every((r) => !r.logic.active));
});

test('collection shows four short sparkle stages and removes the effect at the end', () => {
  const level = makeLevel();
  const ring = level.rings[0];
  ring.logic.collect();
  const opacity = [];
  for (let i = 0; i < 4; i++) {
    ring.model.update(0, ring.logic);
    opacity.push(ring.model.sparkleMaterial.opacity);
    ring.update(RING.sparkleDuration / 4);
  }
  assert.deepEqual(opacity, [1, 0.8, 0.5, 0.2]);
  assert.equal(ring.logic.finished, true);
  ring.toggleHitboxVisual();
  assert.equal(ring.model.hitboxHelper.visible, false);
  level.removeRings([ring]);
  ring.model.dispose();
  assert.equal(ring.model.sparkle.parent, null);
  assert.equal(level.entities.includes(ring), false);
});
