import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Level } from '../src/game/Level.js';
import { Terrain } from '../src/game/logic/terrain/Terrain.js';
import { Chunk, chunkStrategies } from '../src/game/logic/terrain/Chunk.js';
import { RingModel } from '../src/game/rendering/entities/RingModel.js';

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
