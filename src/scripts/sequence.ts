// Scroll-scrubbed image sequences rendered from the Blender megastructure.
// One fixed canvas draws the active sequence with cover-fit around a focal point; the fractional
// frame index cross-fades neighbouring frames, and screen anchors let HTML sit on rendered geometry.

export type SequenceName = string;

type Sequence = {
  name: SequenceName;
  frames: number;
  images: (HTMLImageElement | undefined)[];
  loaded: boolean[];
  /** remaining load order: key frames (every 8th), then every 4th, 2nd, the rest */
  order: number[];
  cursor: number;
};

// a few requests at a time, so the queue order holds instead of every frame sharing the line
const MAX_IN_FLIGHT = 4;

const FRAME_W = 1920;
const FRAME_H = 1080;

export class SequenceStage {
  private ctx: CanvasRenderingContext2D;
  private sequences = new Map<SequenceName, Sequence>();
  /** sequences to load, most urgent first (the active one always goes ahead) */
  private wanted: SequenceName[] = [];
  private inFlight = 0;
  private active: SequenceName = "approach";
  private target = 0;
  private current = 0;
  private fade = 0; // 0 = image, 1 = black
  private raf = 0;
  private dirty = true;
  private focusX = 0.62;
  private resolution: 2560 | 1920 | 960;
  private listeners: (() => void)[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private base: string,
    counts: Record<SequenceName, number>,
  ) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    for (const [name, frames] of Object.entries(counts) as [SequenceName, number][]) {
      const order: number[] = [];
      for (const step of [8, 4, 2, 1]) {
        for (let i = 0; i < frames; i += step) if (!order.includes(i)) order.push(i);
      }
      this.sequences.set(name, { name, frames, images: [], loaded: [], order, cursor: 0 });
    }
    // device pixels across the viewport pick the tier: phones 960, laptops 1920, large and retina screens 2560
    const px = window.innerWidth * Math.min(window.devicePixelRatio, 2);
    this.resolution = px > 2200 ? 2560 : px > 1400 ? 1920 : 960;
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.tick = this.tick.bind(this);
    this.raf = requestAnimationFrame(this.tick);
  }

  src(name: SequenceName, index: number) {
    return `${this.base}/seq/${name}/${this.resolution}/${String(index + 1).padStart(4, "0")}.webp`;
  }

  private load(name: SequenceName, index: number) {
    const seq = this.sequences.get(name)!;
    const img = new Image();
    img.decoding = "async";
    seq.images[index] = img;
    this.inFlight++;
    const done = (ok: boolean) => {
      this.inFlight--;
      seq.loaded[index] = ok;
      if (ok) this.dirty = true;
      this.pump();
    };
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = this.src(name, index);
  }

  /** The next frame to fetch, or null when everything wanted is in. */
  private nextJob(): [SequenceName, number] | null {
    const pool = [this.active, ...this.wanted.filter((n) => n !== this.active)].filter((n) => this.wanted.includes(n));
    // ends first: a scene's backdrop is the last frame of its flight, and the first frame continues the previous one
    for (const name of pool) {
      const seq = this.sequences.get(name)!;
      for (const i of [seq.frames - 1, 0]) if (!seq.images[i]) return [name, i];
    }
    for (const name of pool) {
      const seq = this.sequences.get(name)!;
      while (seq.cursor < seq.order.length) {
        const i = seq.order[seq.cursor++];
        if (!seq.images[i]) return [name, i];
      }
    }
    return null;
  }

  private pump() {
    while (this.inFlight < MAX_IN_FLIGHT) {
      const job = this.nextJob();
      if (!job) return;
      this.load(...job);
    }
  }

  /** Queue sequences for loading; later calls jump ahead of earlier ones, in the order given. */
  preload(...names: SequenceName[]) {
    const known = names.filter((n) => this.sequences.has(n));
    if (known.length === 0) return;
    this.wanted = [...known, ...this.wanted.filter((n) => !known.includes(n))];
    this.pump();
  }

  /** progress 0..1 inside the named sequence. */
  show(name: SequenceName, progress: number, immediate = false) {
    const seq = this.sequences.get(name);
    if (!seq) return;
    const index = Math.max(0, Math.min(1, progress)) * (seq.frames - 1);
    if (name !== this.active) {
      this.active = name;
      this.current = index;
      // the visible flight takes the head of the queue
      if (!this.wanted.includes(name)) this.wanted.unshift(name);
      this.pump();
    }
    this.target = index;
    if (immediate) this.current = index;
    this.dirty = true;
  }

  setFade(value: number) {
    if (Math.abs(value - this.fade) > 0.001) {
      this.fade = value;
      this.dirty = true;
    }
  }

  setFocus(x: number) {
    if (x === this.focusX) return;
    this.focusX = x;
    this.dirty = true;
    this.listeners.forEach((fn) => fn());
  }

  onLayout(fn: () => void) {
    this.listeners.push(fn);
  }

  /** Map a point of the rendered frame (0..1) to viewport pixels. */
  toScreen(fx: number, fy: number) {
    const { scale, ox, oy } = this.layout();
    return { x: ox + fx * FRAME_W * scale, y: oy + fy * FRAME_H * scale, scale };
  }

  private layout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.max(vw / FRAME_W, vh / FRAME_H);
    const w = FRAME_W * scale;
    const h = FRAME_H * scale;
    // keep the focal column in view when the viewport is narrower than 16:9
    const ox = Math.min(0, Math.max(vw - w, vw / 2 - this.focusX * w));
    const oy = (vh - h) / 2;
    return { scale, ox, oy, w, h };
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingQuality = "high";
    this.dirty = true;
    this.listeners.forEach((fn) => fn());
  }

  private nearestLoaded(seq: Sequence, index: number) {
    for (let d = 0; d < seq.frames; d++) {
      if (seq.loaded[index - d]) return index - d;
      if (seq.loaded[index + d]) return index + d;
    }
    return -1;
  }

  private tick() {
    const delta = this.target - this.current;
    if (Math.abs(delta) > 0.002) {
      this.current += delta * 0.18;
      this.dirty = true;
    } else if (delta !== 0) {
      this.current = this.target;
      this.dirty = true;
    }
    if (this.dirty) this.draw();
    this.raf = requestAnimationFrame(this.tick);
  }

  private draw() {
    this.dirty = false;
    const seq = this.sequences.get(this.active)!;
    const { ox, oy, w, h } = this.layout();
    const ctx = this.ctx;
    const lo = Math.floor(this.current);
    const hi = Math.min(seq.frames - 1, lo + 1);
    const frac = this.current - lo;
    const a = seq.loaded[lo] ? lo : this.nearestLoaded(seq, lo);
    if (a < 0) {
      ctx.fillStyle = "#04050b";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      return;
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(seq.images[a]!, ox, oy, w, h);
    if (a === lo && frac > 0.02 && seq.loaded[hi]) {
      ctx.globalAlpha = frac;
      ctx.drawImage(seq.images[hi]!, ox, oy, w, h);
      ctx.globalAlpha = 1;
    }
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(4, 5, 11, ${this.fade})`;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }
}
