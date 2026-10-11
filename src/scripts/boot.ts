// Boot: hold the first screen in the dark until its flight's light frames are in, so the first scroll
// scrubs instead of stuttering. The percentage is the real share of those frames. The veil is there from
// the first paint (BaseLayout marks the page before it renders); the bar only appears when loading takes
// noticeable time, and slow loads get «Продолжить» to go ahead on whatever has arrived.
import type { SequenceStage } from "./sequence";

const SHOW_AFTER = 400;
const SKIP_AFTER = 2500;
const LIFT = 1100;

export const boot = (stage: SequenceStage, sequence: string) => {
  const root = document.documentElement;
  const el = document.querySelector<HTMLElement>("[data-boot]");
  // deep links and restored scroll positions go straight to their scene
  if (!el || !root.classList.contains("is-booting") || location.hash || window.scrollY > 0) {
    root.classList.remove("is-booting");
    return;
  }

  (window as Window & { __boot?: boolean }).__boot = true;
  const bar = el.querySelector<HTMLElement>(".boot__bar")!;
  const value = el.querySelector<HTMLElement>("[data-boot-value]")!;
  const line = el.querySelector<HTMLElement>("[data-boot-line]")!;
  const skip = el.querySelector<HTMLButtonElement>("[data-boot-skip]")!;
  const behind = Array.from(document.querySelectorAll<HTMLElement>(".site-header, .scene-rail, .journey"));
  let finished = false;

  el.hidden = false;
  behind.forEach((node) => node.setAttribute("inert", ""));

  const showTimer = window.setTimeout(() => bar.setAttribute("data-shown", ""), SHOW_AFTER);
  const skipTimer = window.setTimeout(() => {
    skip.hidden = false;
    requestAnimationFrame(() => skip.setAttribute("data-shown", ""));
  }, SHOW_AFTER + SKIP_AFTER);

  const finish = () => {
    if (finished) return;
    finished = true;
    window.clearTimeout(showTimer);
    window.clearTimeout(skipTimer);
    const moveFocus = document.activeElement === skip;
    behind.forEach((node) => node.removeAttribute("inert"));
    if (moveFocus) document.querySelector<HTMLElement>("[data-hero-ui] a")?.focus({ preventScroll: true });
    // the film comes up out of the dark: veil and interface lift together
    root.classList.add("is-lifting");
    root.classList.remove("is-booting");
    el.setAttribute("data-done", "");
    window.setTimeout(() => {
      el.hidden = true;
      root.classList.remove("is-lifting");
    }, LIFT + 250);
  };

  const update = () => {
    if (finished) return;
    const p = stage.progress(sequence);
    const percent = Math.round(p * 100);
    line.style.setProperty("--p", p.toFixed(3));
    line.setAttribute("aria-valuenow", String(percent));
    value.textContent = `${String(percent).padStart(3, "0")}%`;
    if (p >= 1) finish();
  };

  skip.addEventListener("click", finish);
  stage.onFrameLoad(update);
  update();
};
