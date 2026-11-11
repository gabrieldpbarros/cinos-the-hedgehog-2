import assert from 'node:assert/strict';
import test from 'node:test';
import { Chunk, chunkStrategies } from '../src/game/logic/terrain/Chunk.js';
import { Terrain } from '../src/game/logic/terrain/Terrain.js';
import { TerrainModel } from '../src/game/rendering/terrain/TerrainModel.js';

globalThis.document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => ({ fillRect() {} }),
  }),
};

test('chunks keep height and texture distance continuous across ramps', () => {
  const theta = Math.atan(2 / Chunk.length);
  const flat = new Chunk(-10, chunkStrategies.flat, 0);
  const up = new Chunk(30, chunkStrategies.rampUp, flat.endY, flat.surfaceEnd, theta);
  const down = new Chunk(70, chunkStrategies.rampDown, up.endY, up.surfaceEnd, theta);

  assert.equal(up.getHeightAtX(up.initialX), flat.endY);
  assert.ok(Math.abs(up.endY - 2) < 1e-12);
  assert.equal(down.getHeightAtX(down.initialX), up.endY);
  assert.ok(Math.abs(down.endY) < 1e-12);
  assert.equal(up.surfaceStart, flat.surfaceEnd);
  assert.ok(Math.abs(up.surfaceEnd - up.surfaceStart - Math.hypot(Chunk.length, 2)) < 1e-12);
});

test('terrain and visuals recycle five chunks when Sonic reaches the third', () => {
  const terrain = new Terrain(0);
  const visual = new TerrainModel('green_hill');
  visual.createGround(terrain.chunks);

  assert.equal(terrain.update(69).length, 0);
  const first = visual.chunkModels[0];
  let disposed = 0;
  first.model.geometry.addEventListener('dispose', () => disposed++);
  for (const material of first.materials) {
    material.addEventListener('dispose', () => disposed++);
    material.map.addEventListener('dispose', () => disposed++);
  }

  const added = terrain.update(70);
  visual.updateGround(added);
  assert.equal(added.length, 1);
  assert.equal(added[0].initialX, 190);
  assert.equal(terrain.chunks.length, 5);
  assert.equal(visual.getGround().children.length, 5);
  assert.equal(disposed, 5);

  const more = terrain.update(190);
  visual.updateGround(more);
  assert.equal(more.length, 3);
  assert.equal(visual.getGround().children.length, 5);
  for (let i = 0; i < 5; i++) {
    assert.equal(visual.chunkModels[i].chunk, terrain.chunks[i]);
    if (i > 0) {
      assert.equal(terrain.chunks[i].initialX, terrain.chunks[i - 1].initialX + Chunk.length);
      assert.equal(terrain.chunks[i].baseY, terrain.chunks[i - 1].endY);
      assert.equal(terrain.chunks[i].surfaceStart, terrain.chunks[i - 1].surfaceEnd);
    }
  }
});
