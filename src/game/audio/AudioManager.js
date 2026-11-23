import { GameAudio } from './GameAudio.js';
import { AUDIO_MANIFEST } from './audioManifest.js';

const DEFAULT_TRACK = 'level1';

/**
 * Camada de áudio baseada em arquivos sobre o GameAudio sintetizado.
 *
 * - Se o manifesto tiver um caminho e o arquivo carregar, usa MP3.
 * - Se o caminho for null ou o carregamento falhar, mantém o som sintetizado.
 * - Compartilha o mesmo AudioContext, os mesmos buses e o mesmo volume do GameAudio.
 */
export class AudioManager extends GameAudio {
  constructor() {
    super();
    this.musicAssets = new Map();
    this.sfxAssets = new Map();
    this.assetLoadPromise = null;
    this.assetsReady = false;
    this.musicSource = null;
    this.currentTrack = null;
    this.pendingTrack = DEFAULT_TRACK;
  }

  unlock() {
    super.unlock();
    this.loadAssets();
  }

  assetUrl(path) {
    const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '');
    return `${base}/${String(path).replace(/^\//, '')}`;
  }

  hasMusic(name) {
    return Boolean(name && AUDIO_MANIFEST.music?.[name]);
  }

  loadAssets() {
    if (this.assetLoadPromise) return this.assetLoadPromise;
    if (!this.context) {
      this.assetsReady = true;
      this.assetLoadPromise = Promise.resolve();
      return this.assetLoadPromise;
    }

    const entries = [];
    for (const [name, path] of Object.entries(AUDIO_MANIFEST.music ?? {})) {
      if (path) entries.push({ assets: this.musicAssets, name, path });
    }
    for (const [name, path] of Object.entries(AUDIO_MANIFEST.sfx ?? {})) {
      if (path) entries.push({ assets: this.sfxAssets, name, path });
    }

    if (entries.length === 0) {
      this.assetsReady = true;
      this.assetLoadPromise = Promise.resolve();
      return this.assetLoadPromise;
    }

    this.assetLoadPromise = Promise.all(entries.map(({ assets, name, path }) =>
      this.loadAsset(assets, name, path),
    )).then(() => {
      this.assetsReady = true;
      if (this.musicEnabled) this.startMusic(this.pendingTrack);
    });
    return this.assetLoadPromise;
  }

  async loadAsset(assets, name, path) {
    try {
      const response = await fetch(this.assetUrl(path));
      if (!response.ok) return;
      const data = await response.arrayBuffer();
      const buffer = await this.context.decodeAudioData(data);
      assets.set(name, buffer);
    } catch {
      // Arquivo opcional: o sintetizador continua cobrindo esse som.
    }
  }

  play(name) {
    if (this.muted) return;
    this.unlock();

    const buffer = this.sfxAssets.get(name);
    if (!buffer) {
      super.play(name);
      return;
    }

    const context = this.context;
    if (!context || context.state !== 'running' || !this.sfxBus) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.sfxBus);
    source.onended = () => source.disconnect();
    source.start();
  }

  startMusic(track = DEFAULT_TRACK) {
    if (track) this.pendingTrack = track;
    this.musicEnabled = true;
    if (!this.context) {
      this.unlock();
    } else {
      this.loadAssets();
      if (this.context.state === 'suspended') {
        this.context.resume()
          .then(() => {
            if (this.musicEnabled) this.startMusic(this.pendingTrack);
          })
          .catch(() => {});
      }
    }

    const wanted = this.pendingTrack;
    // Espera o manifesto terminar de carregar antes de decidir entre MP3 e synth.
    if (!this.assetsReady && this.hasMusic(wanted)) return;
    if (this.currentTrack === wanted && (this.musicSource || this.musicTimer)) return;

    const buffer = this.musicAssets.get(wanted);
    if (buffer) {
      this.playMusicBuffer(buffer, wanted);
      return;
    }

    // Se uma faixa em arquivo estava tocando, ela não pode continuar junto do synth.
    this.stopMusicSource();
    this.currentTrack = wanted;
    super.startMusic();
  }

  playMusicBuffer(buffer, name) {
    this.stopMusicSource();
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (!this.context || !this.musicBus) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.musicBus);
    source.start();
    this.musicSource = source;
    this.currentTrack = name;
  }

  stopMusic() {
    super.stopMusic();
    this.stopMusicSource();
    this.currentTrack = null;
  }

  stopMusicSource() {
    if (!this.musicSource) return;
    try { this.musicSource.stop(); } catch { /* já parado */ }
    this.musicSource.disconnect();
    this.musicSource = null;
  }
}
