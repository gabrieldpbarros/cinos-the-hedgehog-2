import assert from 'node:assert/strict';
import test from 'node:test';
import { Level } from '../src/game/Level.js';
import { Terrain } from '../src/game/logic/terrain/Terrain.js';

test('every enemy updates, and those behind the first chunk are removed', () => {
  const level = new Level(null);
  level.terrain = new Terrain(0);
  level.sonic = { logic: { setMinX() {}, getPosition: () => ({ x: 200 }) } };
  level.player = { updateEntity() {} };
  level.entities = [];

  const updates = [];
  const makeEnemy = (x) => {
    const enemy = {
      logic: { getPosition: () => ({ x }) },
      controller: { updateEntity() { updates.push(x); } },
    };
    level.entities.push(enemy);
    return enemy;
  };
  const behind = makeEnemy(0);
  const ahead = makeEnemy(1000);
  level.enemies = [behind, ahead];

  const { chunks, removed } = level.update(0.05);

  assert.deepEqual(updates, [0, 1000]);
  assert.deepEqual(removed, [behind]);
  assert.deepEqual(level.enemies, [ahead]);
  assert.equal(level.entities.includes(behind), false);
  assert.equal(level.entities.includes(ahead), true);
  assert.ok(chunks.length > 0);
  assert.ok(level.terrain.chunks[0].initialX > behind.logic.getPosition().x);
});
