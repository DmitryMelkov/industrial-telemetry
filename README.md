# industrial-telemetry

Система промышленной телеметрии (демо / учебный стенд): эмуляция датчиков → Kafka → хранилища → BFF → realtime-дашборды.

Один репозиторий: backend + Operator (Angular) + Admin (React).

## Структура

```
industrial-telemetry/
├── apps/
│   ├── backend/    # NestJS monorepo, Docker Compose, Prisma, workers
│   ├── operator/   # Angular SPA — мониторинг оператора (:4200)
│   └── admin/      # React SPA — админка / датчики / алерты (:5173)
├── package.json    # npm-скрипты + husky/lint-staged
├── .husky/         # один pre-commit на mono
└── README.md
```

Фронты ходят **только в BFF** `http://localhost:3000` (REST + WebSocket). Прямого доступа к Kafka, Redis, Tarantool, Mongo, Postgres и Core API из браузера нет.

## Git: коммиты и push

Один remote, один git root — `industrial-telemetry`. Ветка общая; «заливать только бэк / только фронт» = **stage и commit только нужный каталог** под `apps/`.

После клонирования один раз в корне: `npm install` (ставит husky → `core.hooksPath=.husky`). Nested husky в apps нет.

Pre-commit в корне гоняет `lint-staged` по каждому app (`--cwd`): линт/format только для **staged** файлов; пустой app пропускается. Правила — в `lint-staged` внутри `apps/*/package.json`.

```bash
cd C:/web/pet-projects/industrial-telemetry

# только backend
git add apps/backend
git commit -m "fix(backend): …"
git push

# только operator
git add apps/operator
git commit -m "feat(operator): …"
git push

# только admin
git add apps/admin
git commit -m "feat(admin): …"
git push

# несколько apps — лучше два (или три) коммита, не один мешок
git add apps/backend
git commit -m "fix(backend): …"
git add apps/operator
git commit -m "fix(operator): …"
git push
```

Не коммитить `.env`, секреты и локальные артефакты. `.env.example` — ок.

## Стек

| Слой | Технологии |
|------|------------|
| Backend | NestJS (bff, core-api, generator, consumers) |
| Messaging | Kafka |
| Hot state | Tarantool |
| Cache / pub-sub | Redis |
| History | MongoDB |
| Master data | PostgreSQL + Prisma |
| Operator UI | Angular 22, Material, Chart.js, WebSocket |
| Admin UI | React 19, Vite, MUI, MobX, TanStack Query |

## Быстрый старт

Нужен **Docker Desktop**.

### 1. Backend + infra

```bash
cd apps/backend
cp .env.example .env   # один раз; не коммитить
npm install
npm run infra:up       # Postgres, Mongo, Redis, Tarantool, Kafka, Kafka UI
npm run prisma:migrate # или prisma:deploy
npm run prisma:seed    # стирает demo-данные (users/sensors/alerts) и заливает заново
npm run dev            # infra + все Nest apps в watch
```

Из корня монорепы можно так же:

```bash
npm run infra:up
npm run dev:backend
```

Проверки:

- BFF: http://localhost:3000/health
- core-api: http://localhost:3001/health
- Kafka UI: http://localhost:8088

Только API (без generator/consumers), удобно для Admin auth:

```bash
cd apps/backend && npm run infra:up && npm run dev:api
# или из корня: npm run dev:api
```

### 2. Operator (Angular)

```bash
cd apps/operator
npm install
npm start
# или из корня: npm run dev:operator
```

→ http://localhost:4200/

### 3. Admin (React)

```bash
cd apps/admin
npm install
npm run dev
# или из корня: npm run dev:admin
```

→ http://localhost:5173/ (dev-proxy `/api` → `:3000`)

## Demo-учётки (из seed)

Пароль для обоих: `password123`

| Роль | Email |
|------|--------|
| Operator | `operator@telemetry.local` |
| Admin | `admin@telemetry.local` |

Demo site id: `11111111-1111-1111-1111-111111111111`

Seed-датчики: T-101, P-201, V-301, F-401. **T-101** периодически выходит за warning (иногда critical) дольше debounce (~20 с), чтобы журнал алертов и overview не были вечно «Норма». Остальные seed-датчики обычно в норме. После `npm run start:generator:dev` (или `dev`) первая экскурсия начинается сразу.

Повторный `npm run prisma:seed` **удаляет** demo users/sensors/alerts и заливает seed заново. Пороги T-101 менять не обязательно — достаточно перезапустить generator.

## Smoke-проверка

1. `npm run dev:backend` (или `cd apps/backend && npm run dev`).
2. Login в Operator: `operator@telemetry.local` / `password123`.
3. Overview: KPI и текущие значения датчиков. T-101 в первые ~45 с после старта generator — warning (иногда critical), не только «Норма».
4. Charts: живой график по датчику.
5. Alerts journal: подождать **~30–60 с** экскурсию T-101 → событие `open` → ack → после возврата в норму и hysteresis (~20 с) статус `resolved`.
6. Admin (`admin@telemetry.local`): список/создание датчика на demo site, `isActive=true`.
7. После refresh каталога generator (~10 с) новый датчик появляется в Operator overview.

## Документация по apps

| App | Точка входа |
|-----|-------------|
| Backend | [apps/backend/README.md](./apps/backend/README.md), [AGENTS.md](./apps/backend/AGENTS.md), [docs/](./apps/backend/docs/) |
| Operator | [apps/operator/README.md](./apps/operator/README.md), [AGENTS.md](./apps/operator/AGENTS.md) |
| Admin | [apps/admin/README.md](./apps/admin/README.md), [AGENTS.md](./apps/admin/AGENTS.md) |

Docker Compose остаётся в `apps/backend/docker-compose.yml` — поднимается через `npm run infra:up` из backend (или корневой алиас).
