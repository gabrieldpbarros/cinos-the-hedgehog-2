import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { Chunk } from '../src/game/Chunk.js';
import { Game } from '../src/game/Game.js';
import { chunkStrategies } from '../src/game/strategies/chunkStrategies.js';
import { ChunkModel } from '../src/rendering/ChunkModel.js';

test('chunks share edge heights and keep texture distance across ramps', () => {
  const theta = Math.atan(2 / Chunk.length);
  const flat = new Chunk(-10, chunkStrategies.flat, 0);
  const up = new Chunk(30, chunkStrategies.rampUp, flat.endY, flat.surfaceEnd, theta);
  const down = new Chunk(70, chunkStrategies.rampDown, up.endY, up.surfaceEnd, theta);
  const next = new Chunk(110, chunkStrategies.flat, down.endY, down.surfaceEnd);

  assert.equal(flat.getHeightAtX(0), 0);
  assert.equal(up.getHeightAtX(up.initialX), flat.endY);
  assert.ok(Math.abs(up.endY - 2) < 1e-12);
  assert.equal(down.getHeightAtX(down.initialX), up.endY);
  assert.ok(Math.abs(down.endY) < 1e-12);
  assert.equal(next.baseY, down.endY);
  assert.equal(up.surfaceStart, flat.surfaceEnd);
  assert.ok(Math.abs(up.surfaceEnd - up.surfaceStart - Math.hypot(Chunk.length, 2)) < 1e-12);

  const materials = [new THREE.MeshBasicMaterial(), new THREE.MeshBasicMaterial()];
  const flatModel = new ChunkModel(flat, materials);
  const upModel = new ChunkModel(up, materials);
  const mesh = upModel.getChunkModel();
  const positions = mesh.geometry.getAttribute('position');
  const uvs = mesh.geometry.getAttribute('uv');

  assert.equal(upModel.getChunkModel(), mesh);
  assert.equal(mesh.position.x, up.initialX);
  assert.equal(positions.getY(16), up.baseY);
  assert.equal(positions.getY(17), up.endY);
  assert.ok(Math.abs(uvs.getX(16) - up.surfaceStart / 2.9) < 0.00001);
  assert.ok(Math.abs(uvs.getX(17) - up.surfaceEnd / 2.9) < 0.00001);

  const group = new THREE.Group();
  group.add(flatModel.getChunkModel(), mesh);
  flatModel.destroyChunk();
  upModel.destroyChunk();
  assert.equal(group.children.length, 0);
});

test('Game creates consecutive chunks with continuous heights', () => {
  const game = new Game(null);
  game.startPosX = 0;
  const chunks = game.createInitialChunks();

  assert.equal(chunks.length, 5);
  assert.equal(chunks[0].initialX, -10);
  assert.equal(chunks[0].baseY, 0);

  for (let i = 1; i < chunks.length; i++) {
    assert.equal(chunks[i].initialX, chunks[i - 1].initialX + Chunk.length);
    assert.equal(chunks[i].baseY, chunks[i - 1].endY);
    assert.equal(chunks[i].surfaceStart, chunks[i - 1].surfaceEnd);
  }
});
