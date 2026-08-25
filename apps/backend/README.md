# apps/backend

Backend и инфраструктура пет-проекта **Industrial Telemetry**: эмуляция промышленных датчиков, потоковая обработка, realtime-дашборды.

Часть монорепы `industrial-telemetry`. Фронты:

- [apps/operator](../operator) — Angular (мониторинг)
- [apps/admin](../admin) — React (админка / аналитика)

Корневой README: [../../README.md](../../README.md).

## Стек

| Слой | Технологии |
|------|------------|
| Runtime | NestJS (monorepo) |
| Messaging | Kafka |
| Hot state | Tarantool |
| Cache / pub-sub | Redis |
| History | MongoDB (raw + query-time buckets, без отдельной «суточной» БД) |
| Master data | PostgreSQL + Prisma |
| Edge | `core-api` + `bff` (REST + WebSocket) |

## Приложения (`apps/`)

| App | Роль |
|-----|------|
| `bff` | REST + WebSocket для фронтов |
| `core-api` | Доменная логика / доступ к хранилищам |
| `telemetry-generator` | Эмулятор: активные датчики из Postgres → Kafka |
| `telemetry-consumer` | Kafka → Tarantool + Mongo + Redis |
| `alert-consumer` | Пороги → Postgres alerts + Redis |

Общие типы: `libs/common` (`@it/common`). Prisma: `libs/prisma` (`@it/prisma`).

## Документация

| Документ | Содержание |
|----------|------------|
| [AGENTS.md](./AGENTS.md) | Инструкции для AI-агента: стек, карта, правила кода |
| [docs/architecture.md](./docs/architecture.md) | Схемы, сервисы, потоки |
| [docs/data-model.md](./docs/data-model.md) | Postgres / Mongo / Redis / Tarantool / Kafka |
| [docs/mvp.md](./docs/mvp.md) | Scope и порядок работ |
| [docs/api-sketch.md](./docs/api-sketch.md) | Черновик REST + WS |
| [docs/backend-guide.md](./docs/backend-guide.md) | Подробное объяснение backend для изучения |

## Статус

- Docs — готовы
- Docker Compose — готов
- Nest monorepo skeleton — готов
- Postgres schema + seed (Prisma) — готов
- `telemetry-generator` → Kafka `telemetry.raw` по активным датчикам из Postgres — готов
- Готово: `telemetry-consumer` → Tarantool + Mongo + Redis и `alert-consumer` → Postgres + Redis
- Готово: `core-api` monitoring + sensors/thresholds/alerts REST и BFF auth/session proxy с ролями
- Готово: WebSocket Redis → BFF → clients для telemetry и alerts
- В работе: frontend screens

## Быстрый старт

Первый раз (один раз):

```bash
cp .env.example .env   # если ещё нет
npm install
npm run infra:up       # нужен Docker Desktop
npm run prisma:migrate # или prisma:deploy
npm run prisma:seed
```

Дальше — **одной командой** (infra + все Nest apps в watch):

```bash
npm run dev
```

- BFF: http://localhost:3000/health  
- core-api: http://localhost:3001/health  
- Kafka UI: http://localhost:8088  

Только API (без generator/consumers), удобно для Admin auth:

```bash
npm run infra:up && npm run dev:api
```

Seed-логины (пароль `password123`):

- `admin@telemetry.local`
- `operator@telemetry.local`

Полезное:

```bash
npm run prisma:studio   # GUI Postgres
npm run db:reset        # migrate reset + seed
npm run infra:down      # остановить Docker
```

## Проверка live-датчика (Admin → Operator)

Seed-датчики (T-101 / P-201 / V-301 / F-401 на site `11111111-1111-1111-1111-111111111111`) продолжают слать телеметрию как раньше. Новые датчики **не** нужно добавлять в `SEED_SENSORS`.

1. `npm run dev` (infra + сервисы).
2. Admin: создать датчик на demo site/line, `isActive=true`.
3. Подождать refresh каталога generator (`GENERATOR_SENSOR_REFRESH_MS`, по умолчанию 10 с). В логах: `каталог датчиков обновлён: N активных`.
4. Operator overview: у датчика `value !== null`, статус не «Нет сигнала».
