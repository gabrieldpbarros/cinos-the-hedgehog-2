import { SCORE } from '../constants.js';

export class Score {
  constructor() {
    this.points = 0;
    this.time = 0;
    this.chain = 0;
    this.lastEnemyAt = -Infinity;
    this.timeBonus = 0;
    this.finished = false;
  }

  tick(dt) {
    this.time += dt;
  }

  addRing() {
    this.points += SCORE.ring;
  }

  // Os anéis perdidos no impacto voltam a valer pontos quando recolecionados,
  // então descontá-los aqui evita ganhar pontos ao se machucar repetidamente.
  loseRings(count) {
    this.points = Math.max(0, this.points - count * SCORE.ring);
  }

  // Cadeia de inimigos: 100, 200, 400, 800... enquanto as derrotas
  // acontecem dentro da janela de tempo.
  defeatEnemy() {
    if (this.time - this.lastEnemyAt > SCORE.enemyChainWindow) this.chain = 0;
    const gained = SCORE.enemyBase * 2 ** this.chain;
    this.points += gained;
    this.chain += 1;
    this.lastEnemyAt = this.time;
    return gained;
  }

  // O bônus de tempo é concedido uma única vez ao cruzar a chegada.
  finish(time = this.time) {
    if (this.finished) return this.points;
    this.finished = true;
    const tier = SCORE.timeBonusTiers.find((item) => time <= item.upTo);
    this.timeBonus = tier?.points ?? 0;
    this.points += this.timeBonus;
    return this.points;
  }
}

export function gradeForScore(points) {
  const tier = SCORE.gradeThresholds.find((item) => points >= item.min);
  return tier?.grade ?? 'F';
}
