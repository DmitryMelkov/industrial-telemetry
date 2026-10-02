# Viewer (Vue)

Read-only мониторинг для industrial-telemetry. Порт **5174**.

Браузер ходит только в BFF `http://localhost:3000` через Vite proxy (`/api`, `/ws`).

## Запуск

```bash
cd apps/viewer
npm install
npm run dev
# из корня mono: npm run dev:viewer
```

→ http://localhost:5174/

## Lint / format

```bash
npm run lint:check
npm run format
```

Pre-commit (husky из корня mono) гоняет lint-staged и для `apps/viewer`.

Нужен запущенный BFF и в `apps/backend/.env`:

```env
CORS_ORIGIN=http://localhost:4200,http://localhost:5173,http://localhost:5174
```
