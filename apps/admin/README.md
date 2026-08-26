# apps/admin

React SPA — **Admin / Analytics** для конфигурации объектов, линий, датчиков и просмотра алертов.

Часть монорепы `industrial-telemetry`. Корневой README: [../../README.md](../../README.md).

## Стек

- React 19 + Vite + TypeScript
- MUI + styled-components (UI в духе Alarta: Inter, primary `#1890ff`)
- MobX + mobx-react-lite — client/UI state (auth user, theme, snackbar)
- TanStack Query — server state / cache / mutations
- React Router
- Axios (`withCredentials: true`) → только BFF `/api/*`
- Архитектура: **FSD-lite** (`app` → `pages` → `widgets` → `features` → `entities` → `shared`)

**Не используем:** Redux / RTK / RTK Query.

## Быстрый старт

1. Поднять backend в `apps/backend` (`npm run dev` или `npm run dev:api`; из корня: `npm run dev:backend` / `npm run dev:api`).
2. В этом app:

```bash
npm install
npm run dev
```

Приложение: `http://localhost:5173`. Dev-proxy: `/api` → `http://localhost:3000`.

### Demo admin

- Email: `admin@telemetry.local`
- Password: `password123`
- SiteId: `11111111-1111-1111-1111-111111111111`

Роль должна быть `admin`. Пользователь с ролью `operator` увидит экран отказа.

## Команды

| Команда                | Описание         |
| ---------------------- | ---------------- |
| `npm run dev`          | Vite dev server  |
| `npm run build`        | production build |
| `npm run preview`      | превью сборки    |
| `npm run lint`         | oxlint --fix     |
| `npm run lint:check`   | oxlint           |
| `npm run format`       | prettier --write |
| `npm run format:check` | prettier --check |

Алиас импортов: слойные алиасы `@features/*`, `@shared/*` и т.д. (например `@features/auth`).

Husky + lint-staged на pre-commit.

## Auth

- Cookie: `it_session` (httpOnly, выставляет BFF)
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Клиент всегда с `withCredentials: true`

## State

| Слой           | Что хранит                                     |
| -------------- | ---------------------------------------------- |
| MobX           | `user`, theme mode, snackbar, UI-only          |
| TanStack Query | REST-данные (sites/sensors/alerts) и mutations |

Server data **не** дублировать в MobX.

## Фаза A

Home KPI, журнал алертов (status/severity/period), датчики `isActive`.

## Фаза B (текущая)

Иерархия **объект → линия → датчик**.

### Объекты (`/sites`, `/sites/:id`)

- Список: code, name, число линий; открыть / датчики
- Карточка: edit site; create/edit линий; ссылки на `/sensors?siteId=&lineId=`
- API: `POST/PATCH /sites`, `POST /sites/:siteId/lines`, `PATCH /lines/:id` (admin-only через BFF)

### Датчики

- Create: явный выбор site → lines (зависит от объекта); пустые линии — подсказка создать на странице объекта
- Фильтры list в URL при new/edit → back

### Home / Alerts (шлифовка)

- CTA «Объекты»; KPI алертов `limit` до 500 + подпись
- Labels severity/status по-русски (`Предупреждение` / `Критично`)

Не в этой фазе: users CRUD, DELETE site/line/sensor, WebSocket, charts.

## Документация системы

- [architecture](../backend/docs/architecture.md)
- [MVP](../backend/docs/mvp.md)
- [API sketch](../backend/docs/api-sketch.md)

Связанные apps: [backend](../backend), [operator](../operator).
