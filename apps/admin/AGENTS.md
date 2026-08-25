# AI Context — apps/admin

React Admin SPA для industrial telemetry. Ходит **только в BFF** (`/api/*`), cookie `it_session`.

Соседние apps в монорепе: `apps/backend` (источник правды по API), `apps/operator` (Angular).

## Команды

- `npm run dev` — Vite на `:5173`, proxy `/api` → `localhost:3000`
- `npm run build` / `npm run preview`
- `npm run lint` / `npm run lint:check` — oxlint
- `npm run format` / `npm run format:check` — Prettier
- Husky pre-commit → lint-staged (oxlint + prettier)

Demo admin: `admin@telemetry.local` / `password123` (роль `admin`).
Demo siteId: `11111111-1111-1111-1111-111111111111`.

## Обязательный стек

- React + Vite + TypeScript
- MUI + **styled-components** (layout/brand; `sx` только точечно у MUI)
- MobX + mobx-react-lite (синглтоны `authStore` / `themeStore` / `snackbarStore`)
- TanStack Query — server state / mutations (**не** роутинг)
- React Router DOM — маршруты
- Axios `withCredentials: true`
- Алиас: `@app` / `@pages` / `@widgets` / `@features` / `@entities` / `@shared`

**Запрещено без явной причины:** Redux / RTK / RTK Query, Next.js, TanStack Router, лишние state-библиотеки.

## Архитектура — FSD-lite

Слои (сверху вниз; импорт только вниз):

| Слой     | Путь        | Роль                                                              |
| -------- | ----------- | ----------------------------------------------------------------- |
| app      | `app/`      | providers, router, global styles                                  |
| pages    | `pages/`    | login, home, forbidden, sensors (list/create/edit), alerts        |
| widgets  | `widgets/`  | admin-shell                                                       |
| features | `features/` | auth, theme, feedback (snackbar), sensors, alerts (hooks, labels) |
| entities | `entities/` | user, site, sensor, alert (types + API + query keys)              |
| shared   | `shared/`   | http, apiError, theme factory, ui-примитивы                       |

Публичный API слайса — через `index.ts`, где он есть.

## State rules

| Инструмент     | Ответственность                         |
| -------------- | --------------------------------------- |
| MobX           | auth `user`, theme, snackbar, UI-only   |
| TanStack Query | REST (sites/sensors/alerts) + mutations |

Не класть server cache в MobX. Auth user — исключение (session/client state).

## Auth / routes

- Guest: `/login`
- Protected: сессия обязательна
- Admin: `role === 'admin'` → shell; иначе `/forbidden`
- Bootstrap: `GET /api/auth/me` при старте
- Admin shell: `/`, `/sensors`, `/sensors/new`, `/sensors/:id/edit`, `/alerts`

## Stage 2–3 API

- `GET /api/sites`
- `GET /api/sensors?siteId=&lineId=&metric=`
- `GET /api/sensors/:id`
- `POST /api/sensors`
- `PATCH /api/sensors/:id`
- `PUT /api/sensors/:id/thresholds`
- `GET /api/alerts?siteId=&status=`
- `PATCH /api/alerts/:id/ack`

Мутации датчиков инвалидируют `sensorKeys.all`. Ack алерта — `alertKeys.all`. 403 показываем понятным текстом.

## Правила для агента

- Перед кодом — короткий план; ответы на русском.
- KISS / SOLID; FSD-lite без оверинжиниринга сегментов.
- Не читать и не коммитить `.env` / секреты.
- Realtime/WebSocket и аналитика — только когда явно в задаче.
- UI: styled-components + MUI; Inter; primary `#1890ff`.
- При расхождении с backend API — сверять `apps/backend/docs/api-sketch.md`.
