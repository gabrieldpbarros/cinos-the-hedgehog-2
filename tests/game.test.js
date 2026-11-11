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
    buzzBomber: { logic: {} },
    terrain: { getHeightAt: () => 0 },
    update: () => { updateCount++; collided = true; return []; },
  };
  game.scene = {
    updateChunks: () => {},
    sync: () => {},
    render: () => {},
  };

  game.update(0.05);
  assert.equal(game.state, 'lose');
  assert.equal(updateCount, 1);
  game.update(0.05);
  assert.equal(updateCount, 1);
});
