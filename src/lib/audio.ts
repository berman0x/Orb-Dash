// Tiny synthesized audio: no files needed. Create only after a user gesture.
export class GameAudio {
  ctx: AudioContext | null = null;
  music = false;
  sfx = false;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private step = 0;

  private ensure() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur);
  }

  play(name: "gem" | "jump" | "crash" | "win" | "click") {
    if (!this.sfx) return;
    if (name === "gem") { this.tone(880, 0.12, "triangle", 0.15); setTimeout(() => this.tone(1320, 0.15, "triangle", 0.12), 60); }
    if (name === "jump") this.tone(300, 0.2, "sine", 0.15, 700);
    if (name === "crash") this.tone(220, 0.5, "sawtooth", 0.15, 40);
    if (name === "win") [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, "triangle", 0.14), i * 110));
    if (name === "click") this.tone(600, 0.05, "square", 0.05);
  }

  startMusic() {
    if (!this.music || this.musicTimer) return;
    this.ensure();
    const notes = [262, 330, 392, 330, 294, 349, 440, 349, 262, 330, 392, 523, 440, 392, 330, 294];
    this.musicTimer = setInterval(() => {
      const n = notes[this.step % notes.length] ?? 262;
      this.tone(n, 0.22, "triangle", 0.05);
      if (this.step % 4 === 0) this.tone(n / 2, 0.4, "sine", 0.07);
      this.step++;
    }, 200);
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}
