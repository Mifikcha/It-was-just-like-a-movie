import gsap from "gsap";
import { SequenceStage } from "./sequence";
import { WebGLStage } from "./webgl/stage";
import { boot } from "./boot";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const range = (p: number, from: number, to: number) => clamp((p - from) / (to - from));
const ease = (t: number) => t * t * (3 - 2 * t);
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string) => Array.from(document.querySelectorAll<T>(sel));

const canvas = $<HTMLCanvasElement>("[data-stage-canvas]")!;
const FLIGHT_FRAMES = 72;
// experiment: the megastructure is drawn live in WebGL; ?engine=legacy (or no WebGL2) keeps the rendered flights
const params = new URLSearchParams(location.search);
const live = () => {
  try {
    return params.get("engine") === "legacy" ? null : new WebGLStage(canvas);
  } catch {
    return null; // no WebGL2, or the GPU refused a context: the rendered flights
  }
};
const stage = live() ?? new SequenceStage(canvas, canvas.dataset.base ?? "", {
  // the opening flight: first screen straight into the cutaway of scene 02
  approach: 90,
  // scene 03 (work) arrives by the stories flight: the cutaway pulls back to the collector field
  f_stories: FLIGHT_FRAMES,
  f_subjects: FLIGHT_FRAMES,
  f_formats: FLIGHT_FRAMES,
  f_final: FLIGHT_FRAMES,
});
// centred crop everywhere so overlays drawn in frame space (constellation) line up; phones keep the sphere in view
stage.setFocus(window.innerWidth < 760 ? 0.66 : 0.5);
if (stage instanceof WebGLStage && params.has("debug")) import("./webgl/debug").then((m) => m.mountDebug(stage));

// ---------------------------------------------------------------- shared UI state
const rail = $$("[data-rail-dot]");
const navLinks = $$("[data-nav-scene]");

const setConstruction = (value: number) => {
  document.documentElement.style.setProperty("--construction", value.toFixed(3));
  if (stage instanceof WebGLStage) stage.setConstruction(value);
};

const setScene = (index: number) => {
  rail.forEach((dot, i) => dot.toggleAttribute("data-active", i === index));
  rail.forEach((dot, i) => dot.toggleAttribute("data-passed", i < index));
  const current = (el: Element | null, on: boolean) => (on ? el?.setAttribute("aria-current", "true") : el?.removeAttribute("aria-current"));
  rail.forEach((dot, i) => current(dot.querySelector("a"), i === index));
  navLinks.forEach((a) => current(a, Number(a.dataset.navScene) === index));
};

const fadeIn = (el: HTMLElement | null, t: number, lift = 24) => {
  if (!el) return;
  el.style.opacity = String(t);
  el.style.transform = `translate3d(0, ${(1 - t) * lift}px, 0)`;
  el.style.visibility = t <= 0 ? "hidden" : "visible";
  el.toggleAttribute("inert", t < 0.5);
};

// ---------------------------------------------------------------- anchors on rendered geometry
const placeAnchors = () => {
  $$("[data-anchor]").forEach((el) => {
    const [fx, fy] = el.dataset.anchor!.split(",").map(Number);
    const { x, y } = stage.toScreen(fx, fy);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  });
  fitQuads();
};

// Perspective fit of an HTML box onto four frame-space corners (tl, tr, br, bl).
const adj = (m: number[]) => [
  m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
  m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
  m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
];
const mulMM = (a: number[], b: number[]) => {
  const c = Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) c[3 * i + j] += a[3 * i + k] * b[3 * k + j];
  return c;
};
const mulMV = (m: number[], v: number[]) => [0, 1, 2].map((i) => m[3 * i] * v[0] + m[3 * i + 1] * v[1] + m[3 * i + 2] * v[2]);
const basis = (p: number[][]) => {
  const m = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1];
  const v = mulMV(adj(m), [p[3][0], p[3][1], 1]);
  return mulMM(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
};
const quadMatrix = (w: number, h: number, dst: number[][]) => {
  // corner order for the solver: tl, tr, bl, br
  const src = [[0, 0], [w, 0], [0, h], [w, h]];
  const t = mulMM(basis(dst), adj(basis(src)));
  const n = t.map((v) => v / t[8]);
  return `matrix3d(${n[0]},${n[3]},0,${n[6]},${n[1]},${n[4]},0,${n[7]},0,0,1,0,${n[2]},${n[5]},0,1)`;
};

function fitQuads() {
  $$("[data-quad]").forEach((el) => {
    if (reducedMotion || window.innerWidth < 760) {
      el.style.transform = "";
      el.removeAttribute("data-fitted");
      return;
    }
    const pts = el.dataset.quad!.split(" ").map((p) => p.split(",").map(Number));
    const [tl, tr, br, bl] = pts.map(([x, y]) => stage.toScreen(x, y));
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    el.style.transform = quadMatrix(w, h, [[tl.x, tl.y], [tr.x, tr.y], [bl.x, bl.y], [br.x, br.y]]);
    el.setAttribute("data-fitted", "");
  });
}

stage.onLayout(placeAnchors);
placeAnchors();
document.fonts?.ready.then(placeAnchors);

const setupHeader = () => {
  const header = $("[data-site-header]");
  if (!header) return;
  const update = () => header.toggleAttribute("data-condensed", window.scrollY > 48);
  update();
  window.addEventListener("scroll", update, { passive: true });
};


// ---------------------------------------------------------------- lightbox (reviews, diplomas)
const lightbox = $<HTMLDialogElement>("[data-lightbox]");
const lightboxImg = $<HTMLImageElement>("[data-lightbox-img]");
const openLightbox = (src: string, alt: string) => {
  if (!lightbox || !lightboxImg) return;
  lightboxImg.src = src;
  lightboxImg.alt = alt;
  lightbox.showModal();
};
$$("[data-zoom]").forEach((b) => b.addEventListener("click", () => openLightbox(b.dataset.zoom!, b.getAttribute("aria-label") ?? "")));
lightbox?.addEventListener("click", (e) => {
  if (e.target === lightbox) lightbox.close();
});

// ---------------------------------------------------------------- Telegram message templates
const templateStatus = $("[data-template-status]");
$$("[data-template]").forEach((button) =>
  button.addEventListener("click", async () => {
    const text = button.dataset.template!;
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = false;
    }
    $$("[data-template]").forEach((b) => b.toggleAttribute("data-copied", b === button));
    if (templateStatus) {
      templateStatus.textContent = copied
        ? "Текст скопирован. Замените поля в скобках и отправьте сообщение в открывшемся чате."
        : "Скопируйте текст вручную: " + text;
    }
    window.open(`https://t.me/Skifcha?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }),
);

// ---------------------------------------------------------------- subjects tabs
let subjectManual = false;
function setSubject(id: string) {
  $$("[data-subject-tab]").forEach((t) => {
    t.setAttribute("aria-selected", String(t.dataset.subjectTab === id));
    t.tabIndex = t.dataset.subjectTab === id ? 0 : -1;
  });
  $$("[data-subject-panel]").forEach((t) => t.toggleAttribute("data-active", t.dataset.subjectPanel === id));
}
setSubject("physics");
$$("[data-subject-tab]").forEach((t) =>
  t.addEventListener("click", () => {
    subjectManual = true;
    setSubject(t.dataset.subjectTab!);
  }),
);
$("[data-subject-tab]")?.parentElement?.addEventListener("keydown", (e) => {
  const tabs = $$("[data-subject-tab]");
  const i = tabs.indexOf(document.activeElement as HTMLElement);
  const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
  if (i < 0 || !step) return;
  e.preventDefault();
  const next = tabs[(i + step + tabs.length) % tabs.length];
  subjectManual = true;
  setSubject(next.dataset.subjectTab!);
  next.focus();
});

// ---------------------------------------------------------------- scene 03: the living constellation
// The student's trajectory is fixed. Every other star wanders slowly on its own smooth random path, and the
// links of the background graph fade in and out at their own pace, so the map keeps changing its shape.
const skyLife = (() => {
  const svg = $<SVGSVGElement>("[data-kmap]");
  if (!svg || reducedMotion) return null;
  const rnd = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const r = rnd(20261011);
  const wave = () => ({ a: 10 + r() * 22, w: (2 * Math.PI) / (14 + r() * 26), p: r() * 6.28 });
  const home = new Map<string, { x: number; y: number; wx: ReturnType<typeof wave>[]; wy: ReturnType<typeof wave>[] }>();
  const stars = Array.from(svg.querySelectorAll<SVGCircleElement>("[data-star]"));
  stars.forEach((c) => home.set(c.dataset.star!, { x: +c.getAttribute("cx")!, y: +c.getAttribute("cy")!, wx: [wave(), wave()], wy: [wave(), wave()] }));
  const labels = Array.from(svg.querySelectorAll<SVGTextElement>("[data-star-label]"));
  const lines = Array.from(svg.querySelectorAll<SVGLineElement>(".kmap__sky line")).map((l) => ({
    el: l, a: l.dataset.a!, b: l.dataset.b!,
    x1: +l.getAttribute("x1")!, y1: +l.getAttribute("y1")!, x2: +l.getAttribute("x2")!, y2: +l.getAttribute("y2")!,
    fade: { w: (2 * Math.PI) / (18 + r() * 30), p: r() * 6.28 },
  }));
  const off = (id: string, t: number) => {
    const h = home.get(id);
    if (!h) return [0, 0];
    return [h.wx.reduce((s, q) => s + q.a * Math.sin(q.w * t + q.p), 0), h.wy.reduce((s, q) => s + q.a * Math.sin(q.w * t + q.p), 0)];
  };
  let frame = 0;
  let last = 0;
  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    if (now - last < 33) return; // ~30 fps is plenty for motion this slow
    last = now;
    const t = now / 1000;
    stars.forEach((c) => {
      const h = home.get(c.dataset.star!)!;
      const [dx, dy] = off(c.dataset.star!, t);
      c.setAttribute("cx", (h.x + dx).toFixed(1));
      c.setAttribute("cy", (h.y + dy).toFixed(1));
    });
    labels.forEach((l) => {
      const [dx, dy] = off(l.dataset.starLabel!, t);
      l.setAttribute("transform", `translate(${dx.toFixed(1)} ${dy.toFixed(1)})`);
    });
    lines.forEach((l) => {
      const [ax, ay] = off(l.a, t);
      const [bx, by] = off(l.b, t);
      l.el.setAttribute("x1", (l.x1 + ax).toFixed(1));
      l.el.setAttribute("y1", (l.y1 + ay).toFixed(1));
      l.el.setAttribute("x2", (l.x2 + bx).toFixed(1));
      l.el.setAttribute("y2", (l.y2 + by).toFixed(1));
      // a link dissolves and reappears: the graph's structure changes, not only its position
      const v = 0.5 + 0.5 * Math.sin(l.fade.w * t + l.fade.p);
      l.el.style.strokeOpacity = (v * v * 1.1).toFixed(3);
    });
  };
  return (on: boolean) => {
    if (on && !frame) frame = requestAnimationFrame(tick);
    if (!on && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
})();

// ---------------------------------------------------------------- scene 03: the route surfaces on the map
// the map and the mastered topics surface -> the route draws on to the focus -> the reopened topic returns
// to the route -> the next step.
const RULES = [0.24, 0.36, 0.5, 0.64, 0.93];
function setMap(p: number, svg: SVGElement) {
  const set = (k: string, v: number) => svg.style.setProperty(k, v.toFixed(3));
  const [r1, r2, r3, r4] = RULES;
  set("--sky", range(p, r1, r1 + 0.08));
  set("--route", ease(range(p, r2, r2 + 0.1)));
  const lit = { focus: range(p, r2 + 0.06, r2 + 0.12), returned: range(p, r3, r3 + 0.05), next: range(p, r4, r4 + 0.05) };
  set("--focus", lit.focus);
  set("--returned", ease(lit.returned));
  // the reopened topic stands out once, briefly, then settles back into the map
  set("--returned-flash", range(p, r3 + 0.02, r3 + 0.06) * (1 - range(p, r4 - 0.02, r4 + 0.04)));
  set("--next", lit.next);
  // the calm idle motion (breathing sky, drift, pulse on the focus) runs only while the map is on screen
  svg.toggleAttribute("data-live", p > 0.22 && p < 0.97);
  skyLife?.(p > 0.22 && p < 0.97);
}

// ---------------------------------------------------------------- the journey, one screen at a time
// One continuous camera: a wheel step, a swipe or a key moves to the next screen, and the camera flies there on a
// timed path (the stage runs the flight in its own render loop). Content fades out before the flight and in as it
// lands. A screen whose content is taller than the viewport (phones) scrolls inside first.
const heroUi = $("[data-hero-ui]");
const decisionUi = $("[data-decision-ui]");

const SCENES = ["approach", "blueprint", "work", "subjects", "human", "formats", "build"];
// the flight into each screen, its length and construction_progress at its start / end
const INTO: Record<string, { seq: string; ms: number; from: number; to: number }> = {
  blueprint: { seq: "approach", ms: 3400, from: 0.42, to: 0.5 },
  work: { seq: "f_stories", ms: 3600, from: 0.5, to: 0.62 },
  subjects: { seq: "f_subjects", ms: 3000, from: 0.62, to: 0.8 },
  human: { seq: "f_human", ms: 3600, from: 0.8, to: 0.88 },
  formats: { seq: "f_formats", ms: 3600, from: 0.88, to: 0.95 },
  build: { seq: "f_final", ms: 3400, from: 0.95, to: 1 },
};
// the camera stop that is each screen's backdrop
const rest = (name: string): [string, number, number] => (name === "approach" ? ["approach", 0, 0.42] : [INTO[name].seq, 1, INTO[name].to]);
const preloadAround = (i: number) =>
  stage.preload(...([SCENES[i + 1], SCENES[i]].filter((s) => s && s !== "approach").map((s) => INTO[s!].seq).concat("approach") as never[]));

// the stage flies in its own loop; the rendered-frame fallback (no WebGL2) is scrubbed by a tween instead
const fly = (seq: string, a: number, b: number, ms: number, build: [number, number]) => {
  if (stage instanceof WebGLStage) {
    document.documentElement.style.setProperty("--construction", build[1].toFixed(3));
    return stage.fly(seq, a, b, ms, build);
  }
  const s = { t: a };
  return new Promise<void>((done) =>
    gsap.to(s, {
      t: b,
      duration: ms / 1000,
      ease: "sine.inOut",
      onComplete: done,
      onUpdate: () => {
        stage.show(seq as never, s.t);
        setConstruction(build[0] + (build[1] - build[0]) * ((s.t - a) / (b - a || 1)));
      },
    }),
  );
};

const setupJourney = () => {
  document.documentElement.classList.add("is-paged");
  const compact = window.matchMedia("(max-width: 900px)").matches;
  const tracks = SCENES.map((name) => $(`[data-track='${name}']`)!);
  const header = $("[data-site-header]");

  // ---------------------------------------------------------------- what each screen shows, 0 hidden .. 1 shown
  const bp = $("[data-blueprint]");
  const evidence = $("[data-evidence]");
  const still = (name: string) => {
    const el = tracks[SCENES.indexOf(name)].querySelector<HTMLElement>("[data-still-stage]")!;
    const content = el.querySelector<HTMLElement>("[data-still-content]");
    return (t: number) => {
      el.style.setProperty("--content", t.toFixed(3));
      el.style.setProperty("--shade", t.toFixed(3));
      fadeIn(content, t, 0);
    };
  };
  const show: Record<string, (t: number) => void> = {
    approach: (t) => fadeIn(heroUi, t, 0),
    blueprint: (t) => {
      fadeIn(bp, t, 0);
      fadeIn(evidence, t, 0);
    },
    work: still("work"),
    subjects: still("subjects"),
    human: still("human"),
    formats: still("formats"),
    build: (t) => fadeIn(decisionUi, t, 0),
  };

  // ---------------------------------------------------------------- scene 02: the drawing works while the visitor reads
  const bpPasses = $$("[data-bp-pass]");
  const evSteps = $$("[data-ev-step]");
  const evTicks = $$("[data-ev-tick]");
  const evBy = $$<HTMLButtonElement>("[data-ev-by]");
  let story = 0;
  const setStory = (k: number) => {
    story = Math.max(0, Math.min(evSteps.length - 1, k));
    evBy.forEach((b) => (b.disabled = Number(b.dataset.evBy) < 0 ? story === 0 : story === evSteps.length - 1));
    evSteps.forEach((s, i) => {
      s.dataset.state = i < story ? "past" : i === story ? "current" : "next";
      s.toggleAttribute("inert", i !== story);
    });
    evTicks.forEach((tk, i) => {
      tk.toggleAttribute("data-done", i < story);
      tk.toggleAttribute("data-current", i === story);
    });
  };
  setStory(0);
  $$<HTMLButtonElement>("[data-ev-go]").forEach((b) => b.addEventListener("click", () => setStory(Number(b.dataset.evGo))));
  evBy.forEach((b) => b.addEventListener("click", () => setStory(story + Number(b.dataset.evBy))));
  // desktop: the drawing recedes behind the stories; phones keep the sheet's heading above it, in flow
  ["--bp-blue", "--bp-grid", ...(compact ? [] : ["--bp-recede"])].forEach((k) => bp?.style.setProperty(k, "1"));
  const BG_ORDER = [...new Set(bpPasses.map((el) => el.dataset.bpPass!))];
  let drawingLife: gsap.core.Timeline | null = null;
  const drawing = (on: boolean) => {
    drawingLife?.kill();
    drawingLife = null;
    if (!on || !bp) return;
    // a subsystem lights up every few seconds; once per cycle the harvester opens into its exploded view and closes
    const life = { k: 0, x: 0 };
    drawingLife = gsap
      .timeline({ repeat: -1 })
      .to(life, {
        k: BG_ORDER.length,
        duration: BG_ORDER.length * 2.8,
        ease: "none",
        onUpdate: () => {
          const active = BG_ORDER[Math.floor(life.k) % BG_ORDER.length];
          bpPasses.forEach((el) => el.toggleAttribute("data-active", el.dataset.bpPass === active));
        },
      }, 0)
      .to(life, { x: 1, duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: 1, repeatDelay: 6, onUpdate: () => bp.style.setProperty("--bp-exposed", life.x.toFixed(3)) }, 4);
  };

  // ---------------------------------------------------------------- scene 03: the route surfaces on the map, in time
  const kmap = tracks[2].querySelector<SVGElement>("[data-kmap]");
  let mapTween: gsap.core.Tween | null = null;
  const map = (on: boolean) => {
    mapTween?.kill();
    if (!kmap) return;
    const m = { p: on ? 0.2 : 0 };
    setMap(m.p, kmap);
    kmap.style.opacity = on ? "1" : "0";
    if (on) mapTween = gsap.to(m, { p: 0.96, duration: 9, ease: "none", onUpdate: () => setMap(m.p, kmap) });
  };

  // scene 05: the line before the study, over the flight in
  const intro = $("[data-human-intro]");

  // ---------------------------------------------------------------- moving between screens
  let cur = 0;
  let busy = false;
  const fadeTo = (name: string, to: number, duration: number, delay = 0) => {
    const s = { t: to > 0 ? 0 : 1 };
    return gsap.to(s, { t: to, duration, delay, ease: "power2.out", onUpdate: () => show[name](s.t) });
  };
  const backdrop = (i: number) => (compact && i > 0 ? (SCENES[i] === "build" ? 0.35 : 0.6) : 0);
  // the stories screen is an opaque sheet: once it is up, the planet behind it is not drawn at all
  const restFade = (i: number) => (SCENES[i] === "blueprint" ? 1 : backdrop(i));
  const mark = (i: number) => {
    tracks.forEach((tr, k) => {
      tr.toggleAttribute("data-on", k === i);
      tr.toggleAttribute("inert", k !== i);
    });
    setScene(Number(tracks[i].dataset.sceneIndex));
    header?.toggleAttribute("data-condensed", i > 0);
    history.replaceState(null, "", i ? `#${tracks[i].id}` : location.pathname + location.search);
    stage.setFade(backdrop(i));
  };
  const settle = (i: number) => {
    stage.setFade(restFade(i));
    if (SCENES[i] === "blueprint") drawing(true);
    if (SCENES[i] === "work") map(true);
  };
  const leave = (i: number) => {
    if (SCENES[i] === "blueprint") drawing(false);
    if (SCENES[i] === "work") map(false);
  };
  // a screen with nothing flying: the camera at its stop, its content shown
  const land = (i: number) => {
    const [seq, t, build] = rest(SCENES[i]);
    stage.show(seq as never, t, true);
    setConstruction(build);
    SCENES.forEach((s, k) => show[s](k === i ? 1 : 0));
    if (intro) intro.style.opacity = "0";
    mark(i);
    settle(i);
  };

  const go = async (next: number) => {
    if (busy || next === cur || next < 0 || next >= SCENES.length) return;
    busy = true;
    const from = cur;
    cur = next;
    preloadAround(next);
    leave(from);
    tracks[next].scrollTop = 0;
    if (Math.abs(next - from) > 1) {
      // a jump across several screens: a short dip to the night, no flight through every stop on the way
      const f = { v: restFade(from) };
      fadeTo(SCENES[from], 0, 0.3);
      await gsap.to(f, { v: 1, duration: 0.35, ease: "power1.in", onUpdate: () => stage.setFade(f.v) });
      land(next);
      show[SCENES[next]](0);
      stage.setFade(1);
      await gsap.to(f, { v: restFade(next), duration: 0.6, ease: "power2.out", onUpdate: () => stage.setFade(f.v) });
      fadeTo(SCENES[next], 1, 0.6);
      busy = false;
      return;
    }
    const forward = next > from;
    const flight = INTO[SCENES[forward ? next : from]];
    const ms = flight.ms;
    // out first, quickly; the flight starts as the content goes
    fadeTo(SCENES[from], 0, 0.35);
    mark(next);
    // painted (all but invisible) from the start of the flight: its first raster lands while the camera is slow,
    // not as the content fades in at the end
    show[SCENES[next]](0.001);
    const landing = fly(flight.seq, forward ? 0 : 1, forward ? 1 : 0, ms, forward ? [flight.from, flight.to] : [flight.to, flight.from]);
    // the line before the author, over the flight into the study
    if (SCENES[next] === "human" && intro) {
      const o = { v: 0 };
      const set = () => (intro.style.opacity = o.v.toFixed(3));
      gsap.timeline()
        .to(o, { v: 1, duration: 0.8, delay: (ms / 1000) * 0.15, ease: "power2.out", onUpdate: set })
        .to(o, { v: 0, duration: 0.7, delay: (ms / 1000) * 0.25, ease: "power2.in", onUpdate: set });
    }
    fadeTo(SCENES[next], 1, 0.7, (ms / 1000) * 0.8);
    await landing;
    settle(next);
    busy = false;
  };

  // ---------------------------------------------------------------- input: one gesture, one screen
  // a panel taller than the screen (phones) scrolls first; only a new gesture at its edge turns the page
  const canScroll = (target: EventTarget | null, dir: number) => {
    for (let el = target as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
      if (el.scrollHeight > el.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(el).overflowY)) {
        if (dir > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 2 : el.scrollTop > 2) return true;
      }
      if (el === tracks[cur]) break;
    }
    return false;
  };
  const modal = () => lightbox?.open;
  let lastWheel = -1e9;
  window.addEventListener("wheel", (e) => {
    if (modal() || e.ctrlKey) return;
    const dir = Math.sign(e.deltaY);
    // trackpads keep sending inertia for a second: only a pause makes the next event a new gesture
    const fresh = e.timeStamp - lastWheel > 240;
    lastWheel = e.timeStamp;
    if (!dir || (!busy && canScroll(e.target, dir))) return;
    e.preventDefault();
    if (fresh && Math.abs(e.deltaY) > 2) go(cur + dir);
  }, { passive: false });

  let touch: { y: number; x: number; up: boolean; down: boolean } | null = null;
  window.addEventListener("touchstart", (e) => {
    if (modal() || e.touches.length > 1) return void (touch = null);
    const p = e.touches[0];
    touch = { y: p.clientY, x: p.clientX, up: !canScroll(e.target, -1), down: !canScroll(e.target, 1) };
  }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    if (!touch) return;
    const dy = touch.y - e.touches[0].clientY;
    // at the panel's edge the browser would bounce or reload the page: the swipe is ours
    if ((busy || (dy > 0 && touch.down) || (dy < 0 && touch.up)) && e.cancelable) e.preventDefault();
  }, { passive: false });
  window.addEventListener("touchend", (e) => {
    if (!touch) return;
    const p = e.changedTouches[0];
    const dy = touch.y - p.clientY;
    const dx = touch.x - p.clientX;
    if (Math.abs(dy) > 44 && Math.abs(dy) > Math.abs(dx) * 1.3) {
      if (dy > 0 && touch.down) go(cur + 1);
      if (dy < 0 && touch.up) go(cur - 1);
    }
    touch = null;
  });

  window.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement;
    if (modal() || e.altKey || e.ctrlKey || e.metaKey || t.closest("input, textarea, select, [contenteditable]")) return;
    if (SCENES[cur] === "blueprint" && (e.key === "ArrowRight" || e.key === "ArrowLeft") && !t.closest("[role='tablist']")) {
      e.preventDefault();
      return setStory(story + (e.key === "ArrowRight" ? 1 : -1));
    }
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      return void go(e.key === "Home" ? 0 : SCENES.length - 1);
    }
    const dir = ({ PageDown: 1, ArrowDown: 1, " ": e.shiftKey ? -1 : 1, PageUp: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
    if (!dir || (e.key === " " && t.closest("button, a"))) return;
    if (!busy && canScroll(t === document.body ? tracks[cur] : t, dir)) return;
    e.preventDefault();
    go(cur + dir);
  });

  // in-page links (header, rail, hero buttons) go to their screen
  $$<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const track = document.getElementById(a.hash.slice(1))?.closest<HTMLElement>("[data-track]");
      if (!track) return;
      e.preventDefault();
      go(tracks.indexOf(track));
    }),
  );

  // start where the address points (a reload, a shared link)
  cur = Math.max(0, tracks.findIndex((tr) => location.hash && tr.id === location.hash.slice(1)));
  preloadAround(cur);
  land(cur);

  // A screen's first paint is expensive (the harvester drawing alone takes ~200 ms) and would land in the middle of
  // a flight. While the visitor is still on the first screen, each other screen is painted once, all but invisibly.
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const idle = () => new Promise((r) => ("requestIdleCallback" in window ? requestIdleCallback(r, { timeout: 1500 }) : setTimeout(r, 200)));
  (async () => {
    await new Promise<void>((r) => (stage.progress("approach") >= 1 ? r() : stage.onFrameLoad(() => r())));
    for (let k = 0; k < tracks.length; k++) {
      await idle();
      if (k === cur || busy) continue;
      tracks[k].toggleAttribute("data-warm", true);
      show[SCENES[k]](0.001);
      await frame();
      if (k !== cur) show[SCENES[k]](0);
      tracks[k].removeAttribute("data-warm");
    }
  })();
};

// Without motion: no scrubbing, each scene shows its end frame, content in normal flow.
const setupStill = () => {
  document.documentElement.classList.add("is-still");
  stage.preload("approach");
  stage.show("approach", 0, true);
  setConstruction(0.42);
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const name = (e.target as HTMLElement).dataset.track!;
        if (name === "approach") {
          stage.show("approach", 0, true);
          stage.setFade(0);
          setConstruction(0.42);
        } else {
          const [seq, t, build] = rest(name);
          stage.preload(seq as never);
          stage.show(seq as never, t, true);
          setConstruction(build);
          stage.setFade(name === "build" ? 0.2 : 0.6);
        }
        setScene(Number((e.target as HTMLElement).dataset.sceneIndex ?? 0));
      }),
    { threshold: 0.3 },
  );
  $$("[data-track]").forEach((t) => io.observe(t));
  const kmap = $<SVGElement>("[data-kmap]");
  if (kmap) setMap(1, kmap);
};

setupHeader();
if (reducedMotion) setupStill();
else setupJourney();
boot(stage, "approach");
