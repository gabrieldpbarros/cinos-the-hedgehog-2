import assert from 'node:assert/strict';
import test from 'node:test';
import { formatHudSpeed, formatHudTime, formatTime } from '../src/ui/hudFormat.js';

test('HUD speed has one decimal place and is capped at 99.0', () => {
  assert.equal(formatHudSpeed(0), '0.0');
  assert.equal(formatHudSpeed(20.44), '20.4');
  assert.equal(formatHudSpeed(20.46), '20.5');
  assert.equal(formatHudSpeed(-12.44), '12.4');
  assert.equal(formatHudSpeed(99.04), '99.0');
  assert.equal(formatHudSpeed(99.9), '99.0');
  assert.equal(formatHudSpeed(120), '99.0');
  assert.equal(formatHudSpeed(Number.NaN), '0.0');
});

test('HUD time is MM:SS.d with one decimal place and stops at 59:59.9', () => {
  assert.equal(formatHudTime(0), '00:00.0');
  assert.equal(formatHudTime(65.94), '01:05.9');
  assert.equal(formatHudTime(65.99), '01:05.9');
  assert.equal(formatHudTime(3599.94), '59:59.9');
  assert.equal(formatHudTime(3600), '59:59.9');
  assert.equal(formatHudTime(7200), '59:59.9');
  assert.equal(formatHudTime(-5), '00:00.0');
});

test('pause and result times use the same one-decimal format', () => {
  assert.equal(formatTime(0), '00:00.0');
  assert.equal(formatTime(65.1234), '01:05.1');
  assert.equal(formatTime(3599), '59:59.0');
  assert.equal(formatTime(3600), '59:59.9');
  assert.equal(formatTime(7200), '59:59.9');
  assert.equal(formatTime(Number.NaN), '00:00.0');
});
