import * as THREE from 'three';
import { Game } from './game/Game.js';
import { Input } from './game/Input.js';
import { CONFIG } from './game/constants.js';

const canvas = document.getElementById('canvas');

const game = new Game(canvas);
window.__game = game;
const input = new Input();

input.attach(window);

// Optional: switch camera with "C"
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyC') game.switchCamera();
});

window.addEventListener('resize', () => {
  game.resizeWindow(window.innerWidth, window.innerHeight);
});

game.startGame();
const clock = new THREE.Timer();
const hud = document.getElementById('hud');
const overlay = document.getElementById('overlay');

function loop() {
  requestAnimationFrame(loop);
  clock.update();
  const dt = Math.min(clock.getDelta(), CONFIG.maxDt);
  if (game.state === 'lose') {
    if (input.consumeJump()) game.startGame();
  } else {
    game.update(dt, input);
  }

  const snapshot = game.getSnapshot();
  const distance = game.getDistance().toFixed(1);
  const speed = (snapshot.player?.velocityX ?? 0).toFixed(1);
  if (hud) {
    hud.textContent = `Distância: ${distance}  Vel: ${speed}  Estado: ${game.state}`;
  }
  if (overlay) {
    if (game.state === 'lose') {
      overlay.style.display = 'flex';
      overlay.innerHTML = `Derrota!<br><small>Distância: ${distance} m - Espaço para reiniciar</small>`;
    } else {
      overlay.style.display = 'none';
      overlay.innerHTML = '';
    }
  }
}
loop();
