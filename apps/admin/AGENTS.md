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
| pages    | `pages/`    | login, home, forbidden, sites, sensors (list/create/edit), alerts |
| widgets  | `widgets/`  | admin-shell                                                       |
| features | `features/` | auth, theme, feedback, sites, sensors, alerts (hooks, labels)     |
| entities | `entities/` | user, site, sensor, alert (types + API + query keys)              |
| shared   | `shared/`   | http, apiError, theme factory, ui-примитивы                       |

Публичный API слайса — через `index.ts`, где он есть. Features не импортируют соседние features.

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
- Admin shell: `/`, `/sites`, `/sites/:id`, `/sensors`, `/sensors/new`, `/sensors/:id/edit`, `/alerts`

## Фаза B — API

- `GET /api/sites` (+ lines)
- `POST /api/sites`, `PATCH /api/sites/:id` — admin
- `POST /api/sites/:siteId/lines`, `PATCH /api/lines/:id` — admin
- Sensors / alerts как в Фазе A

Мутации sites/lines инвалидируют `siteKeys.all`. 403/409 — понятный текст.

### Sites UI

Список + detail (edit site, CRUD линий без DELETE). Ссылки на sensors с `siteId`/`lineId`.

### Alerts labels

severity: Предупреждение / Критично; status по-русски.

## Правила для агента

- Перед кодом — короткий план; ответы на русском.
- KISS / SOLID; FSD-lite без оверинжиниринга сегментов.
- Не читать и не коммитить `.env` / секреты.
- Realtime/WebSocket и аналитика — только когда явно в задаче.
- UI: styled-components + MUI; Inter; primary `#1890ff`.
- При расхождении с backend API — сверять `apps/backend/docs/api-sketch.md`.
- Out of scope: users CRUD, DELETE site/line/sensor, WS, charts.
- Follow-up: Operator site picker (сейчас DEMO_SITE_ID).
