# Промпт для агента: apps/operator (Angular MVP)

Скопируй всё содержимое ниже (от «## Задача») и отдай другому агенту.

---

## Задача

Создай с нуля Angular-приложение **Operator dashboard** в репозитории:

`apps/operator`

Репозиторий сейчас **пустой** (только README.md и AGENTS.md). Backend **уже готов** в `apps/backend`.

**Scope MVP Operator:**
1. Login
2. Overview — KPI + текущие значения датчиков (live через WebSocket)
3. Живой график 1–N датчиков
4. Лента алертов + ack

**Не делать:** Admin CRUD, NgRx, Material UI (можно простой CSS), e2e-тесты, Module Federation.

---

## Контекст системы

Система промышленного мониторинга (демо-стенд):

```
Generator → Kafka → Consumers → Postgres/Mongo/Tarantool/Redis → BFF → Angular Operator
```

Фронт ходит **только в BFF** (`http://localhost:3000`). Cookie-auth, не JWT в localStorage.

---

## Backend API (уже работает)

BFF prefix: **`/api`**. WebSocket: **`/ws`** (без `/api`).

### Auth (httpOnly cookie `it_session`)

| Method | Path | Body / Response |
|--------|------|-----------------|
| POST | `/api/auth/login` | `{ email, password }` → `{ user: { id, email, role } }` + Set-Cookie |
| POST | `/api/auth/logout` | 204 |
| GET | `/api/auth/me` | `{ id, email, role }` |

### Monitoring (нужен auth cookie)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/sites` | список объектов с lines |
| GET | `/api/sites/:siteId/overview` | `{ siteId, sensors: [{ id, code, metric, unit, value, ts, status }], openAlerts }` |
| GET | `/api/sensors/:id/history?limit=100&from=&to=` | `{ sensor, points: [{ sensorId, value, unit, metric, ts, ... }] }` |
| GET | `/api/alerts?siteId=&status=open` | массив алертов с nested sensor |
| PATCH | `/api/alerts/:id/ack` | подтвердить алерт |

### WebSocket

- URL: `ws://localhost:3000/ws` (через proxy в dev: `ws://localhost:4200/ws`)
- Auth: cookie `it_session` автоматически (same-origin через proxy)
- Flow:
  1. Connect → получить `{ "type": "connected" }`
  2. Send `{ "type": "subscribe", "siteId": "<uuid>" }`
  3. Receive `{ "type": "subscribed", "siteId": "..." }`
  4. Receive `{ "type": "telemetry", "payload": { sensorId, value, unit, metric, ts, siteId, lineId } }`
  5. Receive `{ "type": "alert", "payload": { id, sensorId, severity, status, message, value, openedAt } }`

**Важно:** subscribe отправлять **после** `connected`, не сразу на open.

### Demo seed data

| | |
|--|--|
| Site ID | `11111111-1111-1111-1111-111111111111` (PLANT-1) |
| Line A | `22222222-2222-2222-2222-222222222201` |
| Line B | `22222222-2222-2222-2222-222222222202` |
| Sensor T-101 | `33333333-3333-3333-3333-333333333101` |
| Sensor P-201 | `33333333-3333-3333-3333-333333333201` |
| Login operator | `operator@telemetry.local` / `password123` |
| Login admin | `admin@telemetry.local` / `password123` |

---

## Технический стек (обязательно)

- **Angular 19+** (или latest stable), **standalone components**, **без NgModules**
- **Angular Router** + **functional guards** (`CanActivateFn`)
- **HttpClient** — все запросы с `{ withCredentials: true }`
- **RxJS** — BehaviorSubject/Observable в services
- **Angular Signals** — локальный UI state (`signal`, `computed`)
- **Control flow** — `@if`, `@for`, `@switch` (не `*ngIf`/`*ngFor`)
- **Графики** — `chart.js` + `ng2-charts` ИЛИ простой canvas/SVG; выбери один, без тяжёлых зависимостей

**Запрещено на MVP:** NgRx, axios, fetch в компонентах, прямой доступ к core-api :3001, localStorage для auth token.

---

## Структура проекта (создать)

```
apps/operator/
  AGENTS.md                    # уже есть — прочитай и следуй
  README.md                    # обнови после scaffold
  proxy.conf.json
  angular.json                 # добавить proxyConfig
  src/
    app/
      app.component.ts
      app.config.ts            # provideRouter, provideHttpClient(withInterceptors)
      app.routes.ts
      core/
        config/
          environment.ts         # apiUrl: '' (relative через proxy)
        auth/
          auth.service.ts
          auth.guard.ts          # redirect /login если нет user
          guest.guard.ts         # redirect /overview если уже logged in
          auth.interceptor.ts    # withCredentials, 401 → /login
        api/
          monitoring-api.service.ts
        realtime/
          realtime.service.ts
      features/
        auth/
          login/
            login.component.ts
        shell/
          shell.component.ts     # header: user email, logout, nav
        overview/
          overview.component.ts
        charts/
          live-chart.component.ts
        alerts/
          alerts-panel.component.ts
      shared/
        types/
          api.types.ts           # User, Site, Overview, Alert, TelemetryPoint, WsMessage
        ui/
          loading.component.ts
          error-message.component.ts
    styles.scss
```

---

## Пошаговый план реализации

### Шаг 1 — Scaffold

```bash
cd apps/operator
ng new . --directory=. --routing --style=scss --standalone --ssr=false --skip-git
```

Если `ng new .` не работает — создай в temp и перенеси файлы.

### Шаг 2 — Dev proxy

`proxy.conf.json`:

```json
{
  "/api": { "target": "http://localhost:3000", "secure": false, "changeOrigin": true },
  "/ws": { "target": "ws://localhost:3000", "secure": false, "ws": true, "changeOrigin": true }
}
```

В `angular.json` → serve → `"proxyConfig": "proxy.conf.json"`.

### Шаг 3 — Core: types + auth

**`shared/types/api.types.ts`** — TypeScript interfaces под контракт BFF (camelCase).

**`AuthService`:**
- `currentUser$: BehaviorSubject<User | null>`
- `login(email, password): Observable<User>`
- `logout(): Observable<void>`
- `loadMe(): Observable<User | null>` — GET `/api/auth/me`, при 401 → null
- `isAuthenticated(): boolean`

**`authInterceptor`:** `withCredentials: true` на все запросы; при 401 (кроме login) → `router.navigate(['/login'])`.

**Guards:**
- `authGuard` — нет user → `/login`
- `guestGuard` — есть user → `/overview`

### Шаг 4 — Login page

- Route: `/login` (guestGuard)
- Form: email + password (Reactive Forms или template-driven — на выбор)
- Submit → `AuthService.login()` → redirect `/overview`
- Показать ошибку при неверных credentials (401/400)
- Loading state на кнопке

### Шаг 5 — Shell layout

- Route parent: `''` с `authGuard`, component `ShellComponent`
- Header: app title, email user, кнопка Logout
- `<router-outlet>` для child routes
- Logout: POST `/api/auth/logout` + disconnect WS + redirect `/login`

### Шаг 6 — Overview page

- Route: `/overview` (default redirect с `/`)
- On init:
  - GET `/api/sites` — если один site, выбрать автоматически (demo: PLANT-1)
  - GET `/api/sites/:siteId/overview`
  - Subscribe RealtimeService на siteId
- UI:
  - KPI: `openAlerts`, count sensors
  - Таблица/карточки: code, metric, value, unit, ts, status
  - При WS telemetry — обновлять value/ts соответствующего sensorId **без full page reload**
- States: loading skeleton, error banner, empty если нет sensors

### Шаг 7 — RealtimeService

```typescript
// Псевдокод контракта
connect(): void
disconnect(): void
subscribeSite(siteId: string): void
telemetry$: Observable<TelemetryPayload>
alerts$: Observable<AlertPayload>
```

- Reconnect logic (простой): on close → retry через 3s если user authenticated
- Parse JSON messages, filter by type
- **После** `{ type: 'connected' }` отправлять subscribe

### Шаг 8 — Live chart

- Компонент на overview или отдельная секция
- Multi-select датчиков (checkbox, max 3–4)
- Initial data: GET `/api/sensors/:id/history?limit=60` для каждого выбранного
- Append точек из `telemetry$` в chart dataset
- Ось X — time, Y — value (разные unit — разные оси или normalize с подписью unit)
- Loading / «выберите датчик» empty state

### Шаг 9 — Alerts panel

- GET `/api/alerts?siteId=...&status=open` on init
- WS `alert` events → prepend/update в список
- Кнопка Ack → PATCH `/api/alerts/:id/ack` → обновить status в UI
- Показать severity (warning/critical), message, sensor code, value, openedAt
- Loading / empty «нет алертов»

### Шаг 10 — Polish

- `npm run build` — должно проходить без ошибок
- Обновить README.md (как запустить)
- Минимальные responsive styles (readable на desktop, не ломается на mobile)
- Не коммитить без явной просьбы пользователя

---

## Routes (итог)

```typescript
export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: OverviewComponent },
    ],
  },
  { path: '**', redirectTo: 'overview' },
];
```

---

## Code style (обязательно)

- Standalone components, **named exports** (не default)
- Стрелочные функции для methods
- Фигурные скобки для `if/else/for/while/switch/try`
- API-вызовы **только** в `core/api` и `core/auth` services
- Компоненты — orchestration; бизнес-логика в services
- `@if` / `@for` в шаблонах
- Без `console.log` в prod code (можно Logger pattern или убрать перед finish)

---

## Критерии приёмки (Definition of Done)

1. `npm run build` — success
2. `ng serve` на :4200 + backend BFF на :3000 + generator/consumers running
3. Login `operator@telemetry.local` / `password123` → попадаю на overview
4. Overview показывает 4 датчика с value/ts
5. Без refresh значения обновляются каждую ~1 сек (WebSocket)
6. График показывает историю + новые точки
7. Алерты видны; ack меняет status
8. Logout возвращает на login; protected routes недоступны без auth
9. Нет запросов на `:3001` (только через proxy `/api`)

---

## Как проверить локально (для агента)

Backend (отдельные терминалы):

```bash
cd apps/backend
npm run infra:up
npm run start:core-api:dev
npm run start:bff:dev
npm run start:generator:dev
npm run start:telemetry-consumer:dev
npm run start:alert-consumer:dev
```

Frontend:

```bash
cd apps/operator
npm start
# http://localhost:4200/login
```

---

## Что прочитать перед стартом

- `apps/operator/AGENTS.md`
- `apps/backend/docs/api-sketch.md`

---

## Явные anti-patterns (не делать)

- ❌ NgRx / Akita / NGXS
- ❌ JWT в localStorage
- ❌ Запросы к `http://localhost:3001`
- ❌ `*ngIf` / `*ngFor` в новых шаблонах
- ❌ Default exports
- ❌ Один giant component на 500+ строк
- ❌ WebSocket subscribe до получения `connected`
- ❌ Admin endpoints (POST/PATCH sensors) в Operator app

---

## Опционально (если успеваешь)

- Remember selected siteId в sessionStorage
- Auto-reconnect WebSocket
- Цвет status sensor (ok/warning) по threshold — если backend отдаёт status !== 'ok'

---

Когда закончишь — сообщи список созданных файлов и результат `npm run build`.
