# industrial-telemetry

Пет-система промышленной телеметрии: эмуляция датчиков → Kafka → хранилища → BFF → realtime-дашборды.

Один репозиторий для портфолио: backend + Operator (Angular) + Admin (React).

## Структура

```
industrial-telemetry/
├── apps/
│   ├── backend/    # NestJS monorepo, Docker Compose, Prisma, workers
│   ├── operator/   # Angular SPA — мониторинг оператора (:4200)
│   └── admin/      # React SPA — админка / датчики / алерты (:5173)
├── package.json    # удобные npm-скрипты с корня
└── README.md
```

Фронты ходят **только в BFF** `http://localhost:3000` (REST + WebSocket). Прямого доступа к Kafka, Redis, Tarantool, Mongo, Postgres и Core API из браузера нет.

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
cp .env.example .env   # один раз
npm install
npm run infra:up       # Postgres, Mongo, Redis, Tarantool, Kafka, Kafka UI
npm run prisma:migrate # или prisma:deploy
npm run prisma:seed
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

## Smoke-проверка

1. `npm run dev:backend` (или `cd apps/backend && npm run dev`).
2. Login в Operator: `operator@telemetry.local` / `password123`.
3. Overview: KPI и текущие значения датчиков.
4. Charts: живой график по датчику.
5. Alerts journal: фильтры + ack открытого алерта.
6. Admin (`admin@telemetry.local`): список/создание датчика на demo site, `isActive=true`.
7. После refresh каталога generator (~10 с) новый датчик появляется в Operator overview.

## Документация по apps

| App | Точка входа |
|-----|-------------|
| Backend | [apps/backend/README.md](./apps/backend/README.md), [AGENTS.md](./apps/backend/AGENTS.md), [docs/](./apps/backend/docs/) |
| Operator | [apps/operator/README.md](./apps/operator/README.md), [AGENTS.md](./apps/operator/AGENTS.md) |
| Admin | [apps/admin/README.md](./apps/admin/README.md), [AGENTS.md](./apps/admin/AGENTS.md) |

Docker Compose остаётся в `apps/backend/docker-compose.yml` — поднимается через `npm run infra:up` из backend (или корневой алиас).
