import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  Backdrop, CloudLayer, MesaLayer, PALETTE, RidgeLayer, WaterPlane, bakeFacets, plainTerrainMaterials, seededRandom,
} from '../src/game/rendering/background/Backdrop.js';

const cameraAt = (x, y = 4.5, z = 12) => {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(x, y, z);
  return camera;
};

const ridge = () => new RidgeLayer({
  seed: 7, z: -120, baseY: -14, width: 300, columns: 20, minHeight: 10, maxHeight: 21,
  depth: 22, color: '#3f9c7a', haze: 0.25, followY: 0.95,
});

test('seeded random repeats the same scenery every run', () => {
  const a = seededRandom(42);
  const b = seededRandom(42);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
});

test('ridge layers repeat without a seam and keep tiles around the camera', () => {
  const layer = ridge();
  for (const x of [0, 13, 150, 299]) assert.equal(layer.heightAt(x), layer.heightAt(x + layer.width));

  // The last column of a tile matches the first one, so neighbouring copies meet exactly.
  const positions = layer.tiles[0].geometry.attributes.position;
  const topAt = (x) => {
    let top = -Infinity;
    for (let i = 0; i < positions.count; i++) {
      if (Math.abs(positions.getX(i) - x) < 1e-6) top = Math.max(top, positions.getY(i));
    }
    return top;
  };
  assert.equal(topAt(0), topAt(layer.width));

  layer.follow(cameraAt(1000), 10);
  const xs = layer.tiles.map((tile) => tile.position.x);
  assert.ok(Math.min(...xs) <= 1000 - layer.width / 2, 'covers behind the camera');
  assert.ok(Math.max(...xs) >= 1000 + layer.width * 2, 'covers far ahead for the oblique camera');
  assert.ok(Math.abs(layer.group.position.y - (-14 + 10 * 0.95)) < 1e-9);
  assert.equal(layer.group.position.z, -120);
});

test('facets get one flat color per triangle, hazier layers lean to the horizon', () => {
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const plain = bakeFacets(geometry, { color: '#3c9a3f', minY: -1, maxY: 1 });
  const colors = plain.attributes.color;
  for (let i = 0; i < colors.count; i += 3) {
    for (let k = 1; k < 3; k++) {
      for (let c = 0; c < 3; c++) assert.equal(colors.getComponent(i + k, c), colors.getComponent(i, c));
    }
  }
  const hazy = bakeFacets(geometry, { color: '#3c9a3f', haze: 1, minY: -1, maxY: 1 });
  const horizon = new THREE.Color(PALETTE.horizon);
  assert.ok(Math.abs(hazy.attributes.color.getX(0) - horizon.r) < 1e-6);
});

test('clouds drift but always stay within the span around the camera', () => {
  const clouds = new CloudLayer({ seed: 5, count: 6, z: -290, minY: 40, maxY: 75, span: 900, speed: 2 });
  for (const [dt, x] of [[0, 0], [30, 500], [200, -2000]]) {
    clouds.advance(dt);
    clouds.follow(cameraAt(x), 0);
    for (const cloud of clouds.group.children) {
      assert.ok(cloud.position.x >= x - 450 && cloud.position.x < x + 450);
    }
  }
});

test('backdrop replaces the skybox image and keeps the sky centered on the camera', () => {
  const scene = new THREE.Scene();
  const backdrop = new Backdrop(scene);
  assert.ok(scene.background.isColor);
  const camera = cameraAt(321, 9, 12);
  backdrop.advance(0.016);
  backdrop.follow(camera, 3);
  assert.ok(backdrop.sky.mesh.position.equals(camera.position));
  assert.ok(scene.fog.isFog, 'far terrain fades into the horizon');
});

test('backdrop mesas reuse the track materials so they share its checker and grass look', () => {
  const scene = new THREE.Scene();
  const materials = plainTerrainMaterials();
  new Backdrop(scene, materials);
  const used = new Set(scene.getObjectsByProperty('isMesh', true).flatMap((mesh) => [mesh.material].flat()));
  for (const material of Object.values(materials)) assert.ok(used.has(material));
});

test('mesa layers stay inside their tile so copies never overlap', () => {
  const layer = new MesaLayer({
    seed: 17, width: 260, zRange: [-24, -62], topRange: [-3, 9], radiusRange: [4, 10],
    gapRange: [8, 26], baseY: -45, waterY: -12, treeChance: 0.8, treeSize: 1.2,
    materials: plainTerrainMaterials(), trees: {
      trunk: new THREE.MeshStandardMaterial(), leaves: new THREE.MeshStandardMaterial(),
      leavesLight: new THREE.MeshStandardMaterial(),
    },
  });
  assert.ok(layer.mesas.length >= 6);
  for (const { x, radius } of layer.mesas) {
    assert.ok(x - radius * 1.15 >= 0 && x + radius * 1.15 <= layer.width);
  }
  layer.follow(cameraAt(1000), 20);
  const xs = layer.tiles.map((tile) => tile.position.x);
  assert.ok(Math.min(...xs) <= 1000 - layer.width / 2 && Math.max(...xs) >= 1000 + layer.width * 2);
  assert.equal(layer.group.position.y, 20, 'mesas move with the water so foam stays on the waterline');

  // The tile is merged by material: mesas, trees and foam rings no longer cost one
  // draw call each. The foam still lies flat at the water level.
  const meshes = layer.tiles[0].getObjectsByProperty('isMesh', true);
  assert.ok(meshes.length <= 8, `tile has ${meshes.length} meshes, expected merged materials`);
  assert.equal(new Set(meshes.map((mesh) => mesh.material)).size, meshes.length);
  const foam = meshes.find((mesh) => mesh.material === layer.foamMaterial);
  assert.ok(foam, 'merged foam mesh exists');
  foam.geometry.computeBoundingBox();
  const { min, max } = foam.geometry.boundingBox;
  assert.ok(Math.abs(min.y - max.y) < 1e-6 && Math.abs(min.y - (-12 + 0.2)) < 1e-6);
});

test('water animates, steps with the camera in whole cells and has foam along the track', () => {
  const water = new WaterPlane({ y: -12, near: -120, far: 640 });
  water.advance(0.5);
  water.advance(0.25);
  assert.equal(water.uniforms.time.value, 0.75);
  water.follow(cameraAt(100.4), 3);
  assert.equal(water.mesh.position.x % WaterPlane.CELL, 0, 'vertices do not swim under the waves');
  assert.equal(water.mesh.position.y, -9);
  const foamZ = water.mesh.children.map((foam) => foam.position.z).sort((a, b) => a - b);
  assert.deepEqual(foamZ, [-5.45, 5.45]);

  // Faces point up, so the surface is visible from the cameras above it.
  const position = water.mesh.geometry.attributes.position;
  const index = water.mesh.geometry.index;
  const [a, b, c] = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(position, index.getX(k)));
  assert.ok(new THREE.Vector3().crossVectors(b.sub(a), c.sub(a)).y > 0);
});
