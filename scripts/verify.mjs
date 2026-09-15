import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile("dist/index.html", "utf8");

for (const marker of [
  'lang="ru"',
  'id="proof"',
  'id="system"',
  'id="author"',
  'id="formats"',
  'id="contact"',
  "https://t.me/Skifcha",
  "[REAL REVIEW REQUIRED]",
  "[RESULT DATA REQUIRED]",
]) {
  assert(html.includes(marker), `Missing production marker: ${marker}`);
}

assert(!html.includes("Гарантирую результат"), "Unverifiable promise reached production markup");
console.log("Static site contract verified.");
