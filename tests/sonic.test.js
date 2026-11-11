import assert from 'node:assert/strict';
import test from 'node:test';
import { Sonic } from '../src/game/logic/entities/Sonic.js';
import { Chunk, chunkStrategies } from '../src/game/logic/terrain/Chunk.js';

const groundAt = () => ({ height: 0, normal: { x: 0, y: 1 } });

function makeSonic(surfaceAt = groundAt) {
  const sonic = new Sonic(0, 1, 0, 'player', true, surfaceAt);
  sonic.setHitbox(1, 2, 1);
  return sonic;
}

test('movement input reaches 20 u/s without cutting off existing momentum', () => {
  const sonic = makeSonic();
  sonic.setSpeed(19.95, 0, 0);
  sonic.do('MOVE_RIGHT');
  sonic.update(0.05);
  assert.equal(sonic.getSpeed().x, 20);

  sonic.setSpeed(25, 0, 0);
  sonic.update(0.05);
  assert.equal(sonic.getSpeed().x, 25);

  sonic.stop('MOVE_RIGHT');
  sonic.do('MOVE_LEFT');
  sonic.setSpeed(-19.95, 0, 0);
  sonic.update(0.05);
  assert.equal(sonic.getSpeed().x, -20);
});

test('crouch caps horizontal speed at half the normal running limit', () => {
  const sonic = makeSonic();
  sonic.setSpeed(20, 0, 0);
  sonic.do('CROUCH');
  sonic.do('MOVE_RIGHT');
  sonic.updateHorizontalSpeed(0.05);
  assert.equal(sonic.getSpeed().x, 10);
});

test('ground braking stops from 20 u/s in four seconds and strengthens near zero', () => {
  const sonic = makeSonic();
  sonic.setSpeed(20, 0, 0);

  sonic.update(0.05);
  const firstLoss = 20 - sonic.getSpeed().x;
  for (let i = 1; i < 79; i++) sonic.update(0.05);
  const lateSpeed = sonic.getSpeed().x;
  sonic.update(0.05);

  assert.ok(lateSpeed > 0);
  assert.ok(lateSpeed > firstLoss);
  assert.equal(sonic.getSpeed().x, 0);
});

test('air braking is lighter than ground braking', () => {
  const grounded = makeSonic();
  const airborne = makeSonic();
  grounded.setSpeed(20, 0, 0);
  airborne.setSpeed(20, 0, 0);
  airborne.onGround = false;

  grounded.updateHorizontalSpeed(1);
  airborne.updateHorizontalSpeed(1);
  assert.ok(airborne.getSpeed().x < 20);
  assert.ok(airborne.getSpeed().x > grounded.getSpeed().x);
});

test('opposite movement adds to braking before accelerating in reverse', () => {
  const coasting = makeSonic();
  const reversing = makeSonic();
  coasting.setSpeed(20, 0, 0);
  reversing.setSpeed(20, 0, 0);
  reversing.do('MOVE_LEFT');

  coasting.updateHorizontalSpeed(1);
  reversing.updateHorizontalSpeed(1);
  assert.ok(Math.abs(reversing.getSpeed().x - (coasting.getSpeed().x - 2)) < 1e-9);

  for (let i = 0; i < 80; i++) reversing.updateHorizontalSpeed(0.05);
  assert.ok(reversing.getSpeed().x < 0);
});

test('higher speed stops within 60 seconds even if airborne throughout', () => {
  const grounded = makeSonic();
  const airborne = makeSonic();
  grounded.setSpeed(400, 0, 0);
  airborne.setSpeed(400, 0, 0);
  airborne.onGround = false;
  for (let i = 0; i < 1200; i++) {
    grounded.updateHorizontalSpeed(0.05);
    airborne.updateHorizontalSpeed(0.05);
  }
  assert.equal(grounded.getSpeed().x, 0);
  assert.equal(airborne.getSpeed().x, 0);
});

test('ramp gravity slows uphill movement and accelerates downhill beyond input limit', () => {
  const up = new Chunk(0, chunkStrategies.rampUp, 0);
  const down = new Chunk(0, chunkStrategies.rampDown, 0);
  const onChunk = (chunk) => (x) => ({
    height: chunk.getHeightAtX(x),
    normal: chunk.getNormalVector(x),
  });
  const uphill = makeSonic(onChunk(up));
  const downhill = makeSonic(onChunk(down));
  const flat = makeSonic();

  for (const sonic of [uphill, downhill, flat]) {
    sonic.setSpeed(20, 0, 0);
    sonic.do('MOVE_RIGHT');
    sonic.update(0.05);
  }

  assert.ok(uphill.getSpeed().x < flat.getSpeed().x);
  assert.ok(downhill.getSpeed().x > 20);
  downhill.update(0.05);
  assert.ok(downhill.getSpeed().x > 20);
});

test('ramp gravity does not change horizontal speed while airborne', () => {
  const up = new Chunk(0, chunkStrategies.rampUp, 0);
  const onUp = (x) => ({ height: up.getHeightAtX(x), normal: up.getNormalVector(x) });
  const sonic = makeSonic(onUp);
  sonic.setSpeed(20, 0, 0);
  sonic.setPosition(0, 10, 0);
  sonic.onGround = false;
  sonic.do('MOVE_RIGHT');
  sonic.update(0.05);
  assert.equal(sonic.getSpeed().x, 20);
});

test('Sonic stays still on ramps without movement input', () => {
  for (const strategy of [chunkStrategies.rampUp, chunkStrategies.rampDown]) {
    const chunk = new Chunk(0, strategy, 0);
    const onChunk = (x) => ({ height: chunk.getHeightAtX(x), normal: chunk.getNormalVector(x) });
    const sonic = makeSonic(onChunk);
    const startX = 5;
    sonic.setPosition(startX, chunk.getHeightAtX(startX) + 1, 0);
    sonic.setSpeed(0.01, 0, 0);

    for (let i = 0; i < 100; i++) sonic.update(0.05);

    assert.equal(sonic.getSpeed().x, 0);
    assert.equal(sonic.getPosition().x, startX);
  }
});
