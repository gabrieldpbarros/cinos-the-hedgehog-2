import assert from 'node:assert/strict';
import test from 'node:test';
import { Chunk, chunkStrategies } from '../src/game/logic/terrain/Chunk.js';
import { Terrain } from '../src/game/logic/terrain/Terrain.js';
import { TerrainModel } from '../src/game/rendering/terrain/TerrainModel.js';
import { CLIFF } from '../src/game/rendering/terrain/StartCliffModel.js';
import { CONFIG } from '../src/game/constants.js';

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

test('terrain and visuals keep chunks behind and ahead when recycling', () => {
  let canvases = 0;
  const createElement = globalThis.document.createElement;
  globalThis.document.createElement = () => {
    canvases += 1;
    return createElement();
  };
  const terrain = new Terrain(0);
  const visual = new TerrainModel('green_hill');
  visual.createGround(terrain.chunks);
  assert.equal(terrain.chunks.length, 8);
  assert.equal(canvases, 2);

  assert.equal(terrain.update(149).length, 0);
  const first = visual.chunkModels[0];
  let disposed = 0;
  first.model.geometry.addEventListener('dispose', () => disposed++);
  for (const material of first.materials) {
    material.addEventListener('dispose', () => disposed++);
    material.map.addEventListener('dispose', () => disposed++);
  }

  const added = terrain.update(150);
  visual.updateGround(added);
  assert.equal(added.length, 1);
  assert.equal(added[0].initialX, 310);
  assert.equal(terrain.chunks.length, 8);
  assert.equal(visual.getGround().children.length, 9, '8 chunks + start cliff');
  assert.equal(disposed, 1);
  assert.equal(canvases, 2);

  // O primeiro chunk ainda fica 120 unidades atrás do jogador.
  assert.equal(terrain.chunks[0].initialX, 30);
  assert.notEqual(terrain.getHeightAt(30), null);
  assert.equal(terrain.getHeightAt(29), null);

  const more = terrain.update(190);
  visual.updateGround(more);
  assert.equal(more.length, 1);
  assert.equal(visual.getGround().children.length, 9);
  // O penhasco acompanha o primeiro chunk ativo: é o limite esquerdo do Sonic.
  const cliff = visual.startCliff.getModel();
  assert.equal(cliff.position.x, terrain.chunks[0].initialX);
  assert.equal(cliff.position.y, terrain.chunks[0].getHeightAtX(terrain.chunks[0].initialX));
  assert.equal(visual.chunkModels[0].materials[0], visual.chunkModels[7].materials[0]);
  assert.equal(visual.chunkModels[0].materials[1].map, visual.chunkModels[7].materials[1].map);
  for (let i = 0; i < 8; i++) {
    assert.equal(visual.chunkModels[i].chunk, terrain.chunks[i]);
    if (i > 0) {
      assert.equal(terrain.chunks[i].initialX, terrain.chunks[i - 1].initialX + Chunk.length);
      assert.equal(terrain.chunks[i].baseY, terrain.chunks[i - 1].endY);
      assert.equal(terrain.chunks[i].surfaceStart, terrain.chunks[i - 1].surfaceEnd);
    }
  }
});

test('start cliff is taller than a jump and the soil reaches below the background water', () => {
  const jumpHeight = CONFIG.jumpVelocity ** 2 / (2 * -CONFIG.gravity);
  assert.ok(CLIFF.height > jumpHeight + 1.5, 'Sonic cannot jump over or onto it');
  assert.ok(Chunk.soilDepth > 45, 'oblique camera sees soil, not void, under the track');
});
