if (process.platform === "win32") process.env.NAPI_RS_FORCE_WASI ??= "true";

await import("../node_modules/astro/bin/astro.mjs");
