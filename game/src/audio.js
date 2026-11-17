// audio.js — every sound is synthesised with WebAudio: no audio files.
// The context is created on the first user gesture (browsers require it),
// a quiet ambient pad loops underneath, and M toggles the master mute.

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.padNodes = null;
    this.muted = false;
  }

  // Call from any user gesture. Safe to call repeatedly; only the first
  // call builds the context and starts the pad.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
    this.startPad();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.9;
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // A short oscillator blip with an exponential decay envelope.
  tone(freqStart, freqEnd, duration, type, volume, delay = 0) {
    if (!this.ctx) return;
    const t0 = this.now() + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + duration);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  // Filtered noise burst: whooshes, hits and shatters.
  noise(duration, volume, filterFreq, type = 'bandpass', delay = 0) {
    if (!this.ctx) return;
    const t0 = this.now() + delay;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(t0);
    source.stop(t0 + duration + 0.02);
  }

  playDash() {
    this.noise(0.22, 0.35, 1400);
    this.tone(320, 90, 0.18, 'sine', 0.18);
  }

  playIgnite(combo) {
    const base = 520 + Math.min(combo, 12) * 36;
    this.tone(base, base * 1.6, 0.16, 'triangle', 0.28);
    this.tone(base * 1.5, base * 2.1, 0.2, 'sine', 0.16, 0.04);
    this.noise(0.14, 0.16, 3200, 'highpass');
  }

  playPickup() {
    this.tone(880, 1320, 0.09, 'sine', 0.14);
  }

  playHit() {
    this.tone(160, 55, 0.3, 'sawtooth', 0.3);
    this.noise(0.25, 0.3, 300, 'lowpass');
  }

  playOrbShatter() {
    this.tone(700, 240, 0.12, 'square', 0.1);
    this.noise(0.1, 0.12, 4200, 'highpass');
  }

  playHorn() {
    this.tone(196, 196, 0.5, 'triangle', 0.22);
    this.tone(294, 294, 0.5, 'triangle', 0.18, 0.02);
    this.tone(392, 392, 0.42, 'sine', 0.12, 0.05);
  }

  playNova() {
    this.noise(0.5, 0.3, 900);
    this.tone(220, 880, 0.45, 'sine', 0.22);
  }

  playClick() {
    this.tone(660, 660, 0.06, 'sine', 0.12);
  }

  playUpgrade() {
    this.tone(523, 523, 0.12, 'triangle', 0.2);
    this.tone(659, 659, 0.12, 'triangle', 0.2, 0.09);
    this.tone(784, 784, 0.2, 'triangle', 0.22, 0.18);
  }

  playBoss() {
    this.tone(98, 82, 1.1, 'sawtooth', 0.2);
    this.tone(147, 123, 1.1, 'sawtooth', 0.14, 0.05);
    this.noise(0.8, 0.12, 200, 'lowpass');
  }

  playVictory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => this.tone(freq, freq, 0.35, 'triangle', 0.22, i * 0.13));
  }

  playGameOver() {
    const notes = [392, 330, 262, 196];
    notes.forEach((freq, i) => this.tone(freq, freq * 0.94, 0.4, 'triangle', 0.2, i * 0.16));
  }

  // Two slow detuned triangle waves through a low-pass filter: a dark,
  // quiet drone that sits under everything. Started once, never stopped.
  startPad() {
    if (!this.ctx || this.padNodes) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.045;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const oscA = this.ctx.createOscillator();
    oscA.type = 'triangle';
    oscA.frequency.value = 55;
    const oscB = this.ctx.createOscillator();
    oscB.type = 'triangle';
    oscB.frequency.value = 55.7;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    oscA.start();
    oscB.start();
    lfo.start();
    this.padNodes = { gain };
  }
}
