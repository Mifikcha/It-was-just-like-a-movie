import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://mifikcha.github.io",
  // GitHub Pages serves under the repo path; Cloudflare (Workers/Pages builds) serves from the root.
  base: process.env.WORKERS_CI || process.env.CF_PAGES ? "/" : "/It-was-just-like-a-movie",
  output: "static",
  build: { inlineStylesheets: "auto" },
  devToolbar: { enabled: false },
});
