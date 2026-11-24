import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Level } from '../src/game/Level.js';
import { Terrain } from '../src/game/logic/terrain/Terrain.js';
import { Chunk, chunkStrategies } from '../src/game/logic/terrain/Chunk.js';
import { RingModel } from '../src/game/rendering/entities/RingModel.js';
import { RingInstances } from '../src/game/rendering/entities/RingInstances.js';
import { EntityLogic } from '../src/game/logic/entities/EntityLogic.js';
import { Ring, RING } from '../src/game/logic/entities/Ring.js';
import { Sonic } from '../src/game/logic/entities/Sonic.js';
import { Entity } from '../src/game/entities/Entity.js';
import { EntityModel } from '../src/game/rendering/entities/EntityModel.js';
import { PlayerController } from '../src/game/logic/controllers/PlayerController.js';
import { Game } from '../src/game/Game.js';

const assetUrl = new URL('../public/model-imports/sonic_ring/', import.meta.url);
// FileLoader usa este evento de navegador mesmo ao ler um buffer data: no Node.
globalThis.ProgressEvent ??= class extends Event {
  constructor(type, details) { super(type); Object.assign(this, details); }
};
const gltf = JSON.parse(await readFile(new URL('scene.gltf', assetUrl), 'utf8'));
gltf.buffers[0].uri = `data:application/octet-stream;base64,${(await readFile(new URL('scene.bin', assetUrl))).toString('base64')}`;
const { scene: template } = await new GLTFLoader().parseAsync(JSON.stringify(gltf), '');

function makeLevel(strategy = chunkStrategies.flat) {
  const level = new Level({ isDown: () => false }, 1000, { spawnHazards: false });
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

test('all rings share one instanced mesh while keeping their own transforms', () => {
  const scene = new THREE.Scene();
  const instances = new RingInstances(scene, 8);
  const makeRing = (x) => new Entity(
    new Ring(x, 4, `instances:${x}`, null),
    new RingModel(template),
  );
  const first = makeRing(1);
  const second = makeRing(2);

  assert.equal(instances.add(first), true);
  assert.equal(instances.add(second), true);
  instances.update();

  assert.equal(instances.mesh.isInstancedMesh, true);
  assert.equal(instances.mesh.count, 2);
  assert.equal(instances.mesh.castShadow, true);
  assert.equal(first.model.model.visible, false, 'the source mesh is replaced by the instance');
  assert.equal(first.getModel3D().getObject3D().position.x, 1);
  const matrices = [new THREE.Matrix4(), new THREE.Matrix4()];
  instances.mesh.getMatrixAt(0, matrices[0]);
  instances.mesh.getMatrixAt(1, matrices[1]);
  assert.notDeepEqual(matrices[0].elements, matrices[1].elements);

  assert.equal(instances.remove(first), true);
  instances.update();
  assert.equal(instances.mesh.count, 1);
  instances.dispose();
  assert.equal(instances.mesh, null);
});

function playableLevel() {
  const level = makeLevel();
  level.terrain.update = () => [];
  const groundAt = (x) => ({ height: level.terrain.getHeightAt(x), normal: { x: 0, y: 1 } });
  const logic = new Sonic(0, 0, 0, 'player', true, groundAt);
  level.sonic = new Entity(logic, new EntityModel(new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 0.7))));
  level.sonic.setOnGround(4);
  level.entities.push(level.sonic);
  level.player = new PlayerController(level.sonic, level.mainInput);
  const enemyLogic = new EntityLogic(5, 4.7, 0, 'enemy', false);
  enemyLogic.setHitbox(1, 1, 1);
  level.enemies = [{ logic: enemyLogic, controller: { updateEntity() {} } }];
  return level;
}

test('collection precedes damage in the same update, one impact consumes balance but preserves results', () => {
  const level = playableLevel();
  level.sonic.logic.position.x = 1;
  level.enemies[0].logic.position.x = 1;
  level.enemies.push(level.enemies[0]);
  const result = level.update(0);
  assert.equal(result.defeated, false);
  assert.equal(level.ringBalance, 0);
  assert.equal(level.ringsCollected, 1);
  assert.equal(result.added.length, 1);
  assert.equal(level.sonic.logic.invulnerabilityRemaining, 2);
  const game = new Game(null, null);
  game.level = level;
  game.elapsedTime = 1;
  assert.equal(game.getResults().rings, 1);
  assert.equal(game.getResults().score, 0, 'o anel perdido no impacto desconta seus pontos');
  assert.equal(game.getResults().grade, 'F');
});

test('grade follows score: A 8500, B 6500, C 4800, D 3000, E 1500, otherwise F', () => {
  const game = new Game(null, null);
  game.elapsedTime = 60;
  const gradeFor = (points) => {
    game.level = { score: { points, timeBonus: 0 } };
    return game.getResults().grade;
  };
  for (const [points, grade] of [
    [8500, 'A'], [8499, 'B'], [6500, 'B'], [6499, 'C'], [4800, 'C'],
    [4799, 'D'], [3000, 'D'], [2999, 'E'], [1500, 'E'], [1499, 'F'], [0, 'F'],
  ]) {
    assert.equal(gradeFor(points), grade, `${points} points`);
  }
});

test('zero balance loses, protected contact survives, and invulnerability ignores all common contact', () => {
  const level = playableLevel();
  level.sonic.logic.position.x = 5;
  assert.equal(level.resolveHazardContact().defeated, true);
  level.ringBalance = 20;
  assert.equal(level.resolveHazardContact().added.length, 20);
  assert.equal(level.ringBalance, 0);
  level.ringBalance = 2;
  assert.equal(level.resolveHazardContact().added.length, 0);
  assert.equal(level.ringBalance, 2);
  level.sonic.logic.invulnerabilityRemaining = 0;
  level.sonic.logic.onGround = true;
  level.sonic.logic.speed.y = 0;
  assert.equal(level.resolveHazardContact().added.length, 2);
});

test('hurt impulse points away, ignores held movement/jump until landing, then controls resume', () => {
  const level = playableLevel();
  level.mainInput.isDown = () => true;
  const sonic = level.sonic.logic;
  sonic.takeHit(5);
  assert.deepEqual(sonic.speed, { x: -4, y: 8, z: 0 });
  level.player.updateEntity(0.05);
  assert.equal(sonic.speed.x, -4);
  assert.ok(sonic.speed.y < 8);
  assert.equal(sonic.currentActions.size, 0);
  for (let i = 0; i < 120 && sonic.recovering; i++) level.player.updateEntity(1 / 60);
  assert.equal(sonic.recovering, false);
  assert.equal(sonic.onGround, true);
  assert.ok(sonic.invulnerabilityRemaining > 0);
  level.mainInput.isDown = (key) => key === 'ArrowRight';
  level.player.updateEntity(0.05);
  assert.ok(sonic.speed.x > -4);
  sonic.takeHit(sonic.position.x - 1);
  assert.equal(sonic.speed.x, 4);
});

test('blink alternates every 2/60 seconds and expires even without a landing', () => {
  const level = playableLevel();
  const sonic = level.sonic.logic;
  sonic.groundAt = () => null;
  sonic.takeHit(5);
  assert.equal(sonic.isDamageVisible(), true);
  sonic.update(2 / 60);
  assert.equal(sonic.isDamageVisible(), false);
  sonic.update(2 / 60);
  assert.equal(sonic.isDamageVisible(), true);
  for (let i = 0; i < 116; i++) sonic.update(1 / 60);
  assert.equal(sonic.invulnerabilityRemaining, 0);
  assert.equal(sonic.isDamageVisible(), true);
  assert.equal(sonic.recovering, true);
});

test('scatter has mirrored upward pairs, second wave at half speed, and evicts only necessary oldest active rings', () => {
  const level = playableLevel();
  const first = level.scatterRings(999).added;
  assert.equal(first.length, 32);
  for (let i = 0; i < 32; i += 2) {
    const a = first[i].logic.speed;
    const b = first[i + 1].logic.speed;
    assert.equal(a.x, -b.x);
    assert.equal(a.y, b.y);
    assert.ok(a.y > 0);
    assert.ok(Math.abs(Math.hypot(a.x, a.y) - (i < 16 ? 12 : 6)) < 1e-9);
    if (i >= 16) assert.equal(a.y, first[i - 16].logic.speed.y / 2);
  }
  first[0].logic.collect();
  const second = level.scatterRings(3);
  assert.deepEqual(second.removed, first.slice(1, 3));
  assert.equal(level.rings.filter((r) => r.logic.scattered && r.logic.active).length, 32);
  assert.ok(second.removed.every((r) => !level.entities.includes(r)));
});

test('scattered rings survive chunk discard and expire out of camera with gradual final rotation', () => {
  const level = playableLevel();
  const ring = level.scatterRings(1).added[0];
  level.terrain.chunks = [new Chunk(100, chunkStrategies.flat, 0)];
  const changes = level.syncRingChunks();
  assert.equal(changes.removed.includes(ring), false);
  ring.logic.age = RING.lifetime - RING.slowDuration;
  assert.ok(Math.abs(ring.logic.rotationScale - 1) < 1e-9);
  ring.logic.age += RING.slowDuration / 2;
  assert.ok(Math.abs(ring.logic.rotationScale - 0.5) < 1e-9);
  ring.logic.update(RING.slowDuration / 2);
  assert.equal(ring.logic.finished, true);
  assert.equal(ring.logic.rotationScale, 0);
});

test('recollection starts exactly at 64/60, counts again, and expiry at 256/60 wins over collision', () => {
  const level = playableLevel();
  const ring = level.scatterRings(1).added[0];
  level.sonic.logic.checkCollision = () => true;
  level.removeRings(level.rings.filter((r) => r !== ring));
  ring.logic.update(RING.recollectDelay - 0.001);
  level.collectRings();
  assert.equal(level.ringsCollected, 0);
  ring.logic.update(0.001);
  level.collectRings();
  assert.equal(level.ringsCollected, 1);
  assert.equal(level.ringBalance, 1);
  const expired = level.scatterRings(1).added[0];
  expired.logic.update(RING.lifetime - 0.001);
  assert.equal(expired.logic.finished, false);
  expired.logic.update(0.001);
  level.collectRings();
  assert.equal(level.ringsCollected, 1);
  assert.equal(expired.logic.finished, true);
});

test('scatter uses converted gravity in seconds, bounces on flat/ramp floors, settles small bounces, and handles null', () => {
  assert.equal(RING.gravity, -16.875);
  for (const strategy of Object.values(chunkStrategies)) {
    const chunk = new Chunk(-10, strategy, 2);
    const terrain = { getHeightAt: (x) => chunk.getHeightAtX(x) };
    const ring = new Ring(0, terrain.getHeightAt(0) + 0.31, 'test');
    ring.scatter(1, -4, terrain);
    ring.update(0.01);
    assert.ok(Math.abs(ring.position.y - terrain.getHeightAt(ring.position.x) - 0.3) < 1e-9);
    assert.ok(Math.abs(ring.speed.y - (4 - RING.gravity * 0.01) * 0.75) < 1e-9);
    ring.speed.x = 0;
    ring.speed.y = -0.01;
    ring.position.y = terrain.getHeightAt(ring.position.x) + 0.3;
    for (let i = 0; i < 20; i++) ring.update(0.05);
    assert.equal(ring.speed.y, 0);
  }
  const ring = new Ring(0, 0, 'void');
  ring.scatter(2, -1, { getHeightAt: () => null });
  ring.update(0.1);
  assert.equal(ring.position.x, 0.2);
  assert.ok(Math.abs(ring.position.y - (-0.1 + RING.gravity * 0.01 / 2)) < 1e-9);
  assert.equal(ring.speed.y, -1 + RING.gravity * 0.1);
});

test('paused game freezes scatter age, invulnerability, movement, and sparkle until resumed', () => {
  const level = playableLevel();
  const ring = level.scatterRings(1).added[0];
  const sparkle = level.rings[0];
  sparkle.logic.collect();
  level.sonic.logic.takeHit(5);
  const game = new Game(null, null);
  game.level = level;
  game.state = 'playing';
  game.scene = { updateChunks() {}, removeEntity() {}, drawEntity() {}, sync() {}, render() {}, drawFinishLine() {} };
  game.togglePause();
  game.update(1);
  assert.equal(ring.logic.age, 0);
  assert.equal(sparkle.logic.collectedAge, 0);
  assert.equal(level.sonic.logic.invulnerabilityRemaining, 2);
  assert.equal(game.elapsedTime, 0);
  game.togglePause();
  game.update(0.05);
  assert.equal(ring.logic.age, 0.05);
  assert.equal(sparkle.logic.collectedAge, 0.05);
  assert.equal(level.sonic.logic.invulnerabilityRemaining, 1.95);
  assert.equal(game.elapsedTime, 0.05);
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

test('ring layout skips positions occupied by hazards', () => {
  const level = makeLevel();
  level.rings = [];
  level.entities = [];
  level.ringLayouts.clear();

  const hazardLogic = new EntityLogic(1.2, level.terrain.getHeightAt(1) + 0.7, 0, 'enemy', false);
  hazardLogic.setHitbox(0.8, 0.8, 0.8);
  level.enemies.push({ logic: hazardLogic });

  const added = level.syncRingChunks().added;
  assert.equal(added.length, 8);
  assert.ok(!added.some((ring) => ring.logic.position.x === 1));
  assert.ok(added.some((ring) => ring.logic.position.x === 2));
});

test('swept collection is immediate and unique, persists on chunk refresh, and resets in a new level', () => {
  const level = makeLevel();
  const sonic = new EntityLogic(4, 4.7, 0, 'player', false);
  sonic.setHitbox(0.2, 0.2, 0.2);
  sonic.previousPosition = { x: 0, y: 4.7, z: 0 };
  level.sonic = { logic: sonic };
  level.collectRings();
  assert.equal(level.ringBalance, 3);
  assert.equal(level.ringsCollected, 3);
  assert.ok(level.rings.slice(0, 3).every((r) => !r.logic.hitboxActive));
  assert.equal(sonic.checkCollision(level.rings[0].logic), false);
  level.collectRings();
  level.syncRingChunks();
  level.collectRings();
  assert.equal(level.ringsCollected, 3);
  assert.equal(level.ringLayouts.get(-10).size, 3);
  level.removeRings(level.rings.filter((r) => !r.logic.active));
  assert.equal(level.syncRingChunks().added.length, 0);
  assert.equal(level.rings.length, 6);
  assert.equal(makeLevel().ringBalance, 0);
  assert.equal(makeLevel().ringsCollected, 0);
});

test('balance caps at 999 but collection and results still count and consume rings', () => {
  const level = makeLevel();
  level.sonic = { logic: { checkCollision: () => true } };
  level.ringBalance = 998;
  level.collectRings();
  assert.equal(level.ringBalance, 999);
  assert.equal(level.ringsCollected, 9);
  assert.ok(level.rings.every((r) => !r.logic.active));
});

test('collection shows four short sparkle stages and removes the effect at the end', () => {
  const level = makeLevel();
  const ring = level.rings[0];
  ring.logic.collect();
  const opacity = [];
  for (let i = 0; i < 4; i++) {
    ring.model.update(0, ring.logic);
    opacity.push(ring.model.sparkleMaterial.opacity);
    ring.update(RING.sparkleDuration / 4);
  }
  assert.deepEqual(opacity, [1, 0.8, 0.5, 0.2]);
  assert.equal(ring.logic.finished, true);
  ring.toggleHitboxVisual();
  assert.equal(ring.model.hitboxHelper.visible, false);
  level.removeRings([ring]);
  ring.model.dispose();
  assert.equal(ring.model.sparkle.parent, null);
  assert.equal(level.entities.includes(ring), false);
});
