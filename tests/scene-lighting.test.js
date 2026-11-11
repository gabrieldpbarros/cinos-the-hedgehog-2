import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { SceneLighting } from '../src/game/rendering/SceneLighting.js';

test('lights and shadow camera follow the ground height', () => {
  const scene = new THREE.Scene();
  const lighting = new SceneLighting(scene);

  assert.equal(scene.children.filter((object) => object.isLight).length, 3);
  assert.equal(lighting.sun.castShadow, true);
  assert.equal(lighting.sun.shadow.camera.projectionMatrix.elements[0], 1 / 15);
  lighting.followTerrain(190, 23);
  assert.deepEqual(lighting.sun.position.toArray(), [196, 33, 6]);
  assert.deepEqual(lighting.sun.target.position.toArray(), [190, 23, 0]);
  assert.deepEqual(lighting.fillLight.position.toArray(), [185, 27, 12]);
});
