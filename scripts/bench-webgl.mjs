// Old vs new stage on the same build: ?engine=legacy (rendered flights) against the live WebGL scene.
// Headed system Chrome so the real GPU is used. Each engine gets a fresh context with the cache disabled.
//   node scripts/bench-webgl.mjs                 load + 40 s scripted scroll, results to docs/perf/
//   node scripts/bench-webgl.mjs --throttle      the same over an emulated 20 Mbit/s, 40 ms link
//   node scripts/bench-webgl.mjs --shots         one screenshot per scene and engine
//   --url <base>  (default http://localhost:4390/It-was-just-like-a-movie/, i.e. `npm run preview -- --port 4390`)
//   --quality low|medium|high  pins the WebGL tier (default: automatic)
//   --igpu       ask Chrome for the low-power (integrated) GPU on dual-GPU laptops
//   --cpu <n>    CPU slowdown factor (CDP throttling), e.g. 4 for a weak laptop / phone
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const has = (name) => process.argv.includes(name);
const BASE = arg("--url", "http://localhost:4390/It-was-just-like-a-movie/");
const THROTTLE = has("--throttle");
const QUALITY = arg("--quality", null);
const IGPU = has("--igpu");
const CPU = Number(arg("--cpu", 1));
const SCROLL_MS = 40000;
const VIEW = { width: 1440, height: 900 };

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  args: [`--window-size=${VIEW.width},${VIEW.height + 140}`, "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-features=CalculateNativeWinOcclusion", ...(IGPU ? ["--force_low_power_gpu"] : [])],
});

const ENGINES = { legacy: "?engine=legacy", webgl: QUALITY ? `?quality=${QUALITY}` : "" };
const pct = (a, p) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

async function open(engine) {
  const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Performance.enable");
  if (CPU > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  if (THROTTLE) await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 40, downloadThroughput: 20e6 / 8, uploadThroughput: 5e6 / 8 });
  const net = { bytes: 0, requests: 0 };
  cdp.on("Network.loadingFinished", (e) => {
    net.bytes += e.encodedDataLength;
    net.requests++;
  });
  await page.addInitScript(() => {
    window.__longtasks = [];
    new PerformanceObserver((list) => list.getEntries().forEach((e) => window.__longtasks.push([e.startTime, e.duration]))).observe({ type: "longtask", buffered: true });
  });
  await page.goto(BASE + ENGINES[engine], { waitUntil: "domcontentloaded" });
  return { context, page, cdp, net };
}

async function measure(engine) {
  const { context, page, cdp, net } = await open(engine);
  // the veil lifts when the first scene can be scrubbed: that is the first useful picture
  await page.waitForFunction(() => !document.documentElement.classList.contains("is-booting"), null, { timeout: 180000, polling: 50 });
  const load = await page.evaluate(() => ({
    ready: performance.now(),
    dcl: performance.getEntriesByType("navigation")[0]?.domContentLoadedEventEnd ?? null,
    longtasks: window.__longtasks.slice(),
  }));
  const bytesAtReady = net.bytes;
  const requestsAtReady = net.requests;
  await page.waitForTimeout(1500);
  load.fcp = await page.evaluate(() => performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null);
  const gpu = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown";
  });
  // the display's own frame interval, measured on a still page
  const refresh = await page.evaluate(() => new Promise((res) => {
    const d = [];
    let last = 0;
    const f = (now) => {
      if (last) d.push(now - last);
      last = now;
      d.length < 60 ? requestAnimationFrame(f) : res(d.sort((a, b) => a - b)[30]);
    };
    requestAnimationFrame(f);
  }));
  const scrollStart = await page.evaluate(() => performance.now());
  const run = await page.evaluate(async (dur) => {
    const total = document.documentElement.scrollHeight - innerHeight;
    const dts = [];
    let last = performance.now();
    const start = last;
    await new Promise((done) => {
      const f = (now) => {
        dts.push(now - last);
        last = now;
        const k = Math.min(1, (now - start) / dur);
        scrollTo(0, total * k);
        k < 1 ? requestAnimationFrame(f) : done();
      };
      requestAnimationFrame(f);
    });
    return { dts: dts.slice(2), total };
  }, SCROLL_MS);
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => window.__longtasks.slice());
  const tier = await page.evaluate(() => {
    const c = document.querySelector("[data-stage-canvas]");
    return c.dataset.tier ? { tier: c.dataset.tier, switches: Number(c.dataset.tierSwitches), res: c.width / innerWidth } : null;
  });
  const metrics = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  await context.close();

  const dts = run.dts;
  const scrollTasks = after.filter(([s]) => s >= scrollStart);
  const tbt = (tasks) => round(tasks.reduce((s, [, d]) => s + Math.max(0, d - 50), 0), 0);
  return {
    engine,
    gpu,
    refreshMs: round(refresh, 2),
    load: {
      fcpMs: round(load.fcp ?? NaN, 0),
      readyMs: round(load.ready, 0),
      bytesAtReadyMB: round(bytesAtReady / 1048576, 2),
      requestsAtReady,
      longTasks: load.longtasks.length,
      totalBlockingMs: tbt(load.longtasks),
    },
    scroll: {
      frames: dts.length,
      avgFps: round(1000 / (dts.reduce((a, b) => a + b, 0) / dts.length)),
      p50Ms: round(pct(dts, 0.5)),
      p95Ms: round(pct(dts, 0.95)),
      p99Ms: round(pct(dts, 0.99)),
      over25ms: dts.filter((d) => d > 25).length,
      over50ms: dts.filter((d) => d > 50).length,
      longTasks: scrollTasks.length,
      totalBlockingMs: tbt(scrollTasks),
    },
    totalTransferMB: round(net.bytes / 1048576, 2),
    totalRequests: net.requests,
    jsHeapMB: round(metrics.JSHeapUsedSize / 1048576),
    // WebGL only: tier at the end of the run, how many times the world was built, render scale (canvas px / css px)
    tier,
  };
}

async function shots() {
  await mkdir("docs/perf/shots", { recursive: true });
  const scenes = ["top", "evidence", "work", "subjects", "author", "formats", "contact"];
  for (const engine of Object.keys(ENGINES)) {
    const { context, page } = await open(engine);
    await page.waitForFunction(() => !document.documentElement.classList.contains("is-booting"), null, { timeout: 180000 });
    for (const [i, id] of scenes.entries()) {
      if (id === "top") await page.evaluate(() => scrollTo(0, 0));
      else await page.evaluate((h) => document.querySelector(`a[href="#${h}"]`)?.click(), id);
      await page.waitForTimeout(engine === "legacy" ? 5000 : 2500);
      await page.screenshot({ path: `docs/perf/shots/${engine}-${i + 1}-${id}.jpg`, type: "jpeg", quality: 82 });
    }
    await context.close();
  }
}

if (has("--shots")) await shots();
else {
  await mkdir("docs/perf", { recursive: true });
  const results = [];
  for (const engine of Object.keys(ENGINES)) {
    const r = await measure(engine);
    results.push(r);
    console.log(JSON.stringify(r, null, 2));
  }
  const name = `docs/perf/results${THROTTLE ? "-throttled" : ""}${IGPU ? "-igpu" : ""}${CPU > 1 ? `-cpu${CPU}` : ""}${QUALITY ? `-${QUALITY}` : ""}.json`;
  await writeFile(name, JSON.stringify({ date: new Date().toISOString(), base: BASE, viewport: VIEW, throttle: THROTTLE, igpu: IGPU, cpu: CPU, scrollMs: SCROLL_MS, results }, null, 2));
  console.log("saved", name);
}
await browser.close();
