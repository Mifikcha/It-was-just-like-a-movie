// Scroll-scrubbed image sequences rendered from the Blender megastructure.
// One fixed canvas draws the active sequence with cover-fit around a focal point; the fractional
// frame index cross-fades neighbouring frames, and screen anchors let HTML sit on rendered geometry.

export type SequenceName = string;

type Width = 1920 | 960;

/** One resolution of a sequence. */
type Tier = {
  width: Width;
  images: (HTMLImageElement | undefined)[];
  loaded: boolean[];
  cursor: number;
};

type Sequence = {
  name: SequenceName;
  frames: number;
  /** body load order: key frames (every 8th), then every 4th, 2nd, the rest */
  order: number[];
  /** 960 for everyone first: light enough that whole flights arrive quickly */
  lo: Tier;
  /** the screen's own resolution, swapped in frame by frame once the light frames are in */
  hi: Tier | null;
};

// a few requests at a time, so the queue order holds instead of every frame sharing the line
const MAX_IN_FLIGHT = 4;

const FRAME_W = 1920;
const FRAME_H = 1080;

// 2×2 10-bit AVIF, the same profile as the frames: if it decodes, the frames will
const AVIF_PROBE =
  "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAAD5bWV0YQAAAAAAAAAvaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAFBpY3R1cmVIYW5kbGVyAAAAAA5waXRtAAAAAAABAAAAHmlsb2MAAAAARAAAAQABAAAAAQAAASEAAAAWAAAAKGlpbmYAAAAAAAEAAAAaaW5mZQIAAAAAAQAAYXYwMUNvbG9yAAAAAGppcHJwAAAAS2lwY28AAAAUaXNwZQAAAAAAAAACAAAAAgAAABBwaXhpAAAAAAMKCgoAAAAMYXYxQ4EATAAAAAATY29scm5jbHgAAgACAAIAAAAAF2lwbWEAAAAAAAAAAQABBAECgwQAAAAebWRhdAoFGAA24CAyDRgAAABQAAAAALATSyg=";

const tier = (width: Width): Tier => ({ width, images: [], loaded: [], cursor: 0 });

export class SequenceStage {
  private ctx: CanvasRenderingContext2D;
  private sequences = new Map<SequenceName, Sequence>();
  /** sequences to load, most urgent first (the active one always goes ahead) */
  private wanted: SequenceName[] = [];
  private inFlight = 0;
  /** frame format, known once the AVIF probe settles; nothing loads before that */
  private ext: "avif" | "webp" | null = null;
  private active: SequenceName = "approach";
  private target = 0;
  private current = 0;
  private fade = 0; // 0 = image, 1 = black
  private raf = 0;
  private dirty = true;
  private focusX = 0.62;
  private listeners: (() => void)[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private base: string,
    counts: Record<SequenceName, number>,
  ) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    // screens wider than a phone sharpen to 1920 (1080p, downscaled from the 1440p renders);
    // phones and data saver stay on the light tier
    const px = window.innerWidth * Math.min(window.devicePixelRatio, 2);
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    const sharp: Width | null = !saveData && px > 1400 ? 1920 : null;
    for (const [name, frames] of Object.entries(counts) as [SequenceName, number][]) {
      const order: number[] = [];
      for (const step of [8, 4, 2, 1]) {
        for (let i = 0; i < frames; i += step) if (!order.includes(i)) order.push(i);
      }
      this.sequences.set(name, { name, frames, order, lo: tier(960), hi: sharp ? tier(sharp) : null });
    }
    const probe = new Image();
    const settle = (avif: boolean) => {
      if (this.ext) return;
      this.ext = avif ? "avif" : "webp";
      // without AVIF only the light WebP frames exist
      if (!avif) this.sequences.forEach((seq) => (seq.hi = null));
      this.pump();
    };
    probe.onload = () => settle(probe.width === 2);
    probe.onerror = () => settle(false);
    probe.src = AVIF_PROBE;
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.tick = this.tick.bind(this);
    this.raf = requestAnimationFrame(this.tick);
  }

  src(name: SequenceName, index: number, width: Width = 960) {
    return `${this.base}/seq/${name}/${width}/${String(index + 1).padStart(4, "0")}.${this.ext ?? "webp"}`;
  }

  private load(name: SequenceName, t: Tier, index: number) {
    const img = new Image();
    img.decoding = "async";
    t.images[index] = img;
    this.inFlight++;
    const done = (ok: boolean) => {
      this.inFlight--;
      t.loaded[index] = ok;
      if (ok && name === this.active) this.dirty = true;
      this.pump();
    };
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = this.src(name, index, t.width);
  }

  /** The next frame to fetch, or null when everything wanted is in. */
  private nextJob(): [SequenceName, Tier, number] | null {
    const pool = [this.active, ...this.wanted.filter((n) => n !== this.active)]
      .filter((n) => this.wanted.includes(n))
      .map((n) => this.sequences.get(n)!);
    // the frame on screen right now goes ahead of the ends of the visible flight
    const ends = (seq: Sequence) =>
      seq.name === this.active ? [Math.round(this.target), seq.frames - 1, 0] : [seq.frames - 1, 0];
    const body = (t: Tier, seq: Sequence) => {
      while (t.cursor < seq.order.length) {
        const i = seq.order[t.cursor++];
        if (!t.images[i]) return i;
      }
      return -1;
    };
    // 1. ends of the flights in play: a scene's backdrop is the last frame of its flight,
    //    and the first frame continues the previous one
    for (const seq of pool) for (const i of ends(seq)) if (!seq.lo.images[i]) return [seq.name, seq.lo, i];
    // 2. every scene's backdrop, so no scene is ever reached with an empty sky
    for (const seq of this.sequences.values()) {
      const i = seq.frames - 1;
      if (!seq.lo.images[i]) return [seq.name, seq.lo, i];
    }
    // 3. the light frames of the flights in play, so scrubbing is smooth early
    for (const seq of pool) {
      const i = body(seq.lo, seq);
      if (i >= 0) return [seq.name, seq.lo, i];
    }
    // 4. then sharpen: the same order at the screen's resolution
    for (const seq of pool) {
      if (!seq.hi) continue;
      for (const i of ends(seq)) if (!seq.hi.images[i]) return [seq.name, seq.hi, i];
      const i = body(seq.hi, seq);
      if (i >= 0) return [seq.name, seq.hi, i];
    }
    return null;
  }

  private pump() {
    if (!this.ext) return;
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

  private has(seq: Sequence, i: number) {
    return !!(seq.hi?.loaded[i] || seq.lo.loaded[i]);
  }

  /** The sharpest loaded image of a frame. */
  private image(seq: Sequence, i: number) {
    return seq.hi?.loaded[i] ? seq.hi.images[i]! : seq.lo.images[i]!;
  }

  private nearestLoaded(seq: Sequence, index: number) {
    for (let d = 0; d < seq.frames; d++) {
      if (this.has(seq, index - d)) return index - d;
      if (this.has(seq, index + d)) return index + d;
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
    const a = this.has(seq, lo) ? lo : this.nearestLoaded(seq, lo);
    if (a < 0) {
      ctx.fillStyle = "#04050b";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      return;
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(this.image(seq, a), ox, oy, w, h);
    if (a === lo && frac > 0.02 && this.has(seq, hi)) {
      ctx.globalAlpha = frac;
      ctx.drawImage(this.image(seq, hi), ox, oy, w, h);
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
