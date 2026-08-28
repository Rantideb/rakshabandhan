/**
 * Native Web Audio API procedural sound synthesizer.
 * Generates authentic temple bell acoustics, aarti chime resonances,
 * and festive celebratory chords with 0 kB external audio assets.
 */

class FestiveAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Generates a rich, resonant temple bell strike with metallic inharmonic overtones
   */
  public playTempleBell(pitchMultiplier: number = 1.0) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const baseFreq = 523.25 * pitchMultiplier; // C5 base

    // Bell overtones: fundamental + partial frequencies based on traditional chime physics
    const partials = [
      { freq: baseFreq * 1.0, gain: 0.6, decay: 2.4 },
      { freq: baseFreq * 2.02, gain: 0.4, decay: 1.8 },
      { freq: baseFreq * 3.01, gain: 0.3, decay: 1.2 },
      { freq: baseFreq * 4.24, gain: 0.2, decay: 0.8 },
      { freq: baseFreq * 5.43, gain: 0.1, decay: 0.5 },
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.7, now);

    // Warm resonant low-pass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.Q.setValueAtTime(4, now);

    masterGain.connect(filter);
    filter.connect(ctx.destination);

    partials.forEach(({ freq, gain, decay }) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      // Strike attack and long natural exponential decay
      oscGain.gain.setValueAtTime(0.001, now);
      oscGain.gain.exponentialRampToValueAtTime(gain, now + 0.008);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start(now);
      osc.stop(now + decay + 0.1);
    });
  }

  /**
   * Plays a smooth celebratory ascending arpeggio when a ritual is completed
   */
  public playCelebrationChime() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    // Pentatonic festive scale (Raga Bhupali notes: C, D, E, G, A, C)
    const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTempleBell(freq / 523.25);
      }, idx * 90);
    });
  }

  /**
   * Tilak application soft shimmer sound
   */
  public playShimmer() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.3);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }
}

export const soundEngine = new FestiveAudioEngine();
