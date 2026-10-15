// Real-time replacement for SequenceStage: the same public API (show / setFade / toScreen / progress …),
// so journey.ts drives it exactly as it drove the rendered flights. A "sequence" is now a camera path:
// show(name, t) puts the camera at t along that path. The state depends only on (path, t, construction),
// so scrolling back and forth always lands on the same picture.
import * as THREE from "three";
import { SATURN_RES, buildSaturn } from "./saturn";
import { STUDY } from "./study";
import { buildWorld, SHELLS, SWARMS, TIERS, U, type Layout, type Look, type Tier, type World } from "./world";

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

const DYSON_SHOTS: Record<string, Shot> = {
  approach: path(K.hero, [[v(2.2, 1.0, 13.4), v(-2.0, -0.9, 0)]], K.front),
  f_stories: path(K.front, [[v(-0.8, 1.4, 7.4), v(0.3, 0.2, 0.4)], [v(-1.9, 1.6, 5.2), v(0.9, 0.1, 0.9)]], K.shell),
  f_subjects: path(K.shell, [[v(-3.4, 2.4, 6.2), v(0.6, 0.0, 0.4)], [v(-1.0, 4.0, 11.5), v(1.2, 0.1, 0)]], K.overview),
  f_formats: path(K.overview, [[v(6.5, 5.0, 9.0), v(0.6, 1.0, 0)], [v(4.4, 5.0, 5.2), v(-0.2, 1.8, -0.2)]], K.pole),
  f_final: path(K.pole, [[v(5.5, 5.5, 6.5), v(-0.6, 1.0, 0)], [v(5.0, 3.0, 13.0), v(-2.4, -0.8, 0)]], K.hero),
};


// Saturn: one stop per screen (ring plane = XZ, rings out to 4.65, moons at 7.6 and 11.5, sun from -x +z)
const S: Record<string, Key> = {
  // the planet upper right, the rings a long diagonal across the frame
  hero: { p: v(3.5, 5.6, 25.0), t: v(-6.2, -0.9, 0), fov: 37, roll: -16 },
  // behind the drawing: the night side from just under the ring plane, a lit crescent and the backlit rings
  drawing: { p: v(-4.4, -1.3, -12.9), t: v(0.4, 0.3, 1.0), fov: 40, roll: 9 },
  // skimming the A ring toward the planet: the rings run out under the camera, the limb rises ahead
  shell: { p: v(-2.85, 0.7, 5.3), t: v(1.8, 0.5, 2.6), fov: 50, roll: -6 },
  // the whole system from high above, left of centre, both moon orbits in view
  overview: { p: v(5.0, 13.0, 15.0), t: v(1.8, 0, 0), fov: 36, roll: 0 },
  // over the north pole: the hexagon below, the rings curving away around it
  pole: { p: v(1.4, 5.6, 2.4), t: v(-0.5, 1.2, -0.7), fov: 52, roll: -10 },
  // the author's study: behind the desk, Saturn in the round window
  study: { p: STUDY.cam, t: STUDY.look, fov: 50, roll: 0 },
};
// every path crosses the ring plane outside the rings (r > 4.65), and keeps clear of the moon orbits (7.6, 11.5):
// nothing streams through the lens
const saturnShots = (hero: Key): Record<string, Shot> => ({
  approach: path(hero, [[v(12.5, 3.0, 12.0), v(-2.5, -0.4, 0.4)], [v(10.6, -1.5, -8.6), v(-0.4, 0.2, 0.8)]], S.drawing),
  f_stories: path(S.drawing, [[v(11.0, -1.4, -7.5), v(0.0, 0.3, 0.8)], [v(12.5, 1.6, 5.5), v(0.4, 0.4, 1.0)], [v(-1.2, 1.4, 9.6), v(0.8, 0.4, 1.0)]], S.shell),
  f_subjects: path(S.shell, [[v(-5.6, 1.8, 7.6), v(0.8, 0.3, 0)], [v(-1.0, 7.0, 13.5), v(1.4, 0, 0)]], S.overview),
  f_human: path(S.overview, [[STUDY.behind, v(0.2, 0.1, 0)], [STUDY.mouth, STUDY.look]], S.study),
  f_formats: path(S.study, [[STUDY.mouth, STUDY.look], [v(4.0, 9.0, 12.0), v(0.2, 0.8, 0)], [v(3.8, 6.6, 4.6), v(-0.2, 1.3, -0.4)]], S.pole),
  f_final: path(S.pole, [[v(5.5, 6.5, 8.5), v(-0.8, 0.6, 0)], [v(4.8, 5.4, 20.0), v(-4.4, -0.6, 0)]], hero),
});
const SATURN_SHOTS = saturnShots(S.hero);
// portrait phones: the headline and the buttons fill the upper screen and the rings ran straight through the text;
// the opening shot tilts up so the planet rises from the empty bottom of the screen instead
const SATURN_SHOTS_TALL = saturnShots({ ...S.hero, t: v(-6.2, 5.8, 0) });

// art variants for comparison: ?shell=refined|layered|hybrid, ?swarm=modules|shards|ribbon (first = default)
const pick = <T extends string>(list: readonly T[], v: string | null) => (list.includes(v as T) ? (v as T) : list[0]);
const query = new URLSearchParams(location.search);
const LOOK: Look = { shell: pick(SHELLS, query.get("shell")), swarm: pick(SWARMS, query.get("swarm")) };
// ?world=dyson brings back the sphere for comparison
const SATURN = query.get("world") !== "dyson";
const shots = () => (!SATURN ? DYSON_SHOTS : innerWidth < innerHeight ? SATURN_SHOTS_TALL : SATURN_SHOTS);
const resOf = (t: Tier) => (SATURN ? SATURN_RES[t] : TIERS[t].res);

const isTier = (t: unknown): t is Tier => t === "low" || t === "medium" || t === "high";
// the visitor's choice, and the automatic result of the last visit (per GPU) so it is not measured again
const keep = (key: string) => ({
  get: () => { try { return localStorage.getItem(key); } catch { return null; } },
  set: (v: string | null) => { try { v ? localStorage.setItem(key, v) : localStorage.removeItem(key); } catch { /* private mode */ } },
});
const store = keep("hd-quality");
// per world: the two worlds load the GPU differently, so a tier measured on one says little about the other
// "-2": earlier versions could store a tier measured during a slowdown; a new key drops those
const remembered = keep(SATURN ? "hd-quality-auto-saturn-2" : "hd-quality-auto-2");

export class WebGLStage {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, FRAME_W / FRAME_H, 0.03, 3000);
  private world: (World & { study?: THREE.Object3D }) | null = null;
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
  private anim: { name: string; from: number; to: number; start: number; ms: number; build?: [number, number]; done: () => void } | null = null;
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
    // shaders compile in parallel where the driver allows, instead of one long task on the first frame; objects
    // hidden at the start (the study) are compiled too, or their first appearance mid-flight would hitch
    if (this.world?.study) this.world.study.visible = true;
    await this.renderer.compileAsync(this.scene, this.camera).catch(() => undefined);
    this.placeCamera();
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
    // best of three runs: one hitch (a busy machine, a tab in the background) must not decide the tier for good
    const run = () => {
      const t0 = performance.now();
      for (let i = 0; i < 5; i++) this.renderer.render(this.scene, this.camera);
      sync();
      return (performance.now() - t0) / 5;
    };
    const ms = Math.min(run(), run(), run());
    // Saturn is measured on the opening shot, its cheapest: the pole costs ~4x more (docs/perf/worlds*.json),
    // so integrated graphics (~1.5 ms here on medium) must land on medium, not high
    const [hi, mid] = SATURN ? [0.9, 3] : [4, 11];
    const tier: Tier = ms < hi ? "high" : ms < mid ? "medium" : "low";
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
    this.world = SATURN ? buildSaturn(tier) : buildWorld(tier, this.layoutAnchors, LOOK);
    this.scene.add(this.world.group);
    this.world.update(this.build);
    U.uOct.value = TIERS[tier].oct;
    this.resScale = resOf(tier)[1];
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
  /** A timed flight along a path, eased in and out, advanced in the render loop itself: the camera moves on the
   *  frame it is drawn, never a frame late. Resolves when it lands (or when another flight or show() replaces it). */
  fly(name: string, from: number, to: number, ms: number, build?: [number, number]) {
    this.anim?.done();
    if (!shots()[name]) return Promise.resolve();
    return new Promise<void>((done) => {
      this.anim = { name, from, to, start: performance.now(), ms, build, done };
      this.shot = name;
      this.current = this.target = from;
      this.dirty = true;
    });
  }

  get flying() {
    return this.anim !== null;
  }

  show(name: string, progress: number, immediate = false) {
    if (this.anim) {
      this.anim.done();
      this.anim = null;
    }
    if (!shots()[name]) return;
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
    const s = shots()[this.shot];
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
    if (this.world?.study) this.world.study.visible = this.shot === "f_human" || this.shot === "f_formats";
  }

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = this.last ? Math.min(now - this.last, 250) : 16.7;
    this.last = now;
    const a = this.anim;
    if (a) {
      const k = Math.min(1, Math.max(0, (now - a.start) / a.ms));
      // sine in-out: no jolt at either end, and a lower peak speed than a quintic
      const e = 0.5 - 0.5 * Math.cos(Math.PI * k);
      this.current = this.target = a.from + (a.to - a.from) * e;
      if (a.build) this.setConstruction(a.build[0] + (a.build[1] - a.build[0]) * e);
      this.dirty = true;
      if (k >= 1) {
        this.anim = null;
        a.done();
      }
    }
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
      // for this visit only: a slowdown may be the machine, not the GPU, and must not stick on later visits
      this.reason = "stepped down: slow";
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
    // never resize mid-flight: reallocating the buffers is itself a hitch, and the change in sharpness shows
    if (now < this.calmUntil || this.anim) return;
    const [lo, hi] = resOf(this.tier);
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
