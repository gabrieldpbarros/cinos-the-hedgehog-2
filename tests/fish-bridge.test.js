import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { CONFIG, FISH, WATER_Y } from '../src/game/constants.js';
import { Chunk, chunkStrategies } from '../src/game/logic/terrain/Chunk.js';
import { Fish } from '../src/game/logic/entities/Fish.js';
import { createFishModel } from '../src/game/rendering/entities/FishModel.js';
import { BridgeChunkModel, FISH_HOLE_X, FISH_HOLE_Z } from '../src/game/rendering/terrain/BridgeChunkModel.js';

test('o peixe sobe até a altura calibrada e volta à base', () => {
  const startY = -FISH.spawnDepth;
  const fish = new Fish(0, startY, 0);
  const dt = 1 / 600;
  let maxY = fish.position.y;
  let touchedBottom = false;

  for (let i = 0; i < 3000; i++) {
    fish.update(dt);
    maxY = Math.max(maxY, fish.position.y);
    if (fish.position.y <= startY + 1e-6) touchedBottom = true;
  }

  const expectedPeak = startY + FISH.jumpSpeed ** 2 / (2 * Math.abs(CONFIG.gravity));
  assert.ok(Math.abs(maxY - expectedPeak) < 0.05, `pico ${maxY} diverge de ${expectedPeak}`);
  assert.ok(touchedBottom, 'o peixe deve retornar à base para repetir o salto');
});

test('a ponte tem alçapões alinhados com os peixes e pilares até a água', () => {
  const chunk = new Chunk(0, chunkStrategies.bridge, 0);
  const mesh = new BridgeChunkModel(chunk).getChunkModel();
  mesh.updateMatrixWorld(true);

  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);

  ray.set(new THREE.Vector3(FISH_HOLE_X[0], 5, FISH_HOLE_Z), down);
  assert.equal(ray.intersectObject(mesh).length, 0, 'deve haver um alçapão no ponto do peixe');

  ray.set(new THREE.Vector3(2, 5, FISH_HOLE_Z), down);
  assert.ok(ray.intersectObject(mesh).length > 0, 'o tabuleiro deve ser sólido entre alçapões');

  const box = new THREE.Box3().setFromObject(mesh);
  assert.ok(box.min.y <= WATER_Y - 0.4, `pilares em ${box.min.y} não chegam à água em ${WATER_Y}`);
});

test('o peixe cabe no alçapão', () => {
  const { length, depth } = createFishModel().getObjectDim();
  assert.ok(depth < 0.64, `profundidade ${depth} não cabe no alçapão`);
  assert.ok(length < 1.2, `comprimento ${length} não cabe no alçapão`);
});
