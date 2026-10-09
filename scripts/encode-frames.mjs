// Encode Blender PNG sequences into web frames:
//   public/seq/<name>/{1920,960}/0001.avif  — what browsers load (10-bit AVIF: no banding in the glow)
//   public/seq/<name>/960/0001.webp              — fallback for browsers without AVIF
//   node scripts/encode-frames.mjs "<blender renders/web folder>" approach f_blueprint ...
import { spawn } from "node:child_process";
import { availableParallelism } from "node:os";
import { mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const [source, ...names] = process.argv.slice(2);
if (!source || names.length === 0) {
  console.error("usage: node scripts/encode-frames.mjs <renders/web> <sequence> [...]");
  process.exit(1);
}

// crf 26 at 10 bit matches the old WebP q82 on SSIM at ~40% fewer bytes
const AVIF = ["-c:v", "libaom-av1", "-still-picture", "1", "-crf", "26", "-cpu-used", "4", "-row-mt", "1", "-pix_fmt", "yuv420p10le"];
const WEBP = ["-c:v", "libwebp", "-quality", "78", "-compression_level", "6"];
const OUTPUTS = [
  { width: 1920, ext: "avif", codec: AVIF },
  { width: 960, ext: "avif", codec: AVIF },
  { width: 960, ext: "webp", codec: WEBP },
];

const jobs = [];
for (const name of names) {
  const input = resolve(source, name);
  const frames = readdirSync(input).filter((f) => /^\d{4}\.png$/.test(f)).sort();
  for (const { width, ext, codec } of OUTPUTS) {
    const out = resolve("public", "seq", name, String(width));
    mkdirSync(out, { recursive: true });
    for (const frame of frames) {
      jobs.push(["-loglevel", "error", "-y", "-i", join(input, frame),
        "-vf", `scale=${width}:-2:flags=lanczos`, ...codec, join(out, frame.replace(".png", `.${ext}`))]);
    }
  }
  console.log(`${name}: ${frames.length} frames queued`);
}

// one frame per ffmpeg process, several processes at a time
let next = 0;
let done = 0;
const worker = () =>
  new Promise((resolveWorker, reject) => {
    const run = () => {
      if (next >= jobs.length) return resolveWorker();
      const args = jobs[next++];
      spawn("ffmpeg", args, { stdio: "inherit" }).on("exit", (code) => {
        if (code !== 0) return reject(new Error(`ffmpeg failed: ${args.at(-1)}`));
        if (++done % 100 === 0 || done === jobs.length) console.log(`${done}/${jobs.length}`);
        run();
      });
    };
    run();
  });
await Promise.all(Array.from({ length: Math.max(1, Math.floor(availableParallelism() / 2)) }, worker));
