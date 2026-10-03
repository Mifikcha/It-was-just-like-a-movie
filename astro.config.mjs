import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://mifikcha.github.io",
  base: "/It-was-just-like-a-movie",
  output: "static",
  build: { inlineStylesheets: "auto" },
  devToolbar: { enabled: false },
});
