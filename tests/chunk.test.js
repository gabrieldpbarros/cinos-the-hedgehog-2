import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { Chunk } from '../src/rendering/Chunk.js';
import { chunkStrategies } from '../src/rendering/strategies.js';

test('chunks preserve texture position and surface distance across a ramp', () => {
  const materials = [new THREE.MeshBasicMaterial(), new THREE.MeshBasicMaterial()];
  const flat = new Chunk(0, chunkStrategies.flat, materials);
  const ramp = new Chunk(Chunk.length, chunkStrategies.rampUp, materials, flat.surfaceEnd);
  const next = new Chunk(2 * Chunk.length, chunkStrategies.flat, materials, ramp.surfaceEnd);

  assert.equal(flat.surfaceEnd, Chunk.length);
  assert.equal(ramp.surfaceEnd, Chunk.length + Math.hypot(Chunk.length, 2));
  assert.equal(next.surfaceStart, ramp.surfaceEnd);

  const flatModel = flat.getChunkModel();
  const rampModel = ramp.getChunkModel();
  assert.equal(flat.getChunkModel(), flatModel);
  assert.equal(flatModel.geometry.getAttribute('uv').getX(1), Chunk.length / 4);
  assert.ok(Math.abs(rampModel.geometry.getAttribute('uv').getX(16) - flat.surfaceEnd / 2.9) < 0.00001);
  assert.ok(Math.abs(rampModel.geometry.getAttribute('uv').getX(17) - ramp.surfaceEnd / 2.9) < 0.00001);

  const group = new THREE.Group();
  group.add(flatModel, rampModel);
  flat.destroyChunk();
  ramp.destroyChunk();
  assert.equal(group.children.length, 0);
});
