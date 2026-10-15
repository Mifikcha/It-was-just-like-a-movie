// ?debug=1: frame timing, GPU work and the quality switch. Updated four times a second, never per frame.
import type { WebGLStage } from "./stage";

export function mountDebug(stage: WebGLStage) {
  // for driving the camera from the console: stage.show("f_formats", 1, true)
  Object.assign(window, { stage });
  const el = document.createElement("aside");
  el.setAttribute("aria-label", "WebGL diagnostics");
  el.style.cssText =
    "position:fixed;left:12px;bottom:12px;z-index:9999;padding:10px 12px;background:rgba(8,9,20,.86);border:1px solid rgba(169,177,214,.21);" +
    "font:11px/1.5 'JetBrains Mono',Consolas,monospace;color:#a9b1d6;white-space:pre;pointer-events:auto";
  const out = document.createElement("div");
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Quality");
  for (const q of ["auto", "low", "medium", "high"]) select.add(new Option(q, q));
  select.value = stage.manual ? stage.tier : "auto";
  select.addEventListener("change", () => (select.value === "auto" ? stage.autoTier() : stage.setTier(select.value as "low", true)));
  el.append(out, select);
  document.body.append(el);

  const gl = stage.renderer.getContext();
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "hidden by the browser";
  (window as Window & { __stage?: WebGLStage }).__stage = stage;

  setInterval(() => {
    const n = Math.min(stage.framesSeen, stage.frames.length);
    const recent = Array.from(stage.frames.subarray(0, n));
    const last = stage.frames[(stage.framesSeen - 1 + stage.frames.length) % stage.frames.length] || 0;
    const avg = n ? recent.reduce((a, b) => a + b, 0) / n : 0;
    const p95 = n ? recent.sort((a, b) => a - b)[Math.floor(n * 0.95)] : 0;
    const r = stage.renderer.info;
    const s = stage.state;
    const heap = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
    const scene = document.querySelector("[data-rail-dot][data-active]")?.textContent?.trim().replace(/\s+/g, " ") ?? "—";
    out.textContent = [
      `fps        ${last ? (1000 / last).toFixed(0) : "—"}   avg ${avg ? (1000 / avg).toFixed(1) : "—"}  (last ${n} moving frames)`,
      `frame      ${last.toFixed(1)} ms   avg ${avg.toFixed(1)}   p95 ${p95.toFixed(1)}`,
      `gpu time   not measured (no timer query)`,
      `draws      ${r.render.calls}   tris ${(r.render.triangles / 1000).toFixed(0)}k   lines ${r.render.lines}   points ${r.render.points}`,
      `instances  ${s.instances}`,
      `quality    ${stage.tier} (${stage.reason})   res ×${s.res.toFixed(2)}`,
      `scene      ${scene}   path ${s.shot} @ ${s.t.toFixed(3)}   build ${s.build.toFixed(3)}`,
      `gpu mem    ${r.memory.geometries} geometries, ${r.memory.textures} textures (count, not bytes)`,
      `js heap    ${heap ? (heap / 1048576).toFixed(1) + " MB" : "n/a in this browser"}`,
      `renderer   ${gpu}`,
    ].join("\n");
  }, 250);
}
