import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { SceneLighting } from '../src/game/rendering/SceneLighting.js';

test('lights and shadow camera follow the ground height', () => {
  const scene = new THREE.Scene();
  const lighting = new SceneLighting(scene);

  assert.equal(scene.children.filter((object) => object.isLight).length, 2);
  assert.equal(lighting.sun.castShadow, true);
  assert.equal(lighting.sun.shadow.camera.projectionMatrix.elements[0], 1 / 15);
  lighting.followTerrain(190, 23);
  assert.deepEqual(lighting.sun.position.toArray(), [196, 33, 6]);
  assert.deepEqual(lighting.sun.target.position.toArray(), [190, 23, 0]);
});

test('sky and ground light replace the flat ambient and the pure blue fill', () => {
  const scene = new THREE.Scene();
  const lighting = new SceneLighting(scene);
  const lights = scene.children.filter((object) => object.isLight);
  assert.ok(lighting.hemisphere.isHemisphereLight);
  assert.equal(lights.some((light) => light.isAmbientLight), false);
  // Nenhuma luz puxa a cena para um único canal (o antigo preenchimento #0066ff).
  for (const light of lights) {
    const { r, g, b } = light.color;
    assert.ok(Math.min(r, g, b) > 0.3 * Math.max(r, g, b), `${light.type} is not a saturated tint`);
  }
});
