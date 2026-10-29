import * as THREE from 'three';
import { Game } from './game/Game.js';
import { Input } from './game/Input.js';
import { SceneView } from './rendering/SceneView.js';
import { CONFIG } from './game/constants.js';

const canvas = document.getElementById('canvas');
const widthText = document.getElementById('width');
const heightText = document.getElementById('height');

function updateSizeLabels() {
  if (widthText) widthText.textContent = window.innerWidth;
  if (heightText) heightText.textContent = window.innerHeight;
}

const game = new Game();
const input = new Input();
const view = new SceneView(canvas);

input.attach(window);

// Optional: switch camera with "C"
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyC') view.switchCamera();
});

window.addEventListener('resize', () => {
  view.resize(window.innerWidth, window.innerHeight);
  updateSizeLabels();
});

updateSizeLabels();

const clock = new THREE.Timer();

function loop() {
  requestAnimationFrame(loop);
  clock.update();
  const dt = Math.min(clock.getDelta(), CONFIG.maxDt);
  game.update(dt, input);
  view.sync(game.getSnapshot());
  view.render();
}
loop();
