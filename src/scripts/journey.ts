import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SequenceStage } from "./sequence";
import { controlCycles, controlEvents } from "../data/content";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const range = (p: number, from: number, to: number) => clamp((p - from) / (to - from));
const ease = (t: number) => t * t * (3 - 2 * t);
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string) => Array.from(document.querySelectorAll<T>(sel));

const canvas = $<HTMLCanvasElement>("[data-stage-canvas]")!;
const FLIGHT_FRAMES = 72;
const stage = new SequenceStage(canvas, canvas.dataset.base ?? "", {
  approach: 90,
  f_blueprint: FLIGHT_FRAMES,
  f_stories: FLIGHT_FRAMES,
  f_work: FLIGHT_FRAMES,
  f_knowledge: FLIGHT_FRAMES,
  f_subjects: FLIGHT_FRAMES,
  f_formats: FLIGHT_FRAMES,
  f_final: FLIGHT_FRAMES,
});
// centred crop everywhere so overlays drawn in frame space (constellation) line up; phones keep the sphere in view
stage.setFocus(window.innerWidth < 760 ? 0.66 : 0.5);

// ---------------------------------------------------------------- shared UI state
const rail = $$("[data-rail-dot]");

const setConstruction = (value: number) => {
  document.documentElement.style.setProperty("--construction", value.toFixed(3));
};

const setScene = (index: number) => {
  rail.forEach((dot, i) => dot.toggleAttribute("data-active", i === index));
  rail.forEach((dot, i) => dot.toggleAttribute("data-passed", i < index));
};

const fadeIn = (el: HTMLElement | null, t: number, lift = 24) => {
  if (!el) return;
  el.style.opacity = String(t);
  el.style.transform = `translate3d(0, ${(1 - t) * lift}px, 0)`;
  el.style.visibility = t < 0.01 ? "hidden" : "visible";
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

// ---------------------------------------------------------------- contact form (no backend yet)
const setupContactForm = () => {
  const form = $<HTMLFormElement>("[data-contact-form]");
  const status = $("[data-contact-status]");
  if (!form || !status) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    status.innerHTML =
      'Форма ещё не подключена к отправке. Напишите напрямую в <a href="https://t.me/Skifcha" target="_blank" rel="noreferrer">Телеграм</a> — данные никуда не отправлены.';
  });
};

const setupHeader = () => {
  const header = $("[data-site-header]");
  if (!header) return;
  const update = () => header.toggleAttribute("data-condensed", window.scrollY > 48);
  update();
  window.addEventListener("scroll", update, { passive: true });
};


// ---------------------------------------------------------------- review screenshots viewer
const reviewShots = $$("[data-review]");
const reviewCount = $("[data-review-count]");
let reviewIndex = -1;
let reviewManual = false;
let reviewTimer = 0;
function showReview(i: number) {
  if (!reviewShots.length) return;
  const next = (i + reviewShots.length) % reviewShots.length;
  if (next === reviewIndex) return;
  reviewIndex = next;
  reviewShots.forEach((el, k) => el.toggleAttribute("data-active", k === reviewIndex));
  if (reviewCount) reviewCount.textContent = `${String(reviewIndex + 1).padStart(2, "0")} / ${String(reviewShots.length).padStart(2, "0")}`;
}
showReview(0);
const manualReview = (d: number) => {
  reviewManual = true;
  showReview(reviewIndex + d);
  window.clearTimeout(reviewTimer);
  reviewTimer = window.setTimeout(() => (reviewManual = false), 6000);
};
$("[data-review-prev]")?.addEventListener("click", () => manualReview(-1));
$("[data-review-next]")?.addEventListener("click", () => manualReview(1));

// ---------------------------------------------------------------- lightbox (reviews, diplomas)
const lightbox = $<HTMLDialogElement>("[data-lightbox]");
const lightboxImg = $<HTMLImageElement>("[data-lightbox-img]");
const openLightbox = (src: string, alt: string) => {
  if (!lightbox || !lightboxImg) return;
  lightboxImg.src = src;
  lightboxImg.alt = alt;
  lightbox.showModal();
};
reviewShots.forEach((b) =>
  b.addEventListener("click", () => {
    const img = b.querySelector("img")!;
    openLightbox(img.src, img.alt);
  }),
);
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

// ---------------------------------------------------------------- scene 06: one map, one student's path
// The map is already there; scrolling walks the path through it, then names only three points.
function setMap(p: number, svg: SVGElement) {
  const set = (k: string, v: number) => svg.style.setProperty(k, v.toFixed(3));
  set("--draw", 1 - range(p, 0.34, 0.48));
  set("--sky", range(p, 0.36, 0.5));
  set("--route", ease(range(p, 0.46, 0.66)));
  const lit = { weak: range(p, 0.6, 0.66), focus: range(p, 0.66, 0.72), next: range(p, 0.72, 0.78) };
  set("--weak", lit.weak);
  set("--focus", lit.focus);
  set("--next", lit.next);
  $$("[data-lit-line]").forEach((l) => l.style.setProperty("--o", lit[l.dataset.litLine as keyof typeof lit].toFixed(3)));
}

// ---------------------------------------------------------------- scene 05: the control loop
// The packet runs seven laps; one lap is one cycle and stage i sits at i / 5 of a lap.
// Scroll sets a target and the packet eases toward it every frame, so the loop glides instead of stepping.
const STAGES = 5;
const LOOP_DRAW = [0.33, 0.42];
const LAPS_FROM = 0.42;
const LAPS_TO = 0.95;
const TAIL = 0.14;
const loopMoments = controlEvents.map((e) => {
  const signal = e.cycle - 1 + e.from / STAGES;
  let answer = e.cycle - 1 + e.to / STAGES;
  if (answer <= signal) answer += 1;
  return { signal, answer };
});
const loopUi = (() => {
  const svg = $<SVGSVGElement>("[data-loop]");
  if (!svg) return null;
  const orbit = svg.querySelector<SVGPathElement>("[data-loop-orbit]")!;
  return {
    svg,
    orbit,
    lap: orbit.getTotalLength() / 2,
    trail: svg.querySelector<SVGPathElement>("[data-loop-trail]")!,
    packet: svg.querySelector<SVGGElement>("[data-loop-packet]")!,
    cycle: svg.querySelector<SVGTextElement>("[data-loop-cycle]")!,
    status: svg.querySelector<SVGTextElement>("[data-loop-status]")!,
    stages: Array.from(svg.querySelectorAll<SVGGElement>("[data-loop-stage]")),
    log: $("[data-loop-log]"),
    list: $("[data-loop-list]"),
    events: $$("[data-loop-event]"),
  };
})();
let loopTarget = 0;
let loopPos = 0;
let loopFrame = 0;
let logShift = -1;

function renderLoop(pos: number) {
  if (!loopUi) return;
  const { orbit, lap, trail, packet, cycle, status, stages, log, list, events } = loopUi;
  const f = pos % 1;
  const pt = orbit.getPointAtLength(f * lap);
  packet.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
  const len = Math.min(TAIL, pos);
  const start = f >= len ? f - len : f - len + 1;
  trail.style.strokeDasharray = `${len.toFixed(4)} 4`;
  trail.style.strokeDashoffset = (-start).toFixed(4);

  // the event whose signal was measured most recently (if its answer is still fresh)
  let k = -1;
  loopMoments.forEach((m, i) => pos >= m.signal - 0.02 && (k = i));
  const m = k >= 0 ? loopMoments[k] : null;
  const answered = !!m && pos >= m.answer;
  const live = !!m && pos < m.answer + 0.3;
  stages.forEach((s, i) => {
    const d = Math.abs((((pos - i / STAGES + 0.5) % 1) + 1) % 1 - 0.5);
    s.style.setProperty("--hit", (1 - clamp(d / 0.06)).toFixed(3));
    s.toggleAttribute("data-signal", live && !answered && i === controlEvents[k].from);
    s.toggleAttribute("data-response", live && answered && i === controlEvents[k].to);
  });
  const n = String(Math.min(7, Math.floor(pos + 1e-4) + 1)).padStart(2, "0");
  if (cycle.textContent !== n) cycle.textContent = n;
  status.textContent = !live ? "измерение" : answered ? "ответ применён" : "сигнал получен";

  events.forEach((e, i) => {
    const mm = loopMoments[i];
    e.dataset.state = pos >= mm.answer ? "done" : pos >= mm.signal - 0.02 ? "active" : "pending";
    e.toggleAttribute("data-current", i === k);
  });
  // the journal rolls: the newest entry stays in view, older ones leave at the top
  if (log?.hasAttribute("data-live") && list) {
    const shift = Math.max(0, k - 3);
    if (shift !== logShift) {
      logShift = shift;
      list.style.transform = `translate3d(0, ${-(events[shift]?.offsetTop ?? 0)}px, 0)`;
    }
  }
}

const tickLoop = () => {
  loopPos += (loopTarget - loopPos) * 0.09;
  if (Math.abs(loopTarget - loopPos) < 0.0005) loopPos = loopTarget;
  renderLoop(loopPos);
  loopFrame = loopPos === loopTarget ? 0 : requestAnimationFrame(tickLoop);
};

function setLoop(p: number, instant = false) {
  if (!loopUi) return;
  const draw = range(p, LOOP_DRAW[0], LOOP_DRAW[1]);
  loopUi.svg.style.setProperty("--draw", (1 - draw).toFixed(3));
  loopUi.stages.forEach((s, i) => s.style.setProperty("--o", range(draw, i / STAGES, i / STAGES + 0.35).toFixed(3)));
  loopUi.packet.style.opacity = String(draw);
  loopUi.trail.style.opacity = String(range(p, LAPS_FROM - 0.01, LAPS_FROM + 0.01));
  // a gentle start and stop; constant speed in between
  const t = range(p, LAPS_FROM, LAPS_TO);
  const a = 0.08;
  const eased = t < a ? (t * t) / (2 * a * (1 - a)) : t > 1 - a ? 1 - ((1 - t) * (1 - t)) / (2 * a * (1 - a)) : (t - a / 2) / (1 - a);
  loopTarget = Math.min(controlCycles - 0.001, eased * controlCycles);
  if (instant) {
    loopPos = loopTarget;
    renderLoop(loopPos);
  } else if (!loopFrame) loopFrame = requestAnimationFrame(tickLoop);
}

// ---------------------------------------------------------------- scroll journey
// One continuous camera: every scene starts with a rendered flight from the previous scene's camera
// and holds the flight's last frame as its backdrop. The only cut to black is the human-layer intro.
const heroUi = $("[data-hero-ui]");
const displayModule = $("[data-display-module]");
const decisionUi = $("[data-decision-ui]");

// scene -> flight that brings the camera there, and construction_progress at its start / end
const FLIGHT: Record<string, { seq: string; from: number; to: number }> = {
  blueprint: { seq: "f_blueprint", from: 0.45, to: 0.5 },
  stories: { seq: "f_stories", from: 0.5, to: 0.55 },
  work: { seq: "f_work", from: 0.55, to: 0.62 },
  knowledge: { seq: "f_knowledge", from: 0.62, to: 0.72 },
  subjects: { seq: "f_subjects", from: 0.72, to: 0.8 },
  formats: { seq: "f_formats", from: 0.88, to: 0.95 },
  build: { seq: "f_final", from: 0.95, to: 1 },
};
const ORDER = ["approach", "blueprint", "stories", "work", "knowledge", "subjects", "human", "formats", "build"];
// the human layer has no flight of its own: it holds the subjects' last frame behind the black
const seqOf = (track: string) => (track === "approach" ? "approach" : track === "human" ? "f_subjects" : FLIGHT[track].seq);
// load the flight of this scene and the next one while the visitor is here
const preloadAround = (track: string) => {
  const i = ORDER.indexOf(track);
  [ORDER[i], ORDER[i + 1]].filter(Boolean).forEach((t) => stage.preload(seqOf(t!)));
};
const flight = (track: string, t: number) => {
  const f = FLIGHT[track];
  stage.show(f.seq, ease(clamp(t)));
  setConstruction(f.from + (f.to - f.from) * clamp(t));
};

// settle points: a flight released mid-way finishes toward the scroll direction
const settle = (from: number, to: number, lo: number, hi: number) => (value: number, self?: ScrollTrigger) => {
  if (value < from || value > to) return value;
  return (self?.direction ?? 1) > 0 ? hi : lo;
};

const setupJourney = () => {
  gsap.registerPlugin(ScrollTrigger);
  stage.preload("approach");
  stage.show("approach", 0, true);
  setConstruction(0.42);
  setScene(0);
  const compact = window.matchMedia("(max-width: 900px)").matches;
  // desktop: the reaction journal becomes a rolling window over the loop; phones show every entry
  if (!compact) $("[data-loop-log]")?.setAttribute("data-live", "");

  ScrollTrigger.create({
    trigger: "[data-track='approach']",
    start: "top top",
    end: "bottom bottom",
    snap: { snapTo: settle(0.12, 0.78, 0, 0.9), duration: { min: 0.4, max: 1.2 }, delay: 0.12, ease: "power1.inOut" },
    onToggle: ({ isActive }) => isActive && preloadAround("approach"),
    onUpdate: ({ progress: p, isActive }) => {
      if (!isActive && p > 0 && p < 1) return;
      const travel = ease(range(p, 0.08, 0.8));
      stage.show("approach", travel);
      stage.setFade(0);
      setConstruction(0.42 + 0.03 * travel);
      fadeIn(heroUi, 1 - range(p, 0.02, 0.1), -40);
      fadeIn(displayModule, range(p, 0.8, 0.88) * (1 - range(p, 0.95, 0.99)));
      setScene(p < 0.45 ? 0 : 1);
    },
  });

  // in-page links land on the settled screen of a scene, not at the start of its flight
  const READY: Record<string, number> = { approach: 0.9, blueprint: 0.24, human: 0.56, formats: 0.66 };
  if (!compact) $$<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const track = document.getElementById(a.hash.slice(1))?.closest<HTMLElement>("[data-track]");
      const at = track ? READY[track.dataset.track!] : undefined;
      if (!track || at === undefined) return;
      e.preventDefault();
      const top = track.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + at * (track.offsetHeight - window.innerHeight), behavior: "instant" });
      history.replaceState(null, "", a.hash);
    }),
  );

  // phones: scenes 03-09 are laid out in normal flow (see scenes.css); the canvas shows each scene's end frame
  if (compact) {
    $$("[data-track='blueprint'], [data-still], [data-track='build']").forEach((track) =>
      ScrollTrigger.create({
        trigger: track,
        start: "top center",
        end: "bottom center",
        onToggle: ({ isActive }) => {
          if (!isActive) return;
          const name = track.dataset.track!;
          preloadAround(name);
          if (name === "human") stage.show("f_subjects", 1);
          else flight(name, 1);
          stage.setFade(name === "build" ? 0.35 : 0.6);
          setScene(Number(track.dataset.sceneIndex));
        },
      }),
    );
  }

  // scene 03: flight into the cutaway -> blueprint overlay -> subsystem highlights + archive + reviews -> exposed view
  const bp = $("[data-blueprint]");
  const bpPasses = $$("[data-bp-pass]");
  const bpCallouts = $$("[data-bp-callout]");
  const bpLabels = $$("[data-bp-label]");
  const bpOrder = ["pass_shell", "pass_frame", "pass_core", "pass_mirrors", "pass_thermal", "pass_rings", "pass_modules"];
  const bpDossier = $("[data-bp-dossier]");
  const archive = $("[data-archive-list]");
  const cases = $$("[data-case]");
  if (!compact) ScrollTrigger.create({
    trigger: "[data-track='blueprint']",
    start: "top top",
    end: "bottom bottom",
    onToggle: ({ isActive }) => isActive && preloadAround("blueprint"),
    onUpdate: ({ progress: p }) => {
      if (!bp) return;
      flight("blueprint", range(p, 0, 0.1));
      stage.setFade(0);
      fadeIn(bp, range(p, 0.1, 0.16) * (1 - range(p, 0.95, 1)), 0);
      const set = (k: string, v: number) => bp.style.setProperty(k, v.toFixed(3));
      set("--bp-blue", range(p, 0.12, 0.18));
      set("--bp-grid", range(p, 0.11, 0.17));
      set("--bp-callouts", range(p, 0.17, 0.2));
      set("--bp-exposed", range(p, 0.88, 0.93));
      const active = p >= 0.2 && p < 0.88 ? bpOrder[Math.min(6, Math.floor(range(p, 0.2, 0.86) * 7))] : "";
      bpPasses.forEach((el) => el.toggleAttribute("data-active", el.dataset.bpPass === active));
      bpCallouts.forEach((el) => {
        const on = el.dataset.pass === active;
        el.toggleAttribute("data-active", on);
        bpLabels.find((l) => l.dataset.bpLabel === el.dataset.bpCallout)?.toggleAttribute("data-active", on);
      });
      fadeIn(bpDossier, range(p, 0.18, 0.23));
      // the archive of trajectories scrolls with the page; the case at the reading line is active
      const a = range(p, 0.22, 0.86);
      if (archive && cases.length) {
        const idx = Math.min(cases.length - 1, Math.floor(a * cases.length));
        const target = cases[idx].offsetTop - 12;
        const prev = idx > 0 ? cases[idx - 1].offsetTop - 12 : 0;
        const local = a * cases.length - idx;
        archive.style.transform = `translate3d(0, ${-(prev + (target - prev) * ease(Math.min(1, local * 3)))}px, 0)`;
        cases.forEach((c, i) => c.toggleAttribute("data-active", i === idx));
      }
      if (!reviewManual) showReview(Math.min(reviewShots.length - 1, Math.floor(range(p, 0.22, 0.9) * reviewShots.length)));
      setScene(2);
    },
  });

  // scenes 04-09: flight in, hold the last frame, content on top
  const stillHandlers: Record<string, (p: number, el: HTMLElement) => void> = {
    stories: (p, el) => {
      const stories = $$("[data-story]");
      const idx = Math.min(stories.length - 1, Math.floor(range(p, 0.34, 0.95) * stories.length));
      stories.forEach((s, i) => s.toggleAttribute("data-active", i === idx));
      const counter = el.querySelector("[data-story-index]");
      if (counter) counter.textContent = String(idx + 1);
    },
    work: (p) => setLoop(p),
    knowledge: (p, el) => {
      const svg = el.querySelector<SVGElement>("[data-kmap]");
      if (!svg) return;
      svg.style.opacity = String(range(p, 0.3, 0.36) * (1 - range(p, 0.95, 1)));
      setMap(p, svg);
    },
    subjects: (p) => {
      if (subjectManual) return;
      const ids = ["physics", "math", "cs"];
      setSubject(ids[Math.min(2, Math.floor(range(p, 0.3, 0.94) * 3))]);
    },
    formats: (p) => {
      $$("[data-format]").forEach((f, i) => {
        f.style.setProperty("--o", range(p, 0.38 + i * 0.06, 0.46 + i * 0.06).toFixed(3));
        f.style.setProperty("--step", String(i));
      });
    },
  };
  const FLIGHT_SHARE = 0.3;
  if (!compact) $$("[data-still]").forEach((track) => {
    const name = track.dataset.track!;
    if (name === "human") return;
    const el = track.querySelector<HTMLElement>("[data-still-stage]")!;
    const content = el.querySelector<HTMLElement>("[data-still-content]");
    const sceneIndex = Number(track.dataset.sceneIndex);
    ScrollTrigger.create({
      trigger: track,
      start: "top top",
      end: "bottom bottom",
      onToggle: ({ isActive }) => isActive && preloadAround(name),
      onUpdate: ({ progress: p }) => {
        flight(name, range(p, 0, FLIGHT_SHARE));
        stage.setFade(name === "formats" ? 1 - range(p, 0, 0.14) : 0);
        const shown = range(p, FLIGHT_SHARE, FLIGHT_SHARE + 0.07) * (1 - range(p, 0.95, 1));
        el.style.setProperty("--content", shown.toFixed(3));
        fadeIn(content, shown, 20);
        stillHandlers[name]?.(p, el);
        setScene(sceneIndex);
      },
    });
  });

  // scene 08: cut to black right after the subjects — "first the work, now the person" — then we are in the pod
  const human = $("[data-track='human']");
  if (human && !compact) {
    const el = human.querySelector<HTMLElement>("[data-still-stage]")!;
    const content = el.querySelector<HTMLElement>("[data-still-content]");
    const inside = el.querySelector<HTMLElement>("[data-human-layer='inside']")!;
    const dark = el.querySelector<HTMLElement>("[data-human-dark]")!;
    const intro = el.querySelector<HTMLElement>("[data-human-intro]")!;
    ScrollTrigger.create({
      trigger: human,
      start: "top top",
      end: "bottom bottom",
      onToggle: ({ isActive }) => isActive && preloadAround("human"),
      onUpdate: ({ progress: p }) => {
        stage.show("f_subjects", 1);
        stage.setFade(range(p, 0, 0.05));
        setConstruction(0.8 + 0.08 * p);
        // black, a long quiet hold on the line, then straight into the pod
        dark.style.opacity = String(range(p, 0, 0.05) * (1 - range(p, 0.3, 0.38)) + range(p, 0.9, 0.96));
        intro.style.opacity = String(range(p, 0.06, 0.12) * (1 - range(p, 0.26, 0.31)));
        intro.style.transform = `translate(-50%, calc(-50% + ${(1 - range(p, 0.06, 0.31)) * 14}px))`;
        inside.style.opacity = String(range(p, 0.3, 0.38));
        inside.style.setProperty("--push", String(1.12 - 0.1 * ease(range(p, 0.3, 0.55))));
        const shown = range(p, 0.42, 0.5) * (1 - range(p, 0.86, 0.9));
        el.style.setProperty("--shade", String(shown));
        fadeIn(content, shown, 20);
        setScene(7);
      },
    });
  }

  // scene 10: fly back to the opening shot — the same megastructure, now complete — then contact
  if (!compact) ScrollTrigger.create({
    trigger: "[data-track='build']",
    start: "top top",
    end: "bottom bottom",
    onToggle: ({ isActive }) => isActive && preloadAround("build"),
    onUpdate: ({ progress: p }) => {
      flight("build", range(p, 0, 0.45));
      stage.setFade(0);
      fadeIn(decisionUi, range(p, 0.5, 0.6));
      setScene(9);
    },
  });
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
          stage.preload(seqOf(name));
          stage.show(seqOf(name), 1, true);
          setConstruction(name === "human" ? 0.88 : FLIGHT[name].to);
          stage.setFade(name === "build" ? 0.2 : 0.6);
        }
        setScene(Number((e.target as HTMLElement).dataset.sceneIndex ?? 0));
      }),
    { threshold: 0.3 },
  );
  $$("[data-track]").forEach((t) => io.observe(t));
  setLoop(1, true);
  const kmap = $<SVGElement>("[data-kmap]");
  if (kmap) setMap(1, kmap);
};

setupHeader();
setupContactForm();
if (reducedMotion) setupStill();
else setupJourney();
