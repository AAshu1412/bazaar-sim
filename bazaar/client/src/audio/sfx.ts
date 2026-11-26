/** Soft game sounds synthesised with Web Audio (no audio files). Each is a function so it can be rendered offline. */
type Sound = (ctx: BaseAudioContext, out: AudioNode, t: number) => void;

/** One plucked tone: instant soft attack, natural decay, optional pitch slide. */
function tone(ctx: BaseAudioContext, out: AudioNode, t: number, freq: number, dur: number, gain: number, to = freq) {
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}
/** A mallet on wood: the note plus a short bright overtone. */
const marimba = (ctx: BaseAudioContext, out: AudioNode, t: number, freq: number, gain = 0.28) => {
  tone(ctx, out, t, freq, 0.34, gain);
  tone(ctx, out, t, freq * 4, 0.07, gain * 0.22);
};
/** A short burst of muffled noise, for anything that hits wood. */
function thud(ctx: BaseAudioContext, out: AudioNode, t: number, cutoff: number, dur: number, gain: number) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate), data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
  const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(out);
  src.start(t);
}

export const SOUNDS = {
  /** a sale: two quick coin notes */
  coin: (ctx, out, t) => {
    tone(ctx, out, t, 987.8, 0.09, 0.16);
    tone(ctx, out, t + 0.065, 1318.5, 0.3, 0.18);
    tone(ctx, out, t + 0.065, 2637, 0.12, 0.035);
  },
  /** buttons: a dry wooden tap */
  tap: (ctx, out, t) => {
    tone(ctx, out, t, 430, 0.055, 0.16, 250);
    thud(ctx, out, t, 1800, 0.025, 0.12);
  },
  /** two raps of the auctioneer's gavel */
  gavel: (ctx, out, t) => {
    [0, 0.17].forEach((d, i) => {
      thud(ctx, out, t + d, 900, 0.09, i ? 0.55 : 0.7);
      tone(ctx, out, t + d, 190, 0.14, i ? 0.28 : 0.36, 85);
    });
  },
  /** a city event: rising chime */
  event: (ctx, out, t) => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => marimba(ctx, out, t + i * 0.09, f)),
  /** auction won: a short fanfare */
  win: (ctx, out, t) => {
    [783.99, 987.77, 1174.66].forEach((f, i) => marimba(ctx, out, t + i * 0.1, f));
    [783.99, 987.77, 1567.98].forEach((f) => marimba(ctx, out, t + 0.34, f, 0.18));
  },
} satisfies Record<string, Sound>;

class SoundEffects {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private last: Partial<Record<keyof typeof SOUNDS, number>> = {};
  public enabled = true;

  constructor() {
    if (typeof window === "undefined") return;
    // Browsers only allow audio after a gesture. Notes queued before that would all fire at once, so none are.
    const unlock = () => {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.out = this.ctx.createGain();
        this.out.gain.value = 0.55;
        this.out.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
  }

  /** `gapMs` stops busy moments (a queue of shoppers, a dragged slider) from piling up. */
  private play(name: keyof typeof SOUNDS, gapMs = 0) {
    if (!this.enabled || !this.ctx || !this.out || this.ctx.state !== "running" || document.hidden) return;
    const now = performance.now();
    if (now - (this.last[name] ?? -Infinity) < gapMs) return;
    this.last[name] = now;
    SOUNDS[name](this.ctx, this.out, this.ctx.currentTime + 0.01);
  }

  playChing() { this.play("coin", 450); }
  playPriceClick() { this.play("tap", 70); }
  playGavel() { this.play("gavel", 300); }
  playVrfAlert() { this.play("event", 1000); }
  playWin() { this.play("win", 1000); }
}

export const sfx = new SoundEffects();
