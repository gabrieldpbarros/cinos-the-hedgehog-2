import assert from 'node:assert/strict';
import test from 'node:test';
import { EntityLogic } from '../src/game/logic/entities/EntityLogic.js';

test('event region detects overlapping hitboxes using current positions', () => {
  const entity = new EntityLogic(0, 0, 0, 'player');
  const other = new EntityLogic(4, 0, 0, 'enemy');
  entity.setHitbox(2, 2, 2);
  other.setHitbox(2, 2, 2);

  assert.equal(entity.checkEventRegion(other), true); // touching the margin
  other.position.x = 4.01;
  assert.equal(entity.checkEventRegion(other), false);

  other.position.x = 0;
  other.position.y = 4.01;
  assert.equal(entity.checkEventRegion(other), false);

  other.position.y = 0;
  other.setHitbox(20, 2, 2); // a larger box can contain the region
  assert.equal(entity.checkEventRegion(other), true);

  entity.setEventRegionMargin(0, 0, 0);
  other.setHitbox(2, 2, 2);
  other.position.x = 2.01;
  assert.equal(entity.checkEventRegion(other), false);
});

test('collision detects crossing and contained boxes without stored vertices', async () => {
  const wide = new EntityLogic(0, 0, 0, 'wide');
  const tall = new EntityLogic(0, 0, 0, 'tall');
  wide.setHitbox(4, 1, 1);
  tall.setHitbox(1, 4, 1);

  assert.equal(wide.checkCollision(tall), true);
  assert.equal(tall.checkCollision(wide), true);

  tall.setHitbox(10, 10, 10);
  assert.equal(wide.checkCollision(tall), true);
  assert.equal(tall.checkCollision(wide), true);

  tall.setHitbox(2, 2, 2);
  tall.position.x = 3;
  assert.equal(wide.checkCollision(tall), true); // touching faces
  tall.setSpeed(0.01, 0, 0);
  tall.moveHorizontal(1);
  assert.equal(wide.checkCollision(tall), false);
});

test('holding jump starts another jump after landing', () => {
  const groundAt = () => ({ height: 0, normal: { x: 0, y: 1 } });
  const sonic = new EntityLogic(0, 1, 0, 'player', true, groundAt);
  sonic.setHitbox(1, 2, 1);

  sonic.do('JUMP');
  sonic.update(0.05);
  assert.equal(sonic.onGround, false);
  assert.ok(sonic.getPosition().y > 1);
  assert.equal(sonic.getSpeed().y < sonic.jumpSpeed, true);

  for (let i = 0; i < 30 && !sonic.onGround; i++) sonic.update(0.05);
  assert.equal(sonic.onGround, true);
  assert.equal(sonic.getPosition().y, 1);

  sonic.update(0.05);
  assert.equal(sonic.onGround, false);
  assert.ok(sonic.getPosition().y > 1);

  sonic.stop('JUMP');
  for (let i = 0; i < 30 && !sonic.onGround; i++) sonic.update(0.05);
  sonic.update(0.05);
  assert.equal(sonic.onGround, true);
});

test('a fast frame still hits a thin target crossed between the two poses', () => {
  const groundAt = () => ({ height: 0, normal: { x: 0, y: 1, z: 0 } });
  const sonic = new EntityLogic(8.8, 0.75, 0, 'player', true, groundAt);
  sonic.setHitbox(1.065, 1.5, 0.765);
  sonic.setSpeed(40, 0, 0);
  const ring = new EntityLogic(10, 0.75, 0, 'ring');
  ring.setHitbox(0.4, 0.8, 0.8);

  sonic.update(0.05);

  const endGap = Math.abs(sonic.getPosition().x - ring.position.x);
  const endReach = (sonic.hitboxDim.length + ring.hitboxDim.length) / 2;
  assert.ok(endGap > endReach);
  assert.equal(sonic.checkCollision(ring), true);
});

test('a trajectory that stays above a target does not count as a hit', () => {
  const sonic = new EntityLogic(14, 3.2, 0, 'player');
  sonic.setHitbox(1.065, 0.9, 0.765);
  sonic.previousPosition = { x: 6, y: 3.2, z: 0 };
  const enemy = new EntityLogic(10, 1.2, 0, 'enemy');
  enemy.setHitbox(1.125, 1.42, 1.4);

  assert.equal(sonic.checkCollision(enemy), false);
});
