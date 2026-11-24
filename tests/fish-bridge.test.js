import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { CONFIG, FISH, WATER_Y } from '../src/game/constants.js';
import { Chunk, chunkStrategies } from '../src/game/logic/terrain/Chunk.js';
import { Fish } from '../src/game/logic/entities/Fish.js';
import { createFishModel } from '../src/game/rendering/entities/FishModel.js';
import { BridgeChunkModel, FISH_SPAWN_X, FISH_SPAWN_Z } from '../src/game/rendering/terrain/BridgeChunkModel.js';

globalThis.ProgressEvent ??= class {};
globalThis.createImageBitmap ??= async () => ({});

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

test('o salto começa na água e ultrapassa o tabuleiro', () => {
  const startY = -FISH.spawnDepth;
  const fish = new Fish(0, startY, 0);
  let maxY = startY;

  for (let i = 0; i < 4000; i++) {
    fish.update(1 / 600);
    maxY = Math.max(maxY, fish.position.y);
  }

  assert.ok(Math.abs(startY - (WATER_Y - 0.5)) < 1e-9, 'o peixe deve começar na linha d’água');
  assert.ok(maxY > 1, `pico ${maxY} deve passar acima do tabuleiro`);
});

test('a superfície da ponte segue a curvatura do tabuleiro', () => {
  const chunk = new Chunk(0, chunkStrategies.bridge, 0);
  assert.equal(chunk.getHeightAtX(0), 0);
  assert.ok(chunk.getHeightAtX(20) < -0.4, 'o meio da ponte deve estar mais baixo');
  assert.ok(Math.abs(chunk.getHeightAtX(40)) < 1e-9, 'as pontas permanecem na altura original');
});

test('a ponte tem troncos contínuos nos pontos de salto', () => {
  const chunk = new Chunk(0, chunkStrategies.bridge, 0);
  const mesh = new BridgeChunkModel(chunk).getChunkModel();
  mesh.updateMatrixWorld(true);

  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);

  ray.set(new THREE.Vector3(FISH_SPAWN_X[0], 5, FISH_SPAWN_Z), down);
  assert.equal(ray.intersectObject(mesh).length, 0, 'deve haver um vão de um tronco no ponto do peixe');

  ray.set(new THREE.Vector3(2.4, 5, FISH_SPAWN_Z), down);
  assert.ok(ray.intersectObject(mesh).length > 0, 'deve haver um tronco entre os pontos de salto');

  const box = new THREE.Box3().setFromObject(mesh);
  assert.ok(box.max.y >= 1.5 && box.max.y <= 2.2, `os postes de amarração devem ficar acima do tabuleiro, não em ${box.max.y}`);
  assert.ok(box.min.y < -0.3, 'o tabuleiro deve ter leve curvatura no centro');
  assert.ok(box.min.y <= WATER_Y - 0.4, 'os postes devem descer até a água');
});

test('o peixe tem dimensões compatíveis com a ponte', async () => {
  const url = new URL(
    '../public/model-imports/chopper-sonic-generations-ripped/source/chopper.glb',
    import.meta.url,
  ).href;
  const { length, depth } = (await createFishModel({ url })).getObjectDim();
  assert.ok(depth < 1.22, `profundidade ${depth} não cabe no alçapão`);
  assert.ok(length < 1.2, `comprimento ${length} não cabe no alçapão`);
});
