"use client";

import { ResourceType } from "@/types/game";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private ambientLfo: OscillatorNode | null = null;
  private isAmbientPlaying = false;

  private _muted = false;
  private _volume = 0.7;
  private _ambientEnabled = true;

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : this._volume;
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public get muted(): boolean {
    return this._muted;
  }

  public get volume(): number {
    return this._volume;
  }

  public get ambientEnabled(): boolean {
    return this._ambientEnabled;
  }

  public setMuted(muted: boolean): void {
    this._muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : this._volume,
        this.ctx.currentTime,
        0.03
      );
    }
  }

  public setVolume(vol: number): void {
    this._volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this._muted) {
      this.masterGain.gain.setTargetAtTime(
        this._volume,
        this.ctx.currentTime,
        0.03
      );
    }
  }

  public setAmbientEnabled(enabled: boolean, isGameRunning: boolean): void {
    this._ambientEnabled = enabled;
    if (enabled && isGameRunning) {
      this.startAmbientDrone();
    } else {
      this.stopAmbientDrone();
    }
  }

  /**
   * 🐦 Iconic 4-note Mockingjay Whistle (G4 - Bb4 - A4 - D4) on Game Start
   */
  public playMockingjayWhistle(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this._muted) return;

    const notes = [
      { freq: 392.0, start: 0.0, dur: 0.28 }, // G4
      { freq: 466.16, start: 0.3, dur: 0.28 }, // Bb4
      { freq: 440.0, start: 0.6, dur: 0.32 }, // A4
      { freq: 293.66, start: 0.96, dur: 0.55 }, // D4
    ];

    const now = ctx.currentTime;
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(n.freq, now + n.start);

      gain.gain.setValueAtTime(0.001, now + n.start);
      gain.gain.exponentialRampToValueAtTime(0.24, now + n.start + 0.05);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + n.start + n.dur
      );

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + n.start);
      osc.stop(now + n.start + n.dur + 0.05);
    }
  }

  /**
   * 👣 Subtle tactical footstep sound when the human player moves
   */
  public playStep(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this._muted) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.055);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.065);
  }

  /**
   * ⚔️ Melee Combat Strike & Metallic Armor Clash
   */
  public playCombatHit(hasArmor = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this._muted) return;

    const now = ctx.currentTime;

    // 1. Punchy low body impact
    const punchOsc = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punchOsc.type = "sawtooth";
    punchOsc.frequency.setValueAtTime(160, now);
    punchOsc.frequency.exponentialRampToValueAtTime(38, now + 0.14);

    punchGain.gain.setValueAtTime(0.32, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    punchOsc.connect(punchGain);
    punchGain.connect(this.masterGain);
    punchOsc.start(now);
    punchOsc.stop(now + 0.16);

    // 2. White noise slash / crunch burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.12);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = hasArmor ? 2400 : 1200;
    filter.Q.value = 1.8;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);

    // 3. Metallic sword/armor ring if armor is present
    if (hasArmor) {
      const ringOsc = ctx.createOscillator();
      const ringGain = ctx.createGain();
      ringOsc.type = "square";
      ringOsc.frequency.setValueAtTime(1480, now);
      ringOsc.frequency.exponentialRampToValueAtTime(880, now + 0.18);

      ringGain.gain.setValueAtTime(0.1, now);
      ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

      ringOsc.connect(ringGain);
      ringGain.connect(this.masterGain);
      ringOsc.start(now);
      ringOsc.stop(now + 0.2);
    }
  }

  /**
   * 🍎🛡️💊🎁 Resource Collection Chimes
   */
  public playResourcePickup(type: ResourceType): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this._muted) return;

    const now = ctx.currentTime;

    if (type === "food" || type === "medkit") {
      // Ascending emerald healing arpeggio
      const freqs =
        type === "medkit" ? [523.25, 659.25, 783.99, 1046.5] : [523.25, 659.25, 783.99];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, now + idx * 0.06);

        gain.gain.setValueAtTime(0.2, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.24);
      });
    } else if (type === "armor") {
      // Sci-fi shield harmonic power-up
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.22);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1600, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.26);
    } else {
      // Golden Cornucopia Supply Crate fanfare chord
      const chord = [440, 554.37, 659.25, 880];
      chord.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, now + idx * 0.04);

        gain.gain.setValueAtTime(0.18, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + idx * 0.04);
        osc.stop(now + 0.48);
      });
    }
  }

  /**
   * 💥 Iconic Hunger Games Capitol Cannon Boom when a tribute is eliminated!
   */
  public playCannonBoom(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this._muted) return;

    const now = ctx.currentTime;

    // 1. Deep Sub-Bass Cannon Shockwave
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(85, now);
    subOsc.frequency.exponentialRampToValueAtTime(22, now + 0.9);

    subGain.gain.setValueAtTime(0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 1.05);

    // 2. Explosive Low-Passed Cannon Noise Tail
    const duration = 1.2;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(110, now + duration);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    whiteNoise.start(now);

    // 3. High Capitol Chime Bell after the cannon
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = "sine";
    bellOsc.frequency.setValueAtTime(587.33, now + 0.15); // D5

    bellGain.gain.setValueAtTime(0.001, now + 0.15);
    bellGain.gain.linearRampToValueAtTime(0.18, now + 0.2);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

    bellOsc.connect(bellGain);
    bellGain.connect(this.masterGain);
    bellOsc.start(now + 0.15);
    bellOsc.stop(now + 1.35);
  }

  /**
   * 🪂 Capitol Parachute Supply Drop Alert
   */
  public playSupplyDrop(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this._muted) return;

    const now = ctx.currentTime;
    const freqs = [330, 440, 659.25];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now + idx * 0.11);

      gain.gain.setValueAtTime(0.15, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.38);
    });
  }

  /**
   * 🏆 Victory Fanfare when the match ends
   */
  public playVictoryFanfare(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this._muted) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 392.0, start: 0.0, dur: 0.22 }, // G4
      { freq: 523.25, start: 0.22, dur: 0.22 }, // C5
      { freq: 659.25, start: 0.44, dur: 0.22 }, // E5
      { freq: 783.99, start: 0.68, dur: 0.75 }, // G5
    ];

    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(n.freq, now + n.start);

      gain.gain.setValueAtTime(0.28, now + n.start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + n.start);
      osc.stop(now + n.start + n.dur + 0.04);
    }
  }

  /**
   * 🎶 Atmospheric Capitol Arena Synth Drone while match is running
   */
  public startAmbientDrone(): void {
    if (!this._ambientEnabled || this.isAmbientPlaying) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      this.ambientGain = ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.001, now);
      this.ambientGain.gain.linearRampToValueAtTime(0.06, now + 1.5);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(220, now);

      this.ambientOsc1 = ctx.createOscillator();
      this.ambientOsc2 = ctx.createOscillator();
      this.ambientOsc1.type = "sawtooth";
      this.ambientOsc2.type = "triangle";

      // Deep D2 + A2 fifth interval tension pad
      this.ambientOsc1.frequency.setValueAtTime(73.42, now);
      this.ambientOsc2.frequency.setValueAtTime(110.0, now);

      // Slow LFO modulating filter cutoff for breathing arena atmosphere
      this.ambientLfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      this.ambientLfo.frequency.setValueAtTime(0.18, now);
      lfoGain.gain.setValueAtTime(90, now);

      this.ambientLfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      this.ambientOsc1.connect(filter);
      this.ambientOsc2.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);

      this.ambientOsc1.start(now);
      this.ambientOsc2.start(now);
      this.ambientLfo.start(now);
      this.isAmbientPlaying = true;
    } catch {
      // Ignore autoplay restriction errors until user interacts
    }
  }

  public stopAmbientDrone(): void {
    if (!this.isAmbientPlaying) return;
    try {
      this.ambientOsc1?.stop();
      this.ambientOsc2?.stop();
      this.ambientLfo?.stop();
      this.ambientOsc1?.disconnect();
      this.ambientOsc2?.disconnect();
      this.ambientLfo?.disconnect();
      this.ambientGain?.disconnect();
    } catch {
      // Ignore already stopped oscillators
    }
    this.ambientOsc1 = null;
    this.ambientOsc2 = null;
    this.ambientLfo = null;
    this.ambientGain = null;
    this.isAmbientPlaying = false;
  }
}

export const soundEngine = new SoundEngine();
