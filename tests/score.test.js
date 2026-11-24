import assert from 'node:assert/strict';
import test from 'node:test';
import { SCORE } from '../src/game/constants.js';
import { Score, gradeForScore } from '../src/game/logic/Score.js';

test('cada anel vale dez pontos', () => {
  const score = new Score();
  score.addRing();
  score.addRing();
  assert.equal(score.points, 20);
});

test('perder anéis desconta os pontos, que voltam ao recolecionar', () => {
  const score = new Score();
  score.addRing();
  score.addRing();
  score.loseRings(2);
  assert.equal(score.points, 0);
  score.addRing();
  assert.equal(score.points, 10);
  score.loseRings(99);
  assert.equal(score.points, 0, 'a pontuação não pode ficar negativa');
});

test('a cadeia de inimigos dobra até sair da janela de tempo', () => {
  const score = new Score();
  assert.equal(score.defeatEnemy(), 100);
  assert.equal(score.defeatEnemy(), 200);
  score.tick(SCORE.enemyChainWindow + 0.01);
  assert.equal(score.defeatEnemy(), 100);
  assert.equal(score.points, 400);
});

test('o bônus de tempo é concedido uma única vez', () => {
  const score = new Score();
  score.addRing();
  assert.equal(score.finish(45), 10 + 5000);
  assert.equal(score.finish(45), 10 + 5000);
  assert.equal(score.timeBonus, 5000);
});

test('bônus de tempo segue os degraus de tempo', () => {
  for (const [time, expected] of [
    [50, 5000], [51, 3500], [65, 3500], [66, 2500],
    [80, 2500], [81, 1500], [100, 1500], [101, 800],
    [120, 800], [121, 0],
  ]) {
    assert.equal(new Score().finish(time), expected, `${time} s`);
  }
});

test('a nota acompanha a pontuação', () => {
  for (const [points, grade] of [
    [8500, 'A'], [6500, 'B'], [4800, 'C'], [3000, 'D'], [1500, 'E'], [0, 'F'],
  ]) {
    assert.equal(gradeForScore(points), grade);
  }
});
