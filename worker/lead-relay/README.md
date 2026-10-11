# Lead relay

The site's contact form posts `{name, contact}` here; the worker sends one message to the teacher's Telegram.
The bot token and chat id are Worker secrets — they never appear in the site's code.

Deploy (once, from this folder):

```
npx wrangler login
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TEACHER_CHAT_ID
npx wrangler deploy
```

`TELEGRAM_BOT_TOKEN` / `TEACHER_CHAT_ID`: the GLaDOS bot (`TutorOS/legacy/tutor-agent/.env`: `TELEGRAM_BOT_TOKEN`,
`TEACHER_TELEGRAM_ID`) — sending from the worker does not interfere with the bot's polling.
The teacher must have pressed /start in that bot once, otherwise Telegram does not deliver.

Then put the printed `https://hnd-lead-relay.<account>.workers.dev` URL into `links.leadEndpoint`
(`src/data/content.ts`). Allowed page origins are `ALLOWED_ORIGINS` in `wrangler.toml`.
