# AI Context — apps/backend

Система промышленного мониторинга (демо / учебный стенд): эмуляция датчиков → Kafka → хранилища → BFF → два фронта (Operator Angular / Admin React) в realtime.

Часть монорепы `industrial-telemetry` (`apps/backend`). Фокус: NestJS monorepo, Kafka, Redis, Tarantool, MongoDB, PostgreSQL, BFF, WebSocket, auth.

## Команды

- `npm run dev` — **одной строкой**: `infra:up --wait` + все Nest apps (core-api, bff, consumers, generator) в watch.
- `npm run dev:api` — только `core-api` + `bff` (без workers; для Admin/auth).
- `npm run infra:up` / `infra:down` / `infra:ps` — Docker Compose (Kafka, Redis, Tarantool, Mongo, Postgres, Kafka UI); `infra:up` ждёт healthcheck.
- `npm run start:bff:dev` — BFF watch (`http://localhost:3000/health`).
- `npm run start:core-api:dev` — core-api watch (`:3001`).
- `npm run start:generator:dev` — эмулятор датчиков (worker).
- `npm run start:telemetry-consumer:dev` / `start:alert-consumer:dev` — workers.
- `npm run build` / `build:all` — сборка Nest apps; запускать после заметных изменений.
- `npm run lint` / `lint:check` — ESLint.
- `npm run prisma:migrate` — создать/применить миграцию (dev).
- `npm run prisma:seed` — seed (site, lines, sensors, admin/operator).
- `npm run prisma:studio` — GUI для Postgres.
- `npm run db:reset` — reset + migrate + seed.

Kafka UI: `http://localhost:8088`. Порты и URL — в `.env.example` (секреты/локальный `.env` не читать и не коммитить).

## Обязательный стек

- NestJS 11 + TypeScript (monorepo через Nest CLI)
- Kafka — буфер телеметрии
- Tarantool — hot state (последнее значение по sensorId)
- Redis — кэш overview + pub/sub fan-out в BFF
- MongoDB — история точек (append-only)
- PostgreSQL — master data (users, sites, lines, sensors, thresholds, alerts)
- Фронты в `apps/operator` и `apps/admin`; ходят только в BFF

## Карта проекта

| Путь | Роль |
|------|------|
| `apps/bff` | Edge для UI: REST + auth-сессия + WebSocket |
| `apps/core-api` | Доменная логика и доступ к хранилищам |
| `apps/telemetry-generator` | Эмулятор: активные sensors из Postgres → Kafka `telemetry.raw` |
| `apps/telemetry-consumer` | Kafka → Tarantool + Mongo + Redis pub/sub |
| `apps/alert-consumer` | Пороги → Postgres alerts + Redis pub/sub |
| `libs/common` | Общие типы/константы (`@it/common`) |
| `libs/prisma` | PrismaModule / PrismaService (`@it/prisma`) |
| `prisma/` | schema, migrations, seed |
| `docs/` | Источник правды по архитектуре и MVP |
| `docker-compose.yml` | Локальная инфра |

Соседние apps в монорепе: `apps/operator` (Angular), `apps/admin` (React).

## Документация (читать до кода)

1. [docs/architecture.md](./docs/architecture.md) — сервисы, поток, зачем каждое хранилище
2. [docs/data-model.md](./docs/data-model.md) — схемы Postgres/Mongo/Tarantool/Redis/Kafka
3. [docs/api-sketch.md](./docs/api-sketch.md) — контракт BFF (REST + WS)
4. [docs/mvp.md](./docs/mvp.md) — scope и порядок реализации

При расхождении кода и доков — сначала уточнить/обновить доки, не плодить скрытый контракт.

## Поток данных (happy path)

1. Generator читает активные `sensors` из Postgres и публикует точки в Kafka `telemetry.raw` (T-101 — демо-экскурсии за порог, остальные seed обычно в норме)
2. `telemetry-consumer` → Tarantool + Mongo + Redis `telemetry:updates`
3. `alert-consumer` при устойчивом нарушении порога → Postgres alerts + Redis `alerts:updates` (debounce / гистерезис, без отдельной БД алертов)
4. BFF подписан на Redis → пушит в WebSocket
5. REST через BFF — overview, CRUD (admin), alerts ack. History: raw или query-time bucket в той же Mongo (`from`/`to`/`interval`), без отдельной БД

Браузер **никогда** не ходит в Kafka/Redis/Tarantool/Mongo/Postgres напрямую — только BFF.

## Auth и роли

- Логин через BFF; роли: `operator` | `admin`
- Operator: realtime + алерты (чтение/ack)
- Admin: CRUD объектов/линий/датчиков/порогов/пользователей (+ всё operator). DELETE site/line/user — вне текущего MVP.
- Auth реализован через server-side session в Redis и httpOnly cookie `it_session` с TTL 8 часов.

## Правила для агента

- Перед изменениями читать существующий app/module и релевантный `docs/*`.
- KISS / SOLID: один app — одна ответственность; общую логику — в `libs/common` или shared-модуль, не копипаста.
- Не добавлять инфраструктуру «на вырост» вне MVP (K8s, SSO, Module Federation, отдельный npm contracts, Prometheus) — см. `docs/mvp.md`.
- Workers (`*-generator`, `*-consumer`) — `NestFactory.createApplicationContext`, без HTTP, если нет явной нужды в health endpoint.
- HTTP apps (`bff`, `core-api`) — модули Nest, тонкие controllers, логика в services.
- Именованные export предпочтительны; default export — только если требует фреймворк/CLI.
- Для `if/else`, `for`, `while`, `switch`, `try/catch` — всегда фигурные скобки.
- Конфиг из env через явные переменные из `.env.example`; не хардкодить пароли/URL прод-вида.
- Ошибки API в формате из `api-sketch.md`: `{ error: { code, message } }`.
- После изменений TypeScript/Nest: `npm run build` (или `build:all` при затрагивании нескольких apps).
- После правок структуры/imports: `npm run lint`.
- Не коммитить `.env`; не читать `.env` без явной просьбы пользователя.
- Коммиты — только по явной просьбе пользователя.

## Порядок MVP

1. ~~Docs~~ → ~~Compose + Nest skeleton~~
2. ~~Postgres schema + seed~~
3. ~~Generator + Kafka~~
4. ~~Consumer → Tarantool/Mongo/Redis~~
5. ~~Alerts~~
6. ~~Auth + BFF REST~~
7. ~~WebSocket~~
8. ~~Фронты~~ — `apps/operator`, `apps/admin`

## Code style (Nest / TS)

- Модули группировать по домену (`auth`, `sensors`, `alerts`, `telemetry`), не по «слоям ради слоёв».
- DTO + class-validator (когда появится validation) на границе HTTP; доменные типы — в `libs/common` или entity-слое.
- Не тащить UI-специфику в `core-api`; сборка ответов под экраны — в `bff`.
- Идемпотентность consumers — базовая для MVP; «как в проде» — фаза 2.
- Логи через Nest `Logger`, без `console.log` в новом коде (кроме краткого bootstrap).
