import assert from 'node:assert/strict';
import test from 'node:test';
import { PlayerController } from '../src/game/logic/controllers/PlayerController.js';

test('either movement key keeps its action active; Shift boosts, S crouches and W looks up', () => {
  const actions = new Map();
  const entity = {
    logic: {},
    handleAction: (action, active) => actions.set(action, active),
    update: () => {},
  };
  const pressed = new Set(['KeyA', 'ShiftLeft', 'KeyS', 'KeyW']);
  const controller = new PlayerController(entity, { isDown: (key) => pressed.has(key) });

  controller.updateEntity(0.05);
  assert.equal(actions.get('MOVE_LEFT'), true);
  assert.equal(actions.get('BOOST'), true);
  assert.equal(actions.get('CROUCH'), true);
  assert.equal(actions.get('LOOK_UP'), true);

  pressed.add('ArrowLeft');
  pressed.delete('KeyA');
  controller.updateEntity(0.05);
  assert.equal(actions.get('MOVE_LEFT'), true);
});
