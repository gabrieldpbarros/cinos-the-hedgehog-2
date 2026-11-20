import assert from 'node:assert/strict';
import test from 'node:test';
import { AudioManager } from '../src/game/rendering/audio/AudioManager.js';

test('audio manager persists master volume and falls back to synthesized audio', () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };

  try {
    const audio = new AudioManager();
    assert.equal(audio.volume, 0.7);
    assert.equal(audio.setVolume(0.4), 0.4);
    assert.equal(values.get('cinos.volume'), '0.4');
    assert.equal(audio.setVolume(2), 1);
    assert.equal(audio.setVolume(-1), 0);
    assert.equal(new AudioManager().volume, 0);

    audio.setVolume(0.4);
    assert.equal(audio.toggleMuted(), true);
    assert.equal(audio.muted, true);
    assert.equal(audio.toggleMuted(), false);

    audio.startMusic('level1');
    assert.equal(audio.musicEnabled, true);
    audio.stopMusic();
    assert.equal(audio.musicEnabled, false);
    audio.play('ring');
    audio.play('land');
  } finally {
    delete globalThis.localStorage;
  }
});
