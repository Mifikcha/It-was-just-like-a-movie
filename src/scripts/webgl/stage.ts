// Real-time replacement for SequenceStage: the same public API (show / setFade / toScreen / progress …),
// so journey.ts drives it exactly as it drove the rendered flights. A "sequence" is now a camera path:
// show(name, t) puts the camera at t along that path. The state depends only on (path, t, construction),
// so scrolling back and forth always lands on the same picture.
import * as THREE from "three";
import { buildWorld, TIERS, U, type Layout, type Tier, type World } from "./world";

const FRAME_W = 1920;
const FRAME_H = 1080;

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
type Key = { p: THREE.Vector3; t: THREE.Vector3; fov: number; roll: number };

// Key compositions of the original flights (end frames of each Blender sequence).
const K: Record<string, Key> = {
  // hero: the sphere upper right, Earth below left, a station on its boom reaching left
  hero: { p: v(1.5, 1.2, 15.5), t: v(-3.8, -1.8, 0), fov: 32, roll: 0 },
  // end of the approach: the sphere head-on, centred (scene 02 holds it behind the drawing)
  front: { p: v(0.4, 0.3, 10.7), t: v(0, 0, 0), fov: 38, roll: 0 },
  // end of the stories flight: low over the shell, a ring crossing the frame
  shell: { p: v(-1.6, 1.5, 3.9), t: v(1.2, 0.1, 1.2), fov: 50, roll: -6 },
  // end of the subjects flight: pulled back, the whole system from slightly above, left of centre
  overview: { p: v(3.0, 5.0, 14.0), t: v(1.6, 0.1, 0), fov: 34, roll: 0 },
  // end of the formats flight: over the north pole, the radiator crown and rings overhead
  pole: { p: v(2.4, 4.4, 3.2), t: v(-0.6, 2.2, -0.3), fov: 52, roll: -10 },
};

type Shot = { pos: THREE.CatmullRomCurve3; look: THREE.CatmullRomCurve3; fov: [number, number]; roll: [number, number] };
// a path from one key to the next through a few waypoints [position, look-at]
const path = (a: Key, via: [THREE.Vector3, THREE.Vector3][], b: Key): Shot => ({
  pos: new THREE.CatmullRomCurve3([a.p, ...via.map((w) => w[0]), b.p], false, "centripetal"),
  look: new THREE.CatmullRomCurve3([a.t, ...via.map((w) => w[1]), b.t], false, "centripetal"),
  fov: [a.fov, b.fov],
  roll: [a.roll, b.roll],
});

const SHOTS: Record<string, Shot> = {
  approach: path(K.hero, [[v(2.2, 1.0, 13.4), v(-2.0, -0.9, 0)]], K.front),
  f_stories: path(K.front, [[v(-0.8, 1.4, 7.4), v(0.3, 0.2, 0.4)], [v(-1.9, 1.6, 5.2), v(0.9, 0.1, 0.9)]], K.shell),
  f_subjects: path(K.shell, [[v(-3.4, 2.4, 6.2), v(0.6, 0.0, 0.4)], [v(-1.0, 4.0, 11.5), v(1.2, 0.1, 0)]], K.overview),
  f_formats: path(K.overview, [[v(6.5, 5.0, 9.0), v(0.6, 1.0, 0)], [v(4.4, 5.0, 5.2), v(-0.2, 1.8, -0.2)]], K.pole),
  f_final: path(K.pole, [[v(5.5, 5.5, 6.5), v(-0.6, 1.0, 0)], [v(5.0, 3.0, 13.0), v(-2.4, -0.8, 0)]], K.hero),
};

const isTier = (t: unknown): t is Tier => t === "low" || t === "medium" || t === "high";
// the visitor's choice, and the automatic result of the last visit (per GPU) so it is not measured again
const keep = (key: string) => ({
  get: () => { try { return localStorage.getItem(key); } catch { return null; } },
  set: (v: string | null) => { try { v ? localStorage.setItem(key, v) : localStorage.removeItem(key); } catch { /* private mode */ } },
});
const store = keep("hd-quality");
const remembered = keep("hd-quality-auto");

export class WebGLStage {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, FRAME_W / FRAME_H, 0.03, 3000);
  private world: World | null = null;
  private layoutAnchors: Layout;
  tier: Tier;
  /** chosen by the visitor (debug panel, ?quality=); auto mode may step down on its own */
  manual: boolean;
  /** how the tier was picked, for the debug panel */
  reason = "";
  private resScale = 1;
  private switches = 0;
  private pendingTier: Tier | null = null;
  private gpu: string;
  private shot = "approach";
  private target = 0;
  private current = 0;
  private build = 0.42;
  private fade = 0;
  private focusX = 0.62;
  private ready = false;
  private dirty = true;
  private raf = 0;
  private last = 0;
  private lastChange = 0;
  private frameNo = 0;
  private ema = 16.7;
  private calmUntil = 0;
  private slowSince = 0;
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private listeners: (() => void)[] = [];
  private loadListeners: (() => void)[] = [];
  private look = new THREE.Vector3();
  /** frame times (ms) of rendered, non-idle frames: a ring buffer read by the debug panel */
  readonly frames = new Float32Array(300);
  framesSeen = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const asked = new URLSearchParams(location.search).get("quality") ?? store.get();
    this.manual = isTier(asked);
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    this.tier = isTier(asked) ? asked : coarse || saveData ? "low" : "medium";
    this.reason = this.manual ? "manual" : coarse || saveData ? "touch / data saver" : "start";
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.tier !== "low", stencil: false, powerPreference: "default" });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.setClearColor(0x04050b, 1);
    const gl = this.renderer.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    this.gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "?";
    const [gpu, last] = remembered.get()?.split("|") ?? [];
    if (!this.manual && gpu === this.gpu && isTier(last)) {
      this.tier = last;
      this.reason = "measured on an earlier visit";
    }
    this.layoutAnchors = this.anchors();
    this.setTier(this.tier);

    window.addEventListener("resize", () => this.resize());
    document.addEventListener("visibilitychange", () => {
      cancelAnimationFrame(this.raf);
      if (!document.hidden) {
        this.last = 0;
        this.raf = requestAnimationFrame(this.tick);
      }
    });
    this.start();
  }

  /** Earth and the first boom are placed where the opening shot's composition wants them. */
  private anchors(): Layout {
    const cam = this.camera.clone();
    cam.position.copy(K.hero.p);
    cam.fov = K.hero.fov;
    cam.lookAt(K.hero.t);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const at = (x: number, y: number, dist: number) =>
      v((x / FRAME_W) * 2 - 1, 1 - (y / FRAME_H) * 2, 0.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(dist).add(cam.position);
    const earth = at(580, 1350, 7.2);
    const toStar = earth.clone().negate().normalize();
    const toCam = cam.position.clone().sub(earth).normalize();
    return { earth, earthR: 2.6, boom: at(560, 230, 15.2), sun: toStar.addScaledVector(toCam, -1.1).normalize() };
  }

  private async start() {
    this.placeCamera();
    // shaders compile in parallel where the driver allows, instead of one long task on the first frame
    await this.renderer.compileAsync(this.scene, this.camera).catch(() => undefined);
    if (!this.manual && this.reason !== "measured on an earlier visit") this.pickTier();
    this.renderer.render(this.scene, this.camera);
    this.ready = true;
    this.loadListeners.forEach((fn) => fn());
    this.raf = requestAnimationFrame(this.tick);
  }

  /** A short benchmark of the real scene: GPU time per frame, without the vsync cap of requestAnimationFrame. */
  private pickTier() {
    const gl = this.renderer.getContext();
    const px = new Uint8Array(4);
    const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    this.renderer.render(this.scene, this.camera);
    sync();
    const t0 = performance.now();
    for (let i = 0; i < 5; i++) this.renderer.render(this.scene, this.camera);
    sync();
    const ms = (performance.now() - t0) / 5;
    const tier: Tier = ms < 4 ? "high" : ms < 11 ? "medium" : "low";
    // touch devices start low and stay there unless the visitor asks for more
    if ((this.tier !== "low" || tier === "low") && tier !== this.tier) this.setTier(tier);
    this.reason = `bench ${ms.toFixed(1)} ms/frame`;
    remembered.set(`${this.gpu}|${this.tier}`);
  }

  setTier(tier: Tier, manual = false) {
    if (manual) {
      this.manual = true;
      this.reason = "manual";
      store.set(tier);
    }
    this.world?.dispose();
    if (this.world) this.scene.remove(this.world.group);
    this.tier = tier;
    this.canvas.dataset.tier = tier;
    this.canvas.dataset.tierSwitches = String(++this.switches);
    this.world = buildWorld(tier, this.layoutAnchors);
    this.scene.add(this.world.group);
    this.world.update(this.build);
    U.uOct.value = TIERS[tier].oct;
    this.resScale = TIERS[tier].res[1];
    this.calmUntil = performance.now() + 3000;
    this.resize();
  }

  /** Back to automatic quality (forgets the visitor's choice). */
  autoTier() {
    store.set(null);
    this.manual = false;
    this.pickTier();
  }

  // ---------------------------------------------------------------- SequenceStage API
  show(name: string, progress: number, immediate = false) {
    if (!SHOTS[name]) return;
    const t = Math.max(0, Math.min(1, progress));
    if (name !== this.shot) {
      this.shot = name;
      this.current = t;
    }
    this.target = t;
    if (immediate) this.current = t;
    this.dirty = true;
  }

  setConstruction(value: number) {
    if (Math.abs(value - this.build) < 1e-4) return;
    this.build = value;
    this.world?.update(value);
    this.dirty = true;
  }

  setFade(value: number) {
    if (Math.abs(value - this.fade) < 0.001) return;
    this.fade = value;
    // the page behind the canvas is the same night colour the frames faded to
    this.canvas.style.opacity = String(1 - value);
    this.dirty = true;
  }

  setFocus(x: number) {
    if (x === this.focusX) return;
    this.focusX = x;
    this.resize();
  }

  preload(..._names: string[]) {}
  showEndsOnly(..._names: string[]) {}

  progress(_name: string) {
    return this.ready ? 1 : 0;
  }

  onFrameLoad(fn: () => void) {
    this.loadListeners.push(fn);
  }

  onLayout(fn: () => void) {
    this.listeners.push(fn);
  }

  toScreen(fx: number, fy: number) {
    const { scale, ox, oy } = this.layout();
    return { x: ox + fx * FRAME_W * scale, y: oy + fy * FRAME_H * scale, scale };
  }

  // ---------------------------------------------------------------- state for the debug panel
  get state() {
    return { shot: this.shot, t: this.current, build: this.build, res: this.renderer.getPixelRatio(), instances: this.world?.instances() ?? 0 };
  }

  // ---------------------------------------------------------------- rendering
  // the same cover crop as the rendered frames: a 16:9 picture scaled to cover, the focal column kept in view
  private layout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.max(vw / FRAME_W, vh / FRAME_H);
    const w = FRAME_W * scale;
    const h = FRAME_H * scale;
    const ox = Math.min(0, Math.max(vw - w, vw / 2 - this.focusX * w));
    const oy = (vh - h) / 2;
    return { scale, ox, oy, w, h };
  }

  private resize() {
    const { ox, oy, w, h } = this.layout();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(Math.min(dpr, this.resScale));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.camera.setViewOffset(w, h, -ox, -oy, window.innerWidth, window.innerHeight);
    this.camera.updateProjectionMatrix();
    U.uPR.value = this.renderer.getPixelRatio();
    this.dirty = true;
    this.listeners.forEach((fn) => fn());
  }

  private placeCamera() {
    const s = SHOTS[this.shot];
    const t = this.current;
    s.pos.getPointAt(t, this.camera.position);
    s.look.getPointAt(t, this.look);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.look);
    this.camera.rotateZ(THREE.MathUtils.degToRad(s.roll[0] + (s.roll[1] - s.roll[0]) * t));
    const fov = s.fov[0] + (s.fov[1] - s.fov[0]) * t;
    if (fov !== this.camera.fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    U.uPx.value = (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2)) / (this.layout().h * this.renderer.getPixelRatio());
    this.world?.stars.position.copy(this.camera.position);
  }

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = this.last ? Math.min(now - this.last, 250) : 16.7;
    this.last = now;
    const delta = this.target - this.current;
    if (Math.abs(delta) > 1e-4) {
      // the same easing toward the scroll position the frame scrubber had, independent of the refresh rate
      this.current += delta * (1 - Math.pow(0.82, dt / 16.7));
      this.dirty = true;
    } else this.current = this.target;
    if (this.dirty) {
      this.placeCamera();
      this.lastChange = now;
    }
    // fully faded (the human layer's black): nothing to draw
    if (!this.ready || this.fade >= 0.999) return void (this.dirty = false);
    if (this.reduced && !this.dirty) return;
    // nothing moving but the ambient life: half rate is enough and spares the fans
    const idle = now - this.lastChange > 2000;
    if (this.pendingTier && now - this.lastChange > 700) {
      this.setTier(this.pendingTier);
      this.pendingTier = null;
      this.reason = "stepped down: slow";
      remembered.set(`${this.gpu}|${this.tier}`);
    }
    if (idle && this.frameNo++ & 1) return;
    U.uTime.value = this.reduced ? 0 : now / 1000;
    this.renderer.render(this.scene, this.camera);
    this.dirty = false;
    // reduced motion draws on demand: the gaps between frames are not frame times
    if (!idle && !this.reduced) {
      this.frames[this.framesSeen++ % this.frames.length] = dt;
      this.adapt(dt, now);
    }
  };

  /** Dynamic resolution, then (automatic mode only) one tier down when even the lowest resolution is slow. */
  private adapt(dt: number, now: number) {
    this.ema = this.ema * 0.94 + dt * 0.06;
    if (now < this.calmUntil) return;
    const [lo, hi] = TIERS[this.tier].res;
    const cap = Math.min(window.devicePixelRatio || 1, 2, hi);
    if (this.ema > 21 && this.resScale > lo) {
      this.resScale = Math.max(lo, Math.min(this.resScale, cap) - 0.15);
      this.calmUntil = now + 1500;
      this.resize();
    } else if (this.ema < 17.6 && this.resScale < cap && now - this.slowSince > 10000) {
      this.resScale = Math.min(cap, this.resScale + 0.05);
      this.calmUntil = now + 2000;
      this.resize();
    }
    if (this.ema > 21) {
      this.slowSince = now;
      if (this.resScale <= lo && !this.manual && this.tier !== "low" && (this.slowStreak += dt) > 3000) {
        this.slowStreak = 0;
        // rebuilding is a long task: it waits until the camera rests (see tick)
        this.pendingTier = this.tier === "high" ? "medium" : "low";
      }
    } else this.slowStreak = 0;
  }
  private slowStreak = 0;
}
