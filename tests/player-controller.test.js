import assert from 'node:assert/strict';
import test from 'node:test';
import { PlayerController } from '../src/game/logic/controllers/PlayerController.js';

test('either movement key keeps its action active; Shift boosts and Ctrl crouches', () => {
  const actions = new Map();
  const entity = {
    handleAction: (action, active) => actions.set(action, active),
    update: () => {},
  };
  const pressed = new Set(['KeyA', 'ShiftLeft', 'ControlLeft']);
  const controller = new PlayerController(entity, { isDown: (key) => pressed.has(key) });

  controller.updateEntity(0.05);
  assert.equal(actions.get('MOVE_LEFT'), true);
  assert.equal(actions.get('BOOST'), true);
  assert.equal(actions.get('CROUCH'), true);

  pressed.add('ArrowLeft');
  pressed.delete('KeyA');
  controller.updateEntity(0.05);
  assert.equal(actions.get('MOVE_LEFT'), true);
});
