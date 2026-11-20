import * as THREE from 'three';
import { Game } from './game/Game.js';
import { Input } from './game/logic/Input.js';
import { CONFIG } from './game/constants.js';

const canvas = document.getElementById('canvas');
const hudDistance = document.getElementById('hud-distance');
const hudSpeed = document.getElementById('hud-speed');
const hudRings = document.getElementById('hud-rings');
const hudTime = document.getElementById('hud-time');
const overlay = document.getElementById('overlay');

const input = new Input();
input.attach(window);

const game = new Game(canvas, input);
let restartReady = false;
let overlayState = null;

function renderControls() {
  return `
    <div class="control">
      <span>Mover</span>
      <span class="keys"><kbd>A</kbd><kbd>D</kbd><em>ou</em><kbd class="arrow">←</kbd><kbd class="arrow">→</kbd></span>
    </div>
    <div class="control">
      <span>Pular / girar</span>
      <span class="keys"><kbd>Espaço</kbd></span>
    </div>
    <div class="control">
      <span>Agachar</span>
      <span class="keys"><kbd>S</kbd><em>ou</em><kbd class="arrow">↓</kbd></span>
    </div>
    <div class="control">
      <span>Olhar para cima</span>
      <span class="keys"><kbd>W</kbd><em>ou</em><kbd class="arrow">↑</kbd></span>
    </div>
    <div class="control">
      <span>Câmera</span>
      <span class="keys"><kbd>C</kbd></span>
    </div>
    <div class="control">
      <span>Pausar</span>
      <span class="keys"><kbd>P</kbd><em>ou</em><kbd>Esc</kbd></span>
    </div>
    <div class="control">
      <span>Reiniciar partida</span>
      <span class="keys"><kbd>R</kbd><em>ou</em><kbd>Espaço</kbd><em>no fim</em></span>
    </div>
    <div class="control">
      <span>Derrotar inimigo</span>
      <span class="keys"><kbd>Espaço</kbd><em>no ar</em></span>
    </div>
    <div class="control">
      <span>Coletar anéis</span>
      <span class="keys"><em>encoste no anel</em></span>
    </div>
    <div class="control">
      <span>Som</span>
      <span class="keys"><kbd>M</kbd><em>na pausa</em></span>
    </div>`;
}

function renderPause(distance) {
  const muted = game.audio?.muted ?? false;
  return `
    <section class="overlay-panel" role="dialog" aria-modal="true" aria-labelledby="overlay-title">
      <p class="eyebrow">Pausa · ${distance} m · ${formatTime(game.getElapsedTime())}</p>
      <h1 class="panel-title" id="overlay-title">Corrida pausada</h1>
      <p class="panel-subtitle">Respire, ajuste a rota e volte quando quiser. Os controles também estão logo abaixo.</p>

      <div class="controls-heading">
        <h2>Controles</h2>
        <span>Teclado</span>
      </div>
      <div class="control-grid">${renderControls()}</div>

      <div class="panel-actions">
        <button class="btn btn-primary" type="button" data-action="resume">Continuar <kbd>P</kbd></button>
        <button class="btn btn-ghost" type="button" data-action="restart">Reiniciar <kbd>R</kbd></button>
        <button class="btn btn-ghost" type="button" data-action="toggle-audio" aria-pressed="${muted}">${muted ? 'Som desligado' : 'Som ligado'} <kbd>M</kbd></button>
      </div>

      <p class="panel-footnote"><strong>Dica:</strong> pule sobre BuzzBombers para derrotá-los. Com anéis, um impacto custa o saldo, mas não encerra a corrida.</p>
    </section>`;
}

function renderLose(distance) {
  const balance = game.level?.ringBalance ?? 0;
  const total = game.level?.ringsCollected ?? 0;
  return `
    <section class="overlay-panel" role="dialog" aria-modal="true" aria-labelledby="overlay-title">
      <p class="eyebrow">Fim da corrida</p>
      <h1 class="panel-title" id="overlay-title">Derrota!</h1>
      <p class="panel-subtitle">Você ficou sem anéis. Colete mais na próxima tentativa e use o giro para abrir caminho.</p>

      <div class="results">
        <div class="result-card">
          <span>Distância</span>
          <strong>${distance} m</strong>
        </div>
        <div class="result-card">
          <span>Tempo</span>
          <strong>${formatTime(game.getElapsedTime())}</strong>
        </div>
        <div class="result-card">
          <span>Anéis</span>
          <strong>${balance}<span class="result-total"> / ${total}</span></strong>
          <small>saldo / total coletado</small>
        </div>
      </div>

      <div class="panel-actions">
        <button class="btn btn-primary" type="button" data-action="restart">Jogar de novo <kbd>Espaço</kbd></button>
      </div>

      <p class="panel-footnote">Pressione <strong>Espaço</strong> ou <strong>R</strong> para recomeçar.</p>
    </section>`;
}

function renderWin(distance) {
  const results = game.getResults();
  const balance = game.level?.ringBalance ?? 0;
  return `
    <section class="overlay-panel" role="dialog" aria-modal="true" aria-labelledby="overlay-title">
      <p class="eyebrow">Objetivo concluído</p>
      <h1 class="panel-title" id="overlay-title">Fase concluída!</h1>
      <p class="panel-subtitle">Você cruzou a linha de chegada. Confira o desempenho e tente melhorar sua nota.</p>

      <div class="results">
        <div class="result-card">
          <span>Distância</span>
          <strong>${distance} m</strong>
        </div>
        <div class="result-card">
          <span>Tempo</span>
          <strong>${formatTime(results.time)}</strong>
        </div>
        <div class="result-card">
          <span>Anéis</span>
          <strong>${balance}<span class="result-total"> / ${results.rings}</span></strong>
          <small>saldo / total coletado · ${results.ringsPerMinute.toFixed(1)} por minuto</small>
        </div>
        <div class="result-card grade">
          <span>Nota</span>
          <strong>${results.grade}</strong>
        </div>
      </div>

      <div class="panel-actions">
        <button class="btn btn-primary" type="button" data-action="restart">Jogar novamente <kbd>R</kbd></button>
      </div>

      <p class="panel-footnote">Pressione <strong>Espaço</strong> ou <strong>R</strong> para iniciar uma nova corrida.</p>
    </section>`;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  return `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

// Bungee não tem algarismos tabulares (font-variant-numeric: tabular-nums não muda nada):
// cada caractere vai numa célula de largura fixa, então o HUD não muda de tamanho.
function setFixedWidthText(element, text) {
  text = String(text);
  if (element.dataset.text === text) return;
  element.dataset.text = text;
  element.replaceChildren(...[...text].map((char) => {
    const cell = document.createElement('span');
    cell.className = /[0-9]/.test(char) ? 'hud-digit' : 'hud-digit hud-digit-sep';
    cell.textContent = char;
    return cell;
  }));
}

function updateHud(distance, speed) {
  setFixedWidthText(hudDistance, distance);
  setFixedWidthText(hudSpeed, speed);
  setFixedWidthText(hudRings, game.level?.ringBalance ?? 0);
  setFixedWidthText(hudTime, formatTime(game.getElapsedTime()));
}

function updateOverlay(distance) {
  if (game.state === overlayState) return;
  overlayState = game.state;

  const visible = game.state === 'lose' || game.state === 'paused' || game.state === 'win';
  overlay.classList.toggle('is-open', visible);
  overlay.setAttribute('aria-hidden', String(!visible));

  if (!visible) {
    overlay.innerHTML = '';
    return;
  }

  if (game.state === 'lose') overlay.innerHTML = renderLose(distance);
  else if (game.state === 'win') overlay.innerHTML = renderWin(distance);
  else overlay.innerHTML = renderPause(distance);
}

function updateAudioButton() {
  const button = overlay.querySelector('[data-action="toggle-audio"]');
  if (!button) return;
  const muted = game.audio?.muted ?? false;
  button.setAttribute('aria-pressed', String(muted));
  button.innerHTML = `${muted ? 'Som desligado' : 'Som ligado'} <kbd>M</kbd>`;
}

function toggleAudio() {
  if (!game.audio) return;
  game.audio.toggleMuted();
  updateAudioButton();
  game.audio.play('click');
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyC') game.switchCamera();
  if (e.code === 'KeyP' && !e.repeat) game.togglePause();
  if (e.code === 'Escape' && game.state === 'paused') game.togglePause();
  if (e.code === 'KeyR' && game.state === 'paused') window.location.reload();
  if (e.code === 'KeyM' && game.state === 'paused') {
    e.preventDefault();
    toggleAudio();
  }
  if ((e.code === 'Space' || e.code === 'KeyR') &&
      (game.state === 'lose' || game.state === 'win') && restartReady) {
    window.location.reload();
  }
});

overlay.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  if (button.dataset.action === 'resume') game.togglePause();
  else if (button.dataset.action === 'restart') window.location.reload();
  else if (button.dataset.action === 'toggle-audio') toggleAudio();
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
  if ((game.state === 'lose' || game.state === 'win') &&
      !input.isDown('Space')) restartReady = true;

  const distance = game.getDistance().toFixed(1);
  const speed = Math.abs(game.level?.sonic?.logic.getSpeed().x ?? 0).toFixed(1);
  updateHud(distance, speed);
  updateOverlay(distance);
}
loop();
