// Lead relay for the site's contact form: the browser posts {name, contact}, the worker sends one Telegram
// message to the teacher. The bot token and the chat id live only in Worker secrets, never in the page.
//
//   secrets:  TELEGRAM_BOT_TOKEN, TEACHER_CHAT_ID        (wrangler secret put …)
//   vars:     ALLOWED_ORIGINS  comma-separated, e.g. "https://mifikcha.github.io,http://127.0.0.1:4321"

const MAX = { name: 80, contact: 80 };
const WINDOW_MS = 10 * 60 * 1000;
const PER_WINDOW = 5;
const recent = new Map(); // ip -> timestamps (best effort, per isolate)

const json = (body, status, cors) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", ...cors } });

const clean = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");

// a phone (7+ digits) or a Telegram handle / link
const looksLikeContact = (v) => /(\d[\s()+-]*){7,}/.test(v) || /^@?[a-z0-9_]{4,32}$/i.test(v) || /t\.me\/[a-z0-9_]{4,32}/i.test(v);

function corsFor(request, env) {
  const origin = request.headers.get("origin") ?? "";
  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return null;
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

function limited(ip, now = Date.now()) {
  const list = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  recent.set(ip, list);
  return list.length > PER_WINDOW;
}

export default {
  async fetch(request, env) {
    const cors = corsFor(request, env);
    if (!cors) return new Response("forbidden", { status: 403 });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ ok: false, error: "method" }, 405, cors);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "format" }, 400, cors);
    }
    // honeypot: a field people never see; bots fill it
    if (body?.website) return json({ ok: true }, 200, cors);

    const name = clean(body?.name, MAX.name);
    const contact = clean(body?.contact, MAX.contact);
    if (!name || !contact || !looksLikeContact(contact)) return json({ ok: false, error: "fields" }, 422, cors);

    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    if (limited(ip)) return json({ ok: false, error: "rate" }, 429, cors);

    const page = clean(body?.page, 120);
    const lines = ["Новая заявка с сайта Hopes and Dreams", "", `Имя: ${name}`, `Контакт: ${contact}`];
    if (page) lines.push(`Страница: ${page}`);
    const text = lines.join("\n");

    const tg = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: env.TEACHER_CHAT_ID, text, disable_web_page_preview: true }),
    });
    if (!tg.ok) return json({ ok: false, error: "telegram" }, 502, cors);
    return json({ ok: true }, 200, cors);
  },
};
