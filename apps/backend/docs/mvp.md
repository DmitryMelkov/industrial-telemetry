# MVP

## Цель MVP

После `docker compose up` система сама генерирует телеметрию, пишет во все нужные хранилища, отдаёт realtime во фронты, есть логин и роли.

## Must have

### Backend / infra

- [x] Docker Compose: Kafka, Redis, Tarantool, MongoDB, PostgreSQL
- [x] Seed: 1 site, 1–2 lines, набор датчиков, admin + operator пользователи
- [x] `telemetry-generator` → Kafka `telemetry.raw` (активные sensors из Postgres)
- [x] `telemetry-consumer` → Tarantool + Mongo + Redis pub/sub
- [x] `alert-consumer` → Postgres alerts + Redis pub/sub
- [x] `core-api` + `bff` (REST, auth, roles, WebSocket)
- [x] Auth: login / logout / me, роли `operator` | `admin`
- [x] REST overview + sensors CRUD (admin) + alerts list/ack
- [x] WebSocket: поток точек и алертов

### Operator (Angular)

- [ ] Login
- [ ] Overview: KPI / текущие значения по линии
- [ ] Живой график 1–N датчиков
- [ ] Лента алертов + ack

### Admin (React)

- [ ] Login
- [ ] Список датчиков + создание/редактирование
- [ ] Пороги (min/max)
- [ ] Исторический график по датчику (запрос в Mongo через BFF)
- [ ] Список пользователей (минимум read; create — по желанию)

## Explicitly later (не MVP)

- Module Federation
- Next.js
- Отдельный npm-пакет контрактов
- Полноценный RBAC UI
- Метрики Prometheus / tracing
- Горизонтальное масштабирование consumers
- Красивый дизайн «как продукт» сверх читаемого UI

## Критерий «готово»

1. Compose поднимается без ручных плясок.
2. Без кликов в UI в логах/БД уже растут точки телеметрии.
3. Operator видит обновления без refresh.
4. Admin может сменить порог — и алерты начинают вести себя иначе.
5. `operator` не может менять датчики; `admin` может.

## Порядок реализации

1. Docs (этот набор) — done when merged mentally.
2. Compose + healthchecks пустых сервисов.
3. Postgres schema + seed.
4. Generator + Kafka. — done
5. Consumer → Tarantool/Mongo/Redis.
6. Alerts.
7. Auth + BFF REST. — done
8. WebSocket. — done
9. Operator MVP screens.
10. Admin MVP screens.
