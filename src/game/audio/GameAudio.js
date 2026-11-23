const STORAGE_KEY = 'cinos.muted';
const VOLUME_KEY = 'cinos.volume';
const DEFAULT_VOLUME = 0.7;
const MUSIC_BPM = 138;

// Trilha original de 32 passos, sem samples ou gravações de terceiros.
const BASS_NOTES = [45, 45, 48, 48, 41, 41, 43, 43];
const LEAD_NOTES = [
  69, 0, 72, 0, 76, 0, 72, 0, 69, 0, 76, 0, 81, 0, 76, 0,
  72, 0, 76, 0, 79, 0, 76, 0, 72, 0, 79, 0, 84, 0, 79, 0,
];

function midiToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

export class GameAudio {
  constructor() {
    this.muted = this.readMuted();
    this.volume = this.readVolume();
    this.context = null;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.musicEnabled = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.nextNoteTime = 0;
    this.side = -1;

    if (typeof window !== 'undefined') {
      this.unlockHandler = () => this.unlock();
      window.addEventListener('keydown', this.unlockHandler);
      window.addEventListener('pointerdown', this.unlockHandler);
    }
  }

  readMuted() {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  writeMuted() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, this.muted ? '1' : '0');
      }
    } catch { /* localStorage pode estar indisponível. */ }
  }

  readVolume() {
    try {
      if (typeof localStorage === 'undefined') return DEFAULT_VOLUME;
      const raw = localStorage.getItem(VOLUME_KEY);
      if (raw === null) return DEFAULT_VOLUME;
      const value = Number(raw);
      if (!Number.isFinite(value)) return DEFAULT_VOLUME;
      return Math.min(1, Math.max(0, value));
    } catch {
      return DEFAULT_VOLUME;
    }
  }

  writeVolume() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(VOLUME_KEY, String(this.volume));
      }
    } catch { /* localStorage pode estar indisponível. */ }
  }

  setVolume(volume) {
    this.volume = Number.isFinite(volume)
      ? Math.min(1, Math.max(0, volume))
      : DEFAULT_VOLUME;
    this.writeVolume();
    if (this.master && this.context) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, now, 0.01);
    }
    return this.volume;
  }

  removeUnlockListeners() {
    if (typeof window === 'undefined' || !this.unlockHandler) return;
    window.removeEventListener('keydown', this.unlockHandler);
    window.removeEventListener('pointerdown', this.unlockHandler);
    this.unlockHandler = null;
  }

  setupBuses() {
    if (!this.context || this.master) return;
    this.master = this.context.createGain();
    this.sfxBus = this.context.createGain();
    this.musicBus = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.sfxBus.gain.value = 0.55;
    this.musicBus.gain.value = 0.16;
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.master.connect(this.context.destination);
  }

  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      if (this.context.state === 'running') {
        this.removeUnlockListeners();
        if (this.musicEnabled) this.startMusic();
      }
      return;
    }

    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      this.context = new AudioContextClass();
      this.setupBuses();
      this.context.resume().then(() => {
        this.removeUnlockListeners();
        if (this.musicEnabled) this.startMusic();
      }).catch(() => {});
    } catch { /* Áudio é opcional. */ }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this.writeMuted();
    if (!this.muted) this.unlock();
    if (this.master && this.context) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, now, 0.01);
    }
    return this.muted;
  }

  toggleMuted() {
    return this.setMuted(!this.muted);
  }

  tone(frequency, endFrequency, duration, type, volume, pan = 0, delay = 0) {
    const context = this.context;
    if (!context || !this.sfxBus || context.state !== 'running') return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const panner = context.createStereoPanner?.() ?? null;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    if (panner) {
      panner.pan.value = pan;
      gain.connect(panner);
      panner.connect(this.sfxBus);
    } else {
      gain.connect(this.sfxBus);
    }
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      panner?.disconnect();
    };
  }

  play(name) {
    if (this.muted) return;
    this.unlock();
    const context = this.context;
    if (!context || context.state !== 'running') return;

    switch (name) {
      case 'ring': {
        const side = this.side;
        this.side *= -1;
        this.tone(1100, 1760, 0.12, 'sine', 0.08, side);
        break;
      }
      case 'jump':
        this.tone(260, 620, 0.16, 'square', 0.055);
        break;
      case 'land':
        this.tone(150, 85, 0.09, 'triangle', 0.05);
        break;
      case 'brake':
        this.tone(420, 120, 0.18, 'sawtooth', 0.035);
        break;
      case 'stomp':
        this.tone(180, 70, 0.14, 'square', 0.1);
        break;
      case 'hit':
        this.tone(330, 70, 0.28, 'sawtooth', 0.1);
        this.tone(120, 55, 0.22, 'triangle', 0.08, 0, 0.04);
        break;
      case 'camera':
        this.tone(500, 900, 0.06, 'square', 0.035);
        break;
      case 'pause':
        this.tone(660, 660, 0.08, 'square', 0.05);
        this.tone(880, 880, 0.1, 'square', 0.05, 0, 0.08);
        break;
      case 'resume':
        this.tone(880, 880, 0.08, 'square', 0.05);
        this.tone(660, 660, 0.1, 'square', 0.05, 0, 0.08);
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((note, index) => {
          this.tone(note, note, 0.2, 'square', 0.08, 0, index * 0.11);
        });
        break;
      case 'lose':
        [330, 262, 196, 131].forEach((note, index) => {
          this.tone(note, note, 0.24, 'triangle', 0.09, 0, index * 0.14);
        });
        break;
      case 'click':
        this.tone(700, 900, 0.045, 'square', 0.04);
        break;
      default:
        break;
    }
  }

  musicTone(note, time, duration, type, volume) {
    const context = this.context;
    if (!context || !this.musicBus) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = midiToFrequency(note);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(gain).connect(this.musicBus);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.03);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  scheduleMusic() {
    const context = this.context;
    if (!context || context.state !== 'running' || !this.musicBus) return;
    const stepDuration = 60 / MUSIC_BPM / 4;
    if (this.nextNoteTime < context.currentTime) {
      this.nextNoteTime = context.currentTime + 0.05;
    }
    while (this.nextNoteTime < context.currentTime + 0.25) {
      const step = this.musicStep % 32;
      if (step % 4 === 0) {
        this.musicTone(BASS_NOTES[Math.floor(step / 4)], this.nextNoteTime, 0.32, 'triangle', 0.04);
      }
      const lead = LEAD_NOTES[step];
      if (lead) this.musicTone(lead, this.nextNoteTime, 0.12, 'square', 0.022);
      this.musicStep++;
      this.nextNoteTime += stepDuration;
    }
  }

  startMusic() {
    this.musicEnabled = true;
    if (!this.context || this.context.state !== 'running' || !this.musicBus) return;
    if (this.musicTimer) return;
    this.musicStep = 0;
    this.nextNoteTime = this.context.currentTime + 0.1;
    this.scheduleMusic();
    this.musicTimer = setInterval(() => this.scheduleMusic(), 50);
  }

  stopMusic() {
    this.musicEnabled = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
