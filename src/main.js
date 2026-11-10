import * as THREE from 'three';
import { Game } from './game/Game.js';
import { Input } from './game/logic/Input.js';
import { CONFIG } from './game/constants.js';

const canvas = document.getElementById('canvas');

const input = new Input();
input.attach(window);

const game = new Game(canvas, input);

// Optional: switch camera with "C"
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyC') game.switchCamera();
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
}
loop();
