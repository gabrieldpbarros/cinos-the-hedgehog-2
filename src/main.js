import * as THREE from 'three';
import { Game } from './game/Game.js';
import { Input } from './game/logic/Input.js';
import { CONFIG } from './game/constants.js';

const canvas = document.getElementById('canvas');
const hud = document.getElementById('hud');
const overlay = document.getElementById('overlay');

const input = new Input();
input.attach(window);

const game = new Game(canvas, input);
let restartReady = false;

// Optional: switch camera with "C"
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyC') game.switchCamera();
  if (e.code === 'Space' && game.state === 'lose' && restartReady) {
    window.location.reload();
  }
});

window.addEventListener('resize', () => {
  game.resizeWindow(window.innerWidth, window.innerHeight);
});

game.startGame();
const clock = new THREE.Timer();

function loop() {
  requestAnimationFrame(loop);
  clock.update();
  const dt = Math.min(clock.getDelta(), CONFIG.maxDt);
  game.update(dt);
  if (game.state === 'lose' && !input.isDown('Space')) restartReady = true;
  const distance = game.getDistance().toFixed(1);
  const speed = Math.abs(game.level?.sonic?.logic.getSpeed().x ?? 0).toFixed(1);
  hud.textContent = `Distância: ${distance} m  Vel: ${speed} u/s  Estado: ${game.state}`;
  overlay.style.display = game.state === 'lose' ? 'flex' : 'none';
  if (game.state === 'lose') {
    overlay.innerHTML = `Derrota!<br><small>Distância: ${distance} m - Espaço para reiniciar</small>`;
  }
}
loop();
