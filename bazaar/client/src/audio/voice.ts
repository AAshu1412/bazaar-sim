/** Spoken lines (public/voice, made by `npm run voice:audio`). One at a time; a missing file just stays silent. */
class Voice {
  private el: HTMLAudioElement | null = null;
  private timer?: ReturnType<typeof setTimeout>;
  private waiting: (() => void)[] = [];
  private speaking = false;
  private paused = false;
  private enabled = true;

  play(file: string, delayMs = 0) {
    this.stop();
    if (!this.enabled) return;
    const el = new Audio(`/voice/${file}`);
    this.el = el;
    this.speaking = true;
    const end = () => { if (this.el === el) this.finish(); };
    el.onended = el.onerror = end;
    this.timer = setTimeout(() => { if (!this.paused) el.play().catch(end); }, delayMs);
  }

  pause(paused: boolean) {
    this.paused = paused;
    if (!this.el || !this.speaking) return;
    if (paused) this.el.pause();
    else this.el.play().catch(() => this.finish());
  }

  /** Runs `then` once the current line is over (at once if nothing is playing). Returns a canceller. */
  whenDone(then: () => void) {
    if (!this.speaking) { then(); return () => {}; }
    this.waiting.push(then);
    return () => { this.waiting = this.waiting.filter((w) => w !== then); };
  }

  stop() {
    clearTimeout(this.timer);
    this.el?.pause();
    this.el = null;
    this.speaking = this.paused = false;
    this.waiting = [];
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled) return;
    clearTimeout(this.timer);
    this.el?.pause();
    this.finish(); // anything waiting on the line carries on
  }

  private finish() {
    this.speaking = false;
    const waiting = this.waiting;
    this.waiting = [];
    waiting.forEach((w) => w());
  }
}

export const voice = new Voice();
export const clip = (kind: "intro" | "story", n: number, who: string) => `${kind}_${String(n).padStart(2, "0")}_${who}.mp3`;
