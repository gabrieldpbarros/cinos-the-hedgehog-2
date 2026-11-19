import assert from 'node:assert/strict';
import test from 'node:test';
import { Game } from '../src/game/Game.js';

test('contact with Buzz Bomber ends play after updating entities', () => {
  const game = new Game(null, null);
  let collided = false;
  let updateCount = 0;
  game.state = 'playing';
  game.level = {
    startPosX: 0,
    sonic: { logic: {
      getPosition: () => ({ x: 5, y: 2 }),
      checkCollision: () => collided,
    } },
    enemies: [{ logic: {} }],
    terrain: { getHeightAt: () => 0 },
    update: () => { updateCount++; collided = true; return { chunks: [], removed: [] }; },
  };
  game.scene = {
    updateChunks: () => {},
    sync: () => {},
    render: () => {},
    removeEntity: () => {},
  };

  game.update(0.05);
  assert.equal(game.state, 'lose');
  assert.equal(updateCount, 1);
  game.update(0.05);
  assert.equal(updateCount, 1);
});

test('pause toggles only between playing and paused and freezes updates', () => {
  const game = new Game(null, null);
  let updates = 0;
  game.state = 'playing';
  game.level = {
    startPosX: 0,
    sonic: { logic: {
      getPosition: () => ({ x: 0, y: 0 }),
      checkCollision: () => false,
    } },
    enemies: [],
    terrain: { getHeightAt: () => 0 },
    update: () => { updates++; return { chunks: [], removed: [] }; },
  };
  game.scene = {
    updateChunks: () => {},
    sync: () => {},
    render: () => {},
    removeEntity: () => {},
  };

  game.togglePause();
  assert.equal(game.state, 'paused');
  game.update(0.05);
  assert.equal(updates, 0);

  game.togglePause();
  assert.equal(game.state, 'playing');
  game.update(0.05);
  assert.equal(updates, 1);

  game.state = 'lose';
  game.togglePause();
  assert.equal(game.state, 'lose');

  game.state = 'menu';
  game.togglePause();
  assert.equal(game.state, 'menu');
});

test('contact with a later enemy ends play and a removed enemy leaves the scene', () => {
  const game = new Game(null, null);
  const far = { logic: {} };
  const near = { logic: {} };
  const gone = { logic: {} };
  let removedFromScene = null;
  game.state = 'playing';
  game.level = {
    sonic: { logic: {
      getPosition: () => ({ x: 5, y: 2 }),
      checkCollision: (other) => other === near.logic,
    } },
    enemies: [far, near],
    terrain: { getHeightAt: () => 0 },
    update: () => ({ chunks: [], removed: [gone] }),
  };
  game.scene = {
    updateChunks: () => {},
    sync: () => {},
    render: () => {},
    removeEntity: (enemy) => { removedFromScene = enemy; },
  };

  game.update(0.05);
  assert.equal(game.state, 'lose');
  assert.equal(removedFromScene, gone);
});
