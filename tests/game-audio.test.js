import assert from 'node:assert/strict';
import test from 'node:test';
import { GameAudio } from '../src/game/rendering/GameAudio.js';

test('audio mute toggles and persists without an AudioContext', () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };

  try {
    const audio = new GameAudio();
    assert.equal(audio.muted, false);
    assert.equal(audio.toggleMuted(), true);
    assert.equal(values.get('cinos.muted'), '1');
    assert.equal(audio.toggleMuted(), false);
    assert.equal(values.get('cinos.muted'), '0');
    assert.equal(new GameAudio().muted, false);
  } finally {
    delete globalThis.localStorage;
  }
});
