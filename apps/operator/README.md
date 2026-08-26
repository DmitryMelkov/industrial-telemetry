# apps/operator

Angular SPA для realtime-мониторинга промышленной телеметрии оператором.

Часть монорепы `industrial-telemetry`. Корневой README: [../../README.md](../../README.md).

## Роль MVP

- Login через BFF и httpOnly cookie
- Site picker в shell (объект для overview / charts / alerts / WS)
- Overview: KPI и текущие значения датчиков
- Живой график для 1–N датчиков
- Лента алертов с подтверждением (`ack`)

Frontend обращается только к BFF из `apps/backend`. Прямого доступа к Kafka, базам данных и Core API
из браузера нет.

## Стек

- Angular 22, standalone components
- Angular Router и functional guards
- HttpClient с cookie auth (`withCredentials`)
- RxJS для server state и realtime-потоков
- Angular Signals для локального UI state
- WebSocket через `/ws`

NgRx, SSR и Module Federation в MVP не используются. Angular Material — да (shell site picker, alerts, charts controls).

## Статус

Angular-проект создан. Следующие этапы: dev proxy, auth/login, shell layout,
overview, WebSocket telemetry, live chart и alerts.

## Локальный запуск

Backend в отдельном терминале:

```bash
cd ../backend
npm run infra:up
npm run start:core-api:dev
npm run start:bff:dev
npm run start:generator:dev
npm run start:telemetry-consumer:dev
npm run start:alert-consumer:dev
```

Или одной командой: `npm run dev` в `apps/backend` (или `npm run dev:backend` из корня монорепы).

Frontend:

```bash
npm start
```

После запуска приложение будет доступно по адресу
`http://localhost:4200/`. Demo login:
`operator@telemetry.local` / `password123`.

## Проверка

```bash
npm run build
npm test
```

## Документация

- [AGENTS.md](./AGENTS.md) — правила и архитектура frontend
- [Backend API sketch](../backend/docs/api-sketch.md) — REST и WebSocket контракт
- [Backend MVP](../backend/docs/mvp.md) — scope backend
