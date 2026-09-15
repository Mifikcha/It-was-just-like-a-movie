import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});

const targets = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

for (const target of targets) {
  const context = await browser.newContext({
    viewport: { width: target.width, height: target.height },
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4321/It-was-just-like-a-movie", { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.75) {
      scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    await Promise.all(
      [...document.images].map((img) =>
        img.complete ? Promise.resolve() : new Promise((resolve) => img.addEventListener("load", resolve, { once: true })),
      ),
    );
    scrollTo(0, 0);
  });
  await page.screenshot({ path: `.impeccable/review/${target.name}.png`, fullPage: true });
  await context.close();
}

await browser.close();
