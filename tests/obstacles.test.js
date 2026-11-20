import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { Level } from '../src/game/Level.js';
import { Sonic } from '../src/game/logic/entities/Sonic.js';
import { EntityLogic } from '../src/game/logic/entities/EntityLogic.js';
import { Entity } from '../src/game/entities/Entity.js';
import { EntityModel } from '../src/game/rendering/entities/EntityModel.js';
import { createObstacleModel } from '../src/game/rendering/entities/ObstacleModel.js';
import { RING } from '../src/game/logic/entities/Ring.js';

function makeLevel() {
  const level = new Level({ isDown: () => false }, 1000, { spawnHazards: false });
  level.startPosX = 0;
  level.finishX = 1000;
  level.entities = [];
  level.enemies = [];
  level.obstacles = [];
  level.rings = [];
  level.terrain = {
    chunks: [{ initialX: -50 }],
    getHeightAt: () => 0,
    update: () => [],
  };
  level.syncRingChunks = () => ({ added: [], removed: [] });
  return level;
}

function makeSonic(level, x = 0) {
  const groundAt = () => ({ height: 0, normal: { x: 0, y: 1 } });
  const logic = new Sonic(x, 1.5, 0, 'player', true, groundAt);
  const entity = new Entity(
    logic,
    new EntityModel(new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 1))),
  );
  entity.setOnGround(0);
  level.sonic = entity;
  level.player = { updateEntity() {} };
  level.entities.push(entity);
  return entity;
}

function makeHazard(level, kind, x, y) {
  const logic = new EntityLogic(x, y, 0, kind, false);
  logic.setHitbox(1, 1, 1);
  const hazard = { logic, controller: { updateEntity() {} } };
  level[kind === 'enemy' ? 'enemies' : 'obstacles'].push(hazard);
  level.entities.push(hazard);
  return hazard;
}

test('spawnAhead chooses enemies/obstacles at deterministic gaps and stops at the finish', async () => {
  const level = makeLevel();
  level.spawnHazards = true;
  level.spawnAheadDistance = 45;
  level.terrain.getHeightAt = () => 2;
  level.nextSpawnX = 14;
  const rolls = [0, 0.5, 0.5, 0.5, 0.9, 0.5];
  level.random = () => rolls.shift();
  const spawned = [];
  level.spawnEnemy = async (x, groundY) => spawned.push({ kind: 'enemy', x, groundY });
  level.spawnObstacle = (x, groundY) => spawned.push({ kind: 'obstacle', x, groundY });

  await level.spawnAhead(0);

  assert.deepEqual(spawned, [
    { kind: 'enemy', x: 14, groundY: 2 },
    { kind: 'obstacle', x: 29, groundY: 2 },
  ]);
  assert.equal(level.nextSpawnX, 59);
});

test('spawnAhead never places hazards after the finish line', async () => {
  const level = makeLevel();
  level.spawnHazards = true;
  level.finishX = 30;
  level.terrain.getHeightAt = () => 0;
  level.nextSpawnX = 14;
  level.random = () => 0.5;
  const spawned = [];
  level.spawnEnemy = async (x) => spawned.push(x);
  level.spawnObstacle = (x) => spawned.push(x);

  await level.spawnAhead(0);

  assert.ok(spawned.length > 0);
  assert.ok(spawned.every((x) => x < level.finishX));
});

test('obstacle spawn skips a position occupied by a static ring', () => {
  const level = makeLevel();
  level.rings.push({
    logic: {
      active: true,
      scattered: false,
      getPosition: () => ({ x: 14, y: 0.7, z: 0 }),
      hitboxDim: { length: RING.hitbox, heigth: RING.hitbox, depth: RING.depth },
    },
  });

  level.spawnObstacle(14, 0);

  assert.equal(level.obstacles.length, 0);
  assert.equal(level.spawnedEntities.length, 0);
  assert.equal(level.entities.length, 0);
});

test('spinning into an enemy defeats it and bounces Sonic', () => {
  const level = makeLevel();
  const sonic = makeSonic(level, 5);
  sonic.logic.onGround = false;
  sonic.logic.speed.y = -2;
  const enemy = makeHazard(level, 'enemy', 5, 1.5);

  const result = level.resolveHazardContact();

  assert.deepEqual(result.removed, [enemy]);
  assert.equal(level.enemies.length, 0);
  assert.equal(level.entities.includes(enemy), false);
  assert.ok(sonic.logic.speed.y > 0);
  assert.equal(level.ringBalance, 0);
});

test('touching an obstacle without rings loses; with rings scatters them and survives', () => {
  const level = makeLevel();
  const sonic = makeSonic(level, 5);
  makeHazard(level, 'obstacle', 5, 1.5);
  assert.equal(level.resolveHazardContact().defeated, true);

  level.sonic.logic.invulnerabilityRemaining = 0;
  level.ringBalance = 4;
  level.scatterRings = (balance) => ({
    added: Array.from({ length: balance }, () => ({})),
    removed: [],
  });
  const result = level.resolveHazardContact();

  assert.equal(result.defeated, undefined);
  assert.equal(level.ringBalance, 0);
  assert.equal(result.added.length, 4);
  assert.equal(sonic.logic.invulnerabilityRemaining, 2);
});

test('hazards behind the first terrain chunk leave the level and the scene list', () => {
  const level = makeLevel();
  makeSonic(level, 200);
  level.terrain.chunks = [{ initialX: 160 }];
  const behindEnemy = makeHazard(level, 'enemy', 100, 1);
  const aheadEnemy = makeHazard(level, 'enemy', 300, 1);
  const behindObstacle = makeHazard(level, 'obstacle', 120, 1);
  const aheadObstacle = makeHazard(level, 'obstacle', 320, 1);

  const { removed } = level.update(0.05);

  assert.deepEqual(removed, [behindEnemy, behindObstacle]);
  assert.deepEqual(level.enemies, [aheadEnemy]);
  assert.deepEqual(level.obstacles, [aheadObstacle]);
  assert.equal(level.entities.includes(behindEnemy), false);
  assert.equal(level.entities.includes(behindObstacle), false);
  assert.equal(level.entities.includes(aheadEnemy), true);
  assert.equal(level.entities.includes(aheadObstacle), true);
});

test('obstacle model is procedural, grounded and wider at the base than the spikes', () => {
  const model = createObstacleModel();
  const dim = model.getObjectDim();
  assert.ok(dim.length > 1);
  assert.ok(dim.height > 1);
  assert.ok(dim.depth > 1);
  assert.ok(Math.abs(dim.centerPos.y - 0.05) < 1e-6);

  // Base and spikes are baked into one geometry/material shared by every obstacle.
  const other = createObstacleModel();
  assert.equal(model.model.geometry, other.model.geometry);
  assert.equal(model.model.material, other.model.material);
  assert.equal(model.model.material.vertexColors, true);
  assert.equal(model.model.geometry.attributes.color.count, model.model.geometry.attributes.position.count);
});
