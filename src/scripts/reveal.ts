// Scene headlines rise line by line out of a mask when their scene becomes visible, and fold back when it
// leaves, so the reveal replays on every pass of the scroll story. Lines are the authored <br /> breaks.
// Visibility follows the journey's own fades (opacity / visibility on the scene containers), so the
// headline enters together with its scene instead of on a separate timer.

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const split = (el: HTMLElement) => {
  const lines: Node[][] = [[]];
  [...el.childNodes].forEach((n) => {
    if (n.nodeName === "BR") lines.push([]);
    else lines[lines.length - 1].push(n);
  });
  el.textContent = "";
  lines.forEach((nodes, i) => {
    const line = document.createElement("span");
    line.className = "line";
    const inner = document.createElement("span");
    inner.style.setProperty("--i", String(i));
    nodes.forEach((n) => inner.appendChild(n));
    line.appendChild(inner);
    el.appendChild(line);
  });
  el.dataset.split = "";
};

const visible = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  if (r.bottom < 0 || r.top > window.innerHeight || r.width === 0) return false;
  for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
    const s = n.style;
    if (s.visibility === "hidden") return false;
    if (s.opacity !== "" && Number(s.opacity) < 0.3) return false;
  }
  // stylesheet-driven fades (stories, formats) and hidden layers
  return el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true;
};

if (!reduced) {
  const heads = [...document.querySelectorAll<HTMLElement>(".track .display, .track .headline")].filter(
    (h) => !h.classList.contains("visually-hidden"),
  );
  heads.forEach(split);
  const tick = () => heads.forEach((h) => h.toggleAttribute("data-revealed", visible(h)));
  // the scene fades lag behind the scroll (smoothed timelines), so keep checking for a moment after the
  // last scroll event instead of once per event
  let until = 0;
  let running = false;
  const loop = () => {
    tick();
    if (performance.now() < until) requestAnimationFrame(loop);
    else running = false;
  };
  const wake = () => {
    until = performance.now() + 1200;
    if (!running) {
      running = true;
      requestAnimationFrame(loop);
    }
  };
  window.addEventListener("scroll", wake, { passive: true });
  window.addEventListener("resize", wake);
  wake();
  setInterval(tick, 700);   // safety net: 10 headlines, negligible cost
}
