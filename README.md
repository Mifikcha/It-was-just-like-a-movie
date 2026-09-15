# It was just like a movie

Кинематографичный одностраничный сайт Hopes and Dreams на Astro. Этот репозиторий полностью автономен: исходный проект Hopes and Dreams используется только как read-only источник визуальных материалов.

## Локальный запуск

```sh
npm install
npm run dev
```

Проверка production-сборки:

```sh
npm run build
npm run verify
```

Контент, который позже заменяется реальными данными, собран в `src/data/content.ts`. Результаты, отзывы, кейсы, фотография и изображения дипломов намеренно оставлены явными placeholders — сайт не создаёт вымышленные доказательства.

Пуш в `main` запускает отдельный GitHub Pages workflow из `.github/workflows/deploy.yml`.
