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
  if (e.code === 'KeyP' && !e.repeat) game.togglePause();
  if ((e.code === 'Space' || e.code === 'KeyR') &&
      (game.state === 'lose' || game.state === 'win') && restartReady) {
    window.location.reload();
  }
});

window.addEventListener('resize', () => {
  game.resizeWindow(window.innerWidth, window.innerHeight);
});

game.startGame();
const clock = new THREE.Timer();
let overlayState = null;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  return `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function updateOverlay(distance) {
  if (game.state === overlayState) return;
  overlayState = game.state;

  overlay.style.display =
    game.state === 'lose' || game.state === 'paused' || game.state === 'win' ? 'flex' : 'none';

  if (game.state === 'lose') {
    overlay.innerHTML = `Derrota!<br><small>Distância: ${distance} m - Espaço para reiniciar</small>`;
  } else if (game.state === 'win') {
    const results = game.getResults();
    overlay.innerHTML = `
      <strong>Fase concluída!</strong>
      <div class="results">
        <div><span>Distância</span><strong>${distance} m</strong></div>
        <div><span>Tempo</span><strong>${formatTime(results.time)}</strong></div>
        <div><span>Anéis coletados</span><strong>${results.rings}</strong></div>
        <div class="grade"><span>Nota</span><strong>${results.grade}</strong></div>
      </div>
      <small>Espaço ou R para jogar novamente</small>`;
  } else if (game.state === 'paused') {
    overlay.innerHTML = 'Pausado<br><small>P para continuar</small>';
  } else {
    overlay.innerHTML = '';
  }
}

function loop() {
  requestAnimationFrame(loop);
  clock.update();
  const dt = Math.min(clock.getDelta(), CONFIG.maxDt);
  game.update(dt);
  if ((game.state === 'lose' || game.state === 'win') &&
      !input.isDown('Space')) restartReady = true;
  const distance = game.getDistance().toFixed(1);
  const speed = Math.abs(game.level?.sonic?.logic.getSpeed().x ?? 0).toFixed(1);
  const hint =
    game.state === 'playing' ? '  P: pausar' :
    game.state === 'paused' ? '  P: continuar' : '';
  hud.textContent = `Distância: ${distance} m  Vel: ${speed} u/s  Anéis: ${game.level?.ringBalance ?? 0}  Estado: ${game.state}${hint}`;
  updateOverlay(distance);
}
loop();
