// Som sintetizado original; nenhuma amostra ou dependência externa.
export class RingAudio {
  constructor() {
    this.side = -1;
    this.unlock = () => {
      try {
        const AudioContext = window.AudioContext ?? window.webkitAudioContext;
        if (!AudioContext) return;
        this.context ??= new AudioContext();
        this.context.resume().then(() => {
          window.removeEventListener('keydown', this.unlock);
          window.removeEventListener('pointerdown', this.unlock);
        }).catch(() => {});
      } catch { /* A coleta continua mesmo sem áudio. */ }
    };
    window.addEventListener('keydown', this.unlock);
    window.addEventListener('pointerdown', this.unlock);
  }

  play() {
    const context = this.context;
    if (context?.state !== 'running') return;
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const pan = context.createStereoPanner();
      const now = context.currentTime;
      pan.pan.value = this.side;
      this.side *= -1;
      oscillator.frequency.setValueAtTime(1100, now);
      oscillator.frequency.exponentialRampToValueAtTime(1760, now + 0.07);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      oscillator.connect(gain).connect(pan).connect(context.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); pan.disconnect(); };
      oscillator.start(now);
      oscillator.stop(now + 0.12);
    } catch { /* Web Audio é opcional. */ }
  }
}
