// Encode Blender PNG sequences into web frames: public/seq/<name>/{1920,960}/0001.webp
//   node scripts/encode-frames.mjs "<blender renders/web folder>" approach build
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const [source, ...names] = process.argv.slice(2);
if (!source || names.length === 0) {
  console.error("usage: node scripts/encode-frames.mjs <renders/web> <sequence> [...]");
  process.exit(1);
}

const SIZES = [
  { width: 1920, quality: 64 },
  { width: 960, quality: 62 },
];

for (const name of names) {
  const input = resolve(source, name);
  const frames = readdirSync(input).filter((f) => /^\d{4}\.png$/.test(f)).length;
  for (const { width, quality } of SIZES) {
    const out = resolve("public", "seq", name, String(width));
    mkdirSync(out, { recursive: true });
    const result = spawnSync(
      "ffmpeg",
      ["-loglevel", "error", "-y", "-start_number", "1", "-i", join(input, "%04d.png"),
        "-vf", `scale=${width}:-2:flags=lanczos`, "-c:v", "libwebp", "-quality", String(quality),
        "-compression_level", "6", "-start_number", "1", join(out, "%04d.webp")],
      { stdio: "inherit" },
    );
    if (result.status !== 0) process.exit(result.status ?? 1);
    console.log(`${name}: ${frames} frames -> public/seq/${name}/${width}`);
  }
}
