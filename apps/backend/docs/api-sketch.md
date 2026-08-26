# API sketch (BFF)

Черновик контракта. Фронты ходят **только в BFF**. Префикс условный: `/api`.

Auth: httpOnly cookie `it_session`. Сессии хранятся в Redis и имеют TTL 8 часов.

## Auth

| Method | Path | Роли | Описание |
|--------|------|------|----------|
| POST | `/api/auth/login` | public | `{ email, password }` → httpOnly session cookie |
| POST | `/api/auth/logout` | any | инвалидация сессии |
| GET | `/api/auth/me` | any | текущий пользователь `{ id, email, role }` |

## Overview / monitoring

| Method | Path | Роли | Описание |
|--------|------|------|----------|
| GET | `/api/sites` | operator, admin | список объектов (+ lines) |
| POST | `/api/sites` | admin | создать объект `{ code, name }` |
| PATCH | `/api/sites/:id` | admin | обновить объект `{ code?, name? }` |
| POST | `/api/sites/:siteId/lines` | admin | создать линию `{ code, name }` |
| PATCH | `/api/lines/:id` | admin | обновить линию `{ code?, name? }` |
| GET | `/api/sites/:siteId/overview` | operator, admin | агрегаты + latest по датчикам (Tarantool + cache) |
| GET | `/api/sensors` | operator, admin | фильтры: `siteId`, `lineId`, `metric` |
| GET | `/api/sensors/:id` | operator, admin | карточка датчика + threshold |
| GET | `/api/sensors/:id/history` | operator, admin | query: `from`, `to`, `limit` (max 5000), опционально `interval` (`auto`/`raw`/`1m`/`5m`/`15m`/`1h`) → Mongo. Без `interval` шаг выбирается по `(to-from)`: ≤2ч raw, 2–12ч 1 мин, 12–48ч 5 мин. `value` бакета = avg. Отдельная «суточная» БД не нужна. |

Пример `overview`:

```json
{
  "siteId": "…",
  "sensors": [
    {
      "id": "…",
      "code": "T-101",
      "metric": "temperature",
      "unit": "°C",
      "value": 72.4,
      "ts": "2026-08-21T10:00:00.000Z",
      "status": "ok"
    }
  ],
  "openAlerts": 2
}
```

## Admin CRUD

| Method | Path | Роли | Описание |
|--------|------|------|----------|
| POST | `/api/sites` | admin | создать объект |
| PATCH | `/api/sites/:id` | admin | обновить объект |
| POST | `/api/sites/:siteId/lines` | admin | создать линию |
| PATCH | `/api/lines/:id` | admin | обновить линию |
| POST | `/api/sensors` | admin | создать датчик |
| PATCH | `/api/sensors/:id` | admin | обновить |
| PUT | `/api/sensors/:id/thresholds` | admin | задать min/max + severity |
| GET | `/api/users` | admin | список пользователей |
| POST | `/api/users` | admin | optional в MVP |

Уникальности: `Site.code`; `Line(siteId, code)`. Конфликт → `409`. Пустые code/name → `400`. DELETE site/line — вне MVP.


## Alerts

| Method | Path | Роли | Описание |
|--------|------|------|----------|
| GET | `/api/alerts` | operator, admin | query: `status`, `siteId`, `sensorId`, `severity`, `from`/`to` (`openedAt`), `limit` (default 100, max 500), `offset`. Сортировка `openedAt desc` |
| PATCH | `/api/alerts/:id/ack` | operator, admin | подтвердить |

## WebSocket

URL: `WS /ws` (после auth через cookie `it_session`).

Клиент может отправить subscribe:

```json
{ "type": "subscribe", "siteId": "…" }
```

Сервер пушит:

```json
{
  "type": "telemetry",
  "payload": {
    "sensorId": "…",
    "value": 72.4,
    "unit": "°C",
    "metric": "temperature",
    "ts": "…"
  }
}
```

```json
{
  "type": "alert",
  "payload": {
    "id": "…",
    "sensorId": "…",
    "severity": "critical",
    "status": "open",
    "message": "T-101 above max",
    "value": 95.1,
    "openedAt": "…"
  }
}
```

Источник fan-out: Redis pub/sub → BFF → WS clients.

## Ошибки (договорённость)

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin role required"
  }
}
```

HTTP: `400` валидация, `401` нет auth, `403` роль, `404` не найдено, `409` конфликт unique (code), `500` внутренняя.

## Не публикуем наружу

Прямой доступ браузера к Kafka, Redis, Tarantool, Mongo, Postgres — запрещён. Только BFF/API внутри Docker-сети.
