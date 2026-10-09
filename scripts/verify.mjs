import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const html = await readFile("dist/index.html", "utf8");

// one sphere version everywhere: flights, blueprint drawings and the stills (author's pod window, stories)
const sceneVersion = JSON.parse(await readFile("public/scene-version.json", "utf8"));
const versions = new Set(["seq", "blueprint", "scenes"].map((k) => sceneVersion[k]));
assert.equal(versions.size, 1, `Mixed sphere versions on the site: ${JSON.stringify(sceneVersion)}`);
assert.ok([...versions][0]?.startsWith("hopes_dyson_v"), "scene-version.json: missing version");


for (const marker of [
  'lang="ru"',
  'id="top"',
  'id="approach"',
  'id="evidence"',
  'id="stories"',
  'id="work"',
  'id="knowledge"',
  'id="subjects"',
  'id="author"',
  'id="formats"',
  'id="contact"',
  "data-stage-canvas",
  "data-quad=",
  "https://t.me/Skifcha",
  "степень",
]) {
  assert(html.includes(marker), `Missing production marker: ${marker}`);
}

assert(!html.includes("Гарантирую результат"), "Unverifiable promise reached production markup");

// Students stay anonymous: no first names from the case notes may reach the page.
for (const name of ["Ева", "Максим", "Никита", "Стёпа", "Степан", "Полина", "Саша", "Руслан"]) {
  assert(!new RegExp(`(^|[^А-Яа-яЁё])${name}([^А-Яа-яЁё]|$)`).test(html.replace(/<[^>]+>/g, " ")), `Student name on the page: ${name}`);
}

// No English words in visible text or accessible names — only the brand "Hopes and Dreams".
const visible = html
  // quotes and publication titles are kept in the original English and marked lang="en"
  .replace(/<(figure|blockquote|p|span|a|small)[^>]*\blang="en"[^>]*>[\s\S]*?<\/\1>/g, " ")
  .replace(/<script[\s\S]*?<\/script>/g, " ")
  .replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/&[a-z]+;/g, " ");
const attrs = [...visible.matchAll(/\s(?:alt|aria-label|title|placeholder)="([^"]*)"/g)].map((m) => m[1]);
const text = visible.replace(/<[^>]+>/g, " ");
const words = [...`${text} ${attrs.join(" ")}`.replace(/Hopes\s+and\s+Dreams|Desmos|Python|U-Net/g, " ").matchAll(/[A-Za-z]{2,}/g)].map((m) => m[0]);
assert.deepEqual([...new Set(words)], [], `English words on the page: ${[...new Set(words)].join(", ")}`);

// every scroll sequence ships complete: AVIF in every resolution tier, WebP at 960 for browsers without AVIF
const sequences = { approach: 90, f_blueprint: 72, f_stories: 72, f_work: 72, f_knowledge: 72, f_subjects: 72, f_formats: 72, f_final: 72 };
const tiers = { 1920: ["avif"], 960: ["avif", "webp"] };
for (const [name, count] of Object.entries(sequences)) {
  for (const [size, exts] of Object.entries(tiers)) {
    const files = await readdir(`dist/seq/${name}/${size}`);
    for (const ext of ["avif", "webp"]) {
      const frames = files.filter((f) => f.endsWith(`.${ext}`)).length;
      assert.equal(frames, exts.includes(ext) ? count : 0, `seq/${name}/${size} has ${frames} .${ext} frames`);
    }
  }
}
console.log("Static site contract verified.");
