# industrial-telemetry

Демо-стенд промышленной телеметрии: эмуляция датчиков → Kafka → хранилища → BFF → realtime-дашборды.

Один репозиторий: **backend** (NestJS) + **Operator** (Angular) + **Admin** (React). Браузер ходит **только в BFF** `http://localhost:3000` (REST + WebSocket).

## Структура

```
industrial-telemetry/
├── apps/
│   ├── backend/    # NestJS, Docker Compose, Prisma, generator/consumers
│   ├── operator/   # Angular — мониторинг оператора (:4200)
│   └── admin/      # React — конфигурация и пользователи (:5173)
├── package.json    # скрипты с корня + husky/lint-staged
├── .husky/         # один pre-commit на mono
└── README.md
```

| App | Документация |
|-----|----------------|
| Backend | [apps/backend/README.md](./apps/backend/README.md), [docs/](./apps/backend/docs/) |
| Operator | [apps/operator/README.md](./apps/operator/README.md) |
| Admin | [apps/admin/README.md](./apps/admin/README.md) |

## Требования

- **Docker Desktop** (infra: Postgres, Mongo, Redis, Tarantool, Kafka)
- **Node.js** + npm (для apps)

## Быстрый старт

### 0. Корень mono (один раз после clone)

```bash
cd industrial-telemetry
npm install   # husky → core.hooksPath=.husky
```

### 1. Backend + infra

```bash
cd apps/backend
cp .env.example .env   # один раз; не коммитить
npm install
npm run infra:up
npm run prisma:migrate # или prisma:deploy
npm run prisma:seed    # перезаливает demo users/sensors/alerts
npm run dev            # infra + все Nest apps (bff, core-api, generator, consumers)
```

Из корня mono:

```bash
npm run infra:up
npm run dev:backend
```

Проверки:

| Сервис | URL |
|--------|-----|
| BFF | http://localhost:3000/health |
| core-api | http://localhost:3001/health |
| Kafka UI | http://localhost:8088 |

Только API без generator/consumers (удобно для чистого Admin auth):

```bash
npm run dev:api
# или: cd apps/backend && npm run infra:up && npm run dev:api
```

Для полного smoke (live + алерты) нужен именно **`dev` / `dev:backend`** с generator.

### 2. Operator

```bash
cd apps/operator
npm install
npm start
# из корня: npm run dev:operator
```

→ http://localhost:4200/

### 3. Admin

```bash
cd apps/admin
npm install
npm run dev
# из корня: npm run dev:admin
```

→ http://localhost:5173/ (dev-proxy `/api` → `:3000`)

## Demo-учётки (seed)

Пароль для обоих: **`password123`**

| Роль | Email |
|------|--------|
| Admin | `admin@telemetry.local` |
| Operator | `operator@telemetry.local` |

Demo site: `PLANT-1` / id `11111111-1111-1111-1111-111111111111`  
Seed-датчики: T-101, P-201, V-301, F-401. **T-101** периодически уходит за warning (иногда critical) дольше debounce (~20 с), чтобы журнал и overview не были вечно «Норма».

Повторный `npm run prisma:seed` **удаляет** demo users/sensors/alerts и заливает seed заново.

## E2E smoke «с нуля»

Цель: за один проход убедиться, что пайплайн, Admin и Operator стыкуются.

1. **Поднять** backend (`npm run dev:backend`) + Operator + Admin (см. выше).
2. **Admin** — login `admin@telemetry.local` / `password123`.
3. **Пользователи** (опционально) — создать operator, например `op2@telemetry.local` / `password123`; либо использовать seed-operator.
4. **Объекты** — создать site + линию (или взять `PLANT-1`).
5. **Датчики** — на линии создать датчик с `isActive=true` и порогами (или смотреть seed T-101).
6. **Operator** — login operator → в header выбрать нужный **объект**:
   - **Обзор** — KPI и live-значения (~10 с после появления датчика в catalog generator);
   - **График** — история + live;
   - **Журнал** — для T-101 подождать ~30–60 с экскурсию → `open` → ack → после нормы и hysteresis (~20 с) → `resolved`.
7. **Права:** operator не создаёт объекты/пользователей (API → 403). Смену пароля делает admin в **Пользователи**.
8. **F5** в Operator сохраняет выбранный объект (`localStorage`).

Краткий путь только на seed (без нового site): шаги 1–2 → Operator на `PLANT-1` → T-101 live / chart / journal.

## Стек

| Слой | Технологии |
|------|------------|
| Backend | NestJS (bff, core-api, generator, consumers) |
| Messaging | Kafka |
| Hot state | Tarantool |
| Cache / pub-sub | Redis |
| History | MongoDB |
| Master data | PostgreSQL + Prisma |
| Operator UI | Angular, Material, Chart.js, WebSocket |
| Admin UI | React, Vite, MUI, MobX, TanStack Query |

## Git: коммиты и push

Один remote, один git root. «Залить только бэк / только фронт» = stage нужного каталога под `apps/`.

После clone один раз в корне: `npm install` (husky). Nested husky в apps нет. Pre-commit гоняет `lint-staged` по каждому app (`--cwd`) только для **staged** файлов.

```bash
cd industrial-telemetry

git add apps/backend
git commit -m "fix(backend): …"
git push

git add apps/operator
git commit -m "feat(operator): …"
git push

git add apps/admin
git commit -m "feat(admin): …"
git push
```

Несколько apps — лучше отдельные коммиты, не один мешок. Не коммитить `.env` и секреты; `.env.example` — ок.

Docker Compose: `apps/backend/docker-compose.yml` → `npm run infra:up` из backend или корневой алиас.
